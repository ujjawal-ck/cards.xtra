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
import { ApiError } from './client';
import { CK } from '../config/env';

export type PaymentTypeKey = 'cashback' | 'rewards' | 'cashback_and_rewards';
export type PaymentMethodKey = 'amazon' | 'flipkart' | 'upi' | 'bank';

// Fallbacks if the API response doesn't expose ids (matches the reference).
const DEFAULT_PAYMENT_METHOD_IDS: Record<PaymentMethodKey, number> = {
  amazon: 12,
  flipkart: 13,
  upi: 20,
  bank: 18,
};

export interface PaymentData {
  mobile: string;
  totalEarnings: number;
  cashbackEarnings: number;
  rewardsEarnings: number;
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
export async function fetchPaymentInfo(token: string): Promise<any> {
  return ck('/payment/payment', {
    auth: { userToken: token },
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
    totalEarnings: parseFloat(a.total_earnings) || 0,
    cashbackEarnings: parseFloat(a.cashback_earnings) || 0,
    rewardsEarnings: parseFloat(a.rewards_earnings) || 0,
    currencyCode: a.currency_code || 'INR',
    paymentThreshold: parseFloat(a.payment_threshold) || 250,
    // A successful response means NO payout is pending. The in-process state is
    // never a field here — it surfaces only as the 5002 error (see
    // paymentInProcessAmountFromError + usePaymentInfo).
    paymentInProcess: false,
    paymentInProcessAmount: 0,
  };
}

/** Pull payment_method ids out of the (loosely-shaped) response. */
export function extractPaymentMethodIds(
  info: any
): Record<PaymentMethodKey, number> {
  const ids: Record<PaymentMethodKey, number> = { ...DEFAULT_PAYMENT_METHOD_IDS };

  const candidates: any[] =
    info?.data?.relationships?.payment_methods?.data ||
    info?.data?.relationships?.payment_methods ||
    info?.relationships?.payment_methods?.data ||
    info?.relationships?.payment_methods ||
    info?.data?.attributes?.payment_methods ||
    info?.data?.payment_methods ||
    (Array.isArray(info?.included)
      ? info.included.filter((i: any) => i?.type === 'payment_method')
      : []) ||
    [];

  if (!Array.isArray(candidates) || candidates.length === 0) return ids;

  for (const m of candidates) {
    const attrs = m?.attributes ?? m;
    const rawId = m?.id ?? attrs?.id;
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
  return ids;
}

export interface SendOtpResult {
  otpGuid: string;
  /** Masked mobile the OTP was sent to, e.g. "967XXXX551". */
  sentToMobile: string;
}

/** POST /users/sendotp — PAYMENT_REQUEST_OTP. Returns otp_guid + masked no. */
export async function sendPaymentRequestOTP(token: string): Promise<SendOtpResult> {
  const res: any = await ck('/users/sendotp', {
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
        attributes: { otp_guid: otpGuid, otp: parseInt(otp.trim(), 10) },
      },
    },
  });
}

/** True when a /users/verify response carries an error (200-with-errors). */
export function verifyHasError(res: any): boolean {
  return !!(res?.error || (res?.data?.errors && res.data.errors.length > 0));
}

export async function submitUPIPayment(
  token: string,
  paymentType: PaymentTypeKey,
  upiId: string,
  otpGuid: string,
  paymentMethodId: number
): Promise<any> {
  return ck('/payment/paymentV1', {
    method: 'POST',
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
  return ck('/payment/paymentV1', {
    method: 'POST',
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
  return ck('/payment/paymentV1', {
    method: 'POST',
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

export async function submitBankPayment(
  token: string,
  paymentType: PaymentTypeKey,
  ifscCode: string,
  accountHolderName: string,
  accountNumber: string,
  otpGuid: string,
  paymentMethodId: number
): Promise<any> {
  return ck('/payment/paymentV1', {
    method: 'POST',
    auth: { userToken: token },
    query: { device: CK.device },
    body: {
      data: {
        type: 'imps',
        attributes: {
          otp_guid: otpGuid,
          payment_type: paymentType,
          payment_method_id: String(paymentMethodId),
          ifsc_code: ifscCode,
          account_holder_name: accountHolderName,
          account_number: accountNumber,
        },
      },
    },
  });
}
