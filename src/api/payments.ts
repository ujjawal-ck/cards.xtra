/**
 * payments.ts — CashKaro payment/withdrawal API (the "Request Payment" flow).
 *
 * Ported from the reference web app (src/lib/api.ts payment fns) onto this
 * app's `ck()` client. Flow:
 *   1. fetchPaymentInfo            → withdrawable amounts + payment_method ids
 *   2. sendPaymentRequestOTP       → otp_guid + sent_to_mobile (6-digit OTP)
 *   3. verifyPaymentRequestOTP     → validates the OTP
 *   4. submit{UPI|Amazon|Flipkart|Bank}Payment → /payment/paymentV1
 *
 * UPI / email / mobile are validated SERVER-SIDE at submit — there is no
 * client-side format gate (an invalid value surfaces as a submit error).
 */
import { ck } from './cashkaro';
import { reportHandled } from './http/report';
import * as Schemas from './schemas';
import { ApiError, otpValue } from './client';
import { CK } from '../config/env';

export type PaymentTypeKey = 'cashback' | 'rewards' | 'cashback_and_rewards';
export type PaymentMethodKey = 'amazon' | 'flipkart' | 'upi' | 'bank';

/** Payment method ids read from /payment/payment. A method the response did
 *  not list is absent: there is no built-in fallback id. */
export type PaymentMethodIds = Partial<Record<PaymentMethodKey, number>>;

/** Thrown when the payout method id was not read from the API. Sending a
 *  built-in id could pay out through the wrong method, so the flow stops. */
export class PaymentMethodUnavailableError extends Error {
  constructor() {
    super('This payment method is not available right now. Please try again later.');
    this.name = 'PaymentMethodUnavailableError';
  }
}

/** The id to send with the payout POST. Throws when the API did not give one. */
export function requirePaymentMethodId(
  ids: PaymentMethodIds | undefined,
  method: PaymentMethodKey
): number {
  const id = ids?.[method];
  if (typeof id !== 'number' || !Number.isFinite(id)) throw new PaymentMethodUnavailableError();
  return id;
}

/** A money field: the number, or null when it is missing or not a number.
 *  Never 0 for an unknown amount. */
function moneyOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export interface PaymentData {
  mobile: string;
  /** null when the field is missing or not a number ("balance unavailable"). */
  totalEarnings: number | null;
  cashbackEarnings: number | null;
  rewardsEarnings: number | null;
  currencyCode: string;
  paymentThreshold: number;
  /** True when a previous payout is still settling — the user can't request
   *  another until it completes (drives PaymentProcessingSheet). */
  paymentInProcess: boolean;
  /** Amount (₹, numeric) of the in-process request, 0 when none. */
  paymentInProcessAmount: number;
}

/** GET /payment/payment — withdrawable amounts + available methods.
 *
 *  NOTE: when the user already has a payout in flight, this endpoint does NOT
 *  return data — it fails with HTTP 400 / error code 5002 ("a payment request
 *  from you is already pending"). Callers detect that via
 *  paymentInProcessAmountFromError() rather than a field on the success body. */
export async function fetchPaymentInfo(
  token: string,
  signal?: AbortSignal,
  opts?: { timeoutMs?: number; retries?: number },
): Promise<any> {
  return ck('/payment/payment', { contract: ['payment/payment', Schemas.PaymentInfoResponse],
    auth: { userToken: token },
    signal,
    ...(opts?.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts?.retries !== undefined ? { retries: opts.retries } : {}),
    query: { device: CK.device, paymentautomation: 'true', include: 'charities' },
  });
}

// Error code returned by /payment/payment when a payout is already pending.
const PAYMENT_IN_PROCESS_CODE = '5002';

/**
 * When /payment/payment fails because a payout is already pending (HTTP 400,
 * error code 5002), returns the amount (₹, numeric) of that pending request —
 * read from `errors[0].meta.requested_earnings`. Returns null for any other
 * error, so callers can re-throw / handle normally.
 */
export function paymentInProcessAmountFromError(e: unknown): number | null {
  if (!(e instanceof ApiError) || e.status !== 400) return null;
  const errors = (e.payload as any)?.errors;
  if (!Array.isArray(errors)) return null;
  const err = errors.find((x: any) => String(x?.code) === PAYMENT_IN_PROCESS_CODE);
  if (!err) return null;
  return parseFloat(err?.meta?.requested_earnings) || 0;
}

// Error code returned by /payment/payment when the user's confirmed balance is
// below the cash-out minimum (verified on staging 2026-11-03:
// {"code":"5003","title":"Payment threshold not reached.",
//  "meta":{"cashout_limit":250,"pending_earnings":"0.00",...}}).
const PAYMENT_BELOW_THRESHOLD_CODE = '5003';

/**
 * When /payment/payment fails because the balance is below the cash-out
 * minimum (HTTP 400, code 5003), returns that minimum (₹). Returns null for
 * any other error.
 */
export function paymentThresholdFromError(e: unknown): number | null {
  if (!(e instanceof ApiError) || e.status !== 400) return null;
  const errors = (e.payload as any)?.errors;
  if (!Array.isArray(errors)) return null;
  const err = errors.find((x: any) => String(x?.code) === PAYMENT_BELOW_THRESHOLD_CODE);
  if (!err) return null;
  return parseFloat(err?.meta?.cashout_limit) || 250;
}

export function extractPaymentData(info: any): PaymentData {
  const a = info?.data?.attributes ?? {};
  return {
    mobile: a.mobile || '',
    totalEarnings: moneyOrNull(a.total_earnings),
    cashbackEarnings: moneyOrNull(a.cashback_earnings),
    rewardsEarnings: moneyOrNull(a.rewards_earnings),
    currencyCode: a.currency_code || 'INR',
    paymentThreshold: parseFloat(a.payment_threshold) || 250,
    // A successful response means NO payout is pending. The in-process state is
    // never a field here — it surfaces only as the 5002 error (see
    // paymentInProcessAmountFromError + usePaymentInfo).
    paymentInProcess: false,
    paymentInProcessAmount: 0,
  };
}

/** Pull payment_method ids out of the (loosely-shaped) response. Only ids the
 *  response lists are returned; use requirePaymentMethodId() at submit. */
export function extractPaymentMethodIds(info: any): PaymentMethodIds {
  const ids: PaymentMethodIds = {};
  const included: any[] = Array.isArray(info?.included) ? info.included : [];

  // Documented shape (CK doc, GET /payment/payment): top-level
  // relationships.payment_methods.data[] with { id, attributes.payment_name }.
  // JSON:API standard shape (review R-03): the same list under
  // data.relationships (data is one row, or a list of rows). `included` is
  // kept as the last source in case CK moves it there.
  const rows: any[] = Array.isArray(info?.data) ? info.data : [info?.data];
  const listed = [info?.relationships, ...rows.map((r) => r?.relationships)]
    .map((rel) => rel?.payment_methods?.data)
    .find(Array.isArray);
  const candidates: any[] = Array.isArray(listed)
    ? listed
    : included.filter((i: any) => i?.type === 'payment_method');
  for (const m of candidates) {
    const rawId = m?.id ?? m?.attributes?.id;
    // A JSON:API relationship row can be a bare { type, id }: its name is then
    // on the `included` row with the same id. A row with no name maps to
    // nothing (never by id).
    const linked = m?.attributes
      ? undefined
      : included.find(
          (i: any) => i?.attributes && String(i?.id) === String(rawId) && (!m?.type || i?.type === m.type)
        );
    const attrs = m?.attributes ?? linked?.attributes ?? m;
    const id = typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId), 10);
    if (!Number.isFinite(id)) continue;
    const label = String(
      attrs?.payment_name ?? attrs?.name ?? attrs?.payment_method_name ?? ''
    ).toLowerCase();
    if (label.includes('amazon')) ids.amazon = id;
    else if (label.includes('flipkart')) ids.flipkart = id;
    else if (label.includes('upi')) ids.upi = id;
    else if (
      label.includes('bank') ||
      label.includes('neft') ||
      label.includes('imps') ||
      label.includes('rtgs')
    )
      ids.bank = id;
  }
  if (Object.keys(ids).length === 0 && info) {
    // No built-in ids any more: the withdraw form stops before the OTP
    // (requirePaymentMethodId). Make the gap visible, also for a list whose
    // rows carry no name. The report key is kept as-is because
    // src/api/__tests__/mappers.test.ts pins it.
    reportHandled(new Error('payment_methods missing in /payment/payment'), 'payment method ids: using defaults');
  }
  return ids;
}

export interface SendOtpResult {
  otpGuid: string;
  /** Masked mobile the OTP was sent to, e.g. "967XXXX551". */
  sentToMobile: string;
}

/** POST /users/sendotp — PAYMENT_REQUEST_OTP. Returns otp_guid + masked no. */
export async function sendPaymentRequestOTP(token: string): Promise<SendOtpResult> {
  const res: any = await ck('/users/sendotp', { contract: ['users/sendotp', Schemas.SendOtpResponse],
    method: 'POST',
    auth: { userToken: token },
    query: { device: CK.device },
    body: {
      data: {
        type: 'user_otp',
        attributes: { notification_name: 'PAYMENT_REQUEST_OTP' },
      },
    },
  });
  // Reference reads the singular `attribute` key.
  const attr = res?.data?.attribute ?? res?.data?.attributes ?? {};
  return {
    otpGuid: attr.otp_guid ?? res?.data?.id ?? '',
    sentToMobile: attr.sent_to_mobile ?? '',
  };
}

/** POST /users/verify — validate the OTP (API expects integer). */
export async function verifyPaymentRequestOTP(
  token: string,
  otpGuid: string,
  otp: string
): Promise<any> {
  return ck('/users/verify', {
    method: 'POST',
    auth: { userToken: token },
    body: {
      data: {
        type: 'user_otp',
        attributes: { otp_guid: otpGuid, otp: otpValue(otp) },
      },
    },
  });
}

/** True when a /users/verify response carries an error (200-with-errors). */
export function verifyHasError(res: any): boolean {
  return !!(res?.error || (res?.data?.errors && res.data.errors.length > 0));
}

/** Deadline for a payout request. It must be longer than the BFF's own wait
 *  for CashKaro (55 s, `USER_TIMEOUT_MS` in bff/src/proxy.js) and Vercel's
 *  `maxDuration` of 60 s. Then the BFF answers first (its 504 or 502 goes to
 *  the re-check path), and the app never gives up while the payout is still
 *  running upstream. */
export const PAYOUT_TIMEOUT_MS = 65_000;

export async function submitUPIPayment(
  token: string,
  paymentType: PaymentTypeKey,
  upiId: string,
  otpGuid: string,
  paymentMethodId: number
): Promise<any> {
  return ck('/payment/paymentV1', { contract: ['payment/paymentV1', Schemas.PaymentRequestResponse],
    method: 'POST',
    // Payouts get a longer deadline and are never retried (POST, not idempotent).
    timeoutMs: PAYOUT_TIMEOUT_MS,
    auth: { userToken: token },
    query: { device: CK.device },
    body: {
      data: {
        type: 'upi',
        attributes: {
          otp_guid: otpGuid,
          payment_type: paymentType,
          payment_method_id: String(paymentMethodId),
          upi_id: upiId,
        },
      },
    },
  });
}

export async function submitAmazonPayment(
  token: string,
  paymentType: PaymentTypeKey,
  mobile: string,
  otpGuid: string,
  paymentMethodId: number
): Promise<any> {
  return ck('/payment/paymentV1', { contract: ['payment/paymentV1', Schemas.PaymentRequestResponse],
    method: 'POST',
    // Payouts get a longer deadline and are never retried (POST, not idempotent).
    timeoutMs: PAYOUT_TIMEOUT_MS,
    auth: { userToken: token },
    query: { device: CK.device },
    body: {
      data: {
        type: 'amazongiftcard',
        attributes: {
          payment_type: paymentType,
          payment_method_id: String(paymentMethodId),
          mobile,
          otp_guid: otpGuid,
          amazon_payment_type: 'AmazonMobile',
        },
      },
    },
  });
}

export async function submitFlipkartPayment(
  token: string,
  paymentType: PaymentTypeKey,
  email: string,
  otpGuid: string,
  paymentMethodId: number
): Promise<any> {
  return ck('/payment/paymentV1', { contract: ['payment/paymentV1', Schemas.PaymentRequestResponse],
    method: 'POST',
    // Payouts get a longer deadline and are never retried (POST, not idempotent).
    timeoutMs: PAYOUT_TIMEOUT_MS,
    auth: { userToken: token },
    query: { device: CK.device },
    body: {
      data: {
        type: 'flipkartgiftcard',
        attributes: {
          otp_guid: otpGuid,
          payment_type: paymentType,
          payment_method_id: String(paymentMethodId),
          email,
        },
      },
    },
  });
}


