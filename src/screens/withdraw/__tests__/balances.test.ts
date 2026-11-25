/**
 * Withdraw stack amounts come from /payment/payment (audit DATA-08), and an
 * unknown amount is a visible state, never ₹0 (audit CODE-02, DATA-04).
 */
jest.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
jest.mock('../../../query/useRefetchOnFocus', () => ({ useRefetchOnFocus: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn(() => () => undefined) } }));

import { ApiError } from '../../../api/http/errors';
import { paymentInfoFromError, paymentInfoFromResponse, type PaymentInfo } from '../../../query/usePaymentInfo';
import {
  bucketAmount,
  payoutBlockedText,
  resolveWithdrawView,
  PAYMENTS_DISABLED_FALLBACK,
  RATE_LIMITED_FALLBACK,
} from '../balances';

const fx = (name: string) => JSON.parse(JSON.stringify(require(`../../../api/__fixtures__/${name}.json`)));
const q = (data: PaymentInfo | undefined, over: Partial<{ isLoading: boolean; isError: boolean; fetchStatus: 'idle' | 'fetching' | 'paused' }> = {}) => ({
  data,
  isLoading: false,
  isError: false,
  fetchStatus: 'idle' as const,
  ...over,
});

describe('payment info mapping (fixtures)', () => {
  it('doc 200: amounts per bucket and method ids', () => {
    const info = paymentInfoFromResponse(fx('doc.payment_info'));
    expect(bucketAmount(info, 'cashback')).toBe(739);
    expect(bucketAmount(info, 'rewards')).toBe(1089);
    expect(bucketAmount(info, 'combined')).toBe(1828);
    expect(info.methodIds).toEqual({ amazon: 12, flipkart: 13, upi: 20, bank: 18 });
    expect(resolveWithdrawView(q(info))).toBe('ready');
  });

  it('5002 (doc.payment_info_2): processing, amounts unknown, no method ids', () => {
    const info = paymentInfoFromError(new ApiError('pending', 400, fx('doc.payment_info_2')))!;
    expect(info.paymentInProcess).toBe(true);
    expect(info.paymentInProcessAmount).toBe(20);
    expect(info.totalEarnings).toBeNull();
    expect(info.cashbackEarnings).toBeNull();
    expect(info.methodIds).toEqual({});
    expect(bucketAmount(info, 'cashback')).toBeNull();
    expect(resolveWithdrawView(q(info))).toBe('processing');
  });

  it('5003 (doc.payment_info_1, staging.payment_info): below minimum, amounts unknown', () => {
    const doc = paymentInfoFromError(new ApiError('min', 400, fx('doc.payment_info_1')))!;
    expect(doc.belowThreshold).toBe(true);
    expect(doc.paymentThreshold).toBe(100);
    expect(doc.totalEarnings).toBeNull();
    expect(resolveWithdrawView(q(doc))).toBe('below_minimum');
    const staging = paymentInfoFromError(new ApiError('min', 400, fx('staging.payment_info')))!;
    expect(staging.paymentThreshold).toBe(250);
    expect(bucketAmount(staging, 'rewards')).toBeNull();
  });

  it('any other error is not a state', () => {
    expect(paymentInfoFromError(new ApiError('down', 502))).toBeNull();
    expect(paymentInfoFromError(new Error('x'))).toBeNull();
  });
});

describe('withdraw screen view', () => {
  it('first load: loading, offline (paused), error', () => {
    expect(resolveWithdrawView(q(undefined, { isLoading: true, fetchStatus: 'fetching' }))).toBe('loading');
    expect(resolveWithdrawView(q(undefined, { fetchStatus: 'paused' }))).toBe('offline');
    expect(resolveWithdrawView(q(undefined, { isError: true }))).toBe('error');
  });

  it('a missing amount shows "balance unavailable", never ₹0', () => {
    const body = fx('doc.payment_info');
    delete body.data.attributes.rewards_earnings;
    const info = paymentInfoFromResponse(body);
    expect(bucketAmount(info, 'rewards')).toBeNull();
    expect(resolveWithdrawView(q(info))).toBe('unavailable');
    // From Earnings with the cashback bucket, only the cashback amount is needed.
    expect(resolveWithdrawView(q(info), 'cashback')).toBe('ready');
    expect(resolveWithdrawView(q(info), 'rewards')).toBe('unavailable');
  });

  it('keeps cached amounts on screen while a refetch is paused offline', () => {
    const info = paymentInfoFromResponse(fx('doc.payment_info'));
    expect(resolveWithdrawView(q(info, { fetchStatus: 'paused' }))).toBe('ready');
  });
});

// The 5002 examples of GET /payment/payment (openapi-mini.json 400-13,
// examples 2, 5 and 6), and the paymentV1 one (400-16, no meta).
const RATE_TEXT =
  'As a security measure, only one payment request is allowed within 30 minutes. Please request for another payment after 30 minutes.';
const contactText = (when: string) =>
  `For security, payments are temporarily disabled because you recently updated your registered email ID or mobile number. Request a payment after ${when} please.`;
const from5002 = (e: Record<string, unknown>) =>
  paymentInfoFromError(new ApiError('refused', 400, { errors: [{ code: '5002', ...e }] }));

describe('code 5002 screen states (audit D2)', () => {
  it('pending with an amount: "Payment Is Processing" with that amount', () => {
    const info = paymentInfoFromError(new ApiError('pending', 400, fx('doc.payment_info_2')))!;
    expect(resolveWithdrawView(q(info))).toBe('processing');
    expect(payoutBlockedText(info)).toEqual({
      title: 'Payment Is Processing',
      body: 'We’ve already got your payment request of ₹20. You can request another payment after this is completed :)',
    });
  });

  it.each([
    ['no meta (paymentV1 shape)', { title: 'A payment request from you is already Pending. This will be processed shortly.' }],
    ['a zero amount', { detail: 'A payment request from you is already pending.', meta: { requested_earnings: '0.00' } }],
  ])('pending with %s: "A withdrawal is already in process", never ₹0', (_label, e) => {
    const info = from5002(e)!;
    expect(info.paymentInProcess).toBe(true);
    expect(resolveWithdrawView(q(info))).toBe('processing');
    const text = payoutBlockedText(info)!;
    expect(text.title).toBe('Payment Is Processing');
    expect(text.body).toBe('A withdrawal is already in process. You can request another payment after this is completed :)');
    expect(text.body).not.toContain('₹');
  });

  it('rate_limited: its own state with the doc 30-minute message, not "processing"', () => {
    const info = from5002({ title: RATE_TEXT, detail: RATE_TEXT, meta: { type: 'security' } })!;
    expect(info.paymentInProcess).toBe(false);
    expect(info.methodIds).toEqual({});
    expect(bucketAmount(info, 'combined')).toBeNull();
    expect(resolveWithdrawView(q(info))).toBe('rate_limited');
    // Also from Earnings (one bucket): not "balance unavailable".
    expect(resolveWithdrawView(q(info), 'cashback')).toBe('rate_limited');
    expect(payoutBlockedText(info)).toEqual({ title: 'Try Again in 30 Minutes', body: RATE_TEXT });
  });

  it('disabled_after_contact_change: its own state with the server text and date', () => {
    const info = from5002({ detail: contactText('01-12-2026 10:15:00 AM'), meta: { type: 'security' } })!;
    expect(info.paymentInProcess).toBe(false);
    expect(bucketAmount(info, 'rewards')).toBeNull();
    expect(resolveWithdrawView(q(info))).toBe('payments_disabled');
    expect(resolveWithdrawView(q(info), 'rewards')).toBe('payments_disabled');
    expect(payoutBlockedText(info)).toEqual({
      title: 'Payments Temporarily Disabled',
      body: contactText('01-12-2026 10:15:00 AM'),
    });
  });

  it('the security states fall back to the doc wording when the server sends no text', () => {
    const rate = paymentInfoFromResponse(fx('doc.payment_info'));
    expect(payoutBlockedText({ ...rate, payoutBlock: { kind: 'rate_limited', detail: null } })!.body).toBe(RATE_LIMITED_FALLBACK);
    expect(payoutBlockedText({ ...rate, payoutBlock: { kind: 'disabled_after_contact_change', detail: null } })!.body).toBe(
      PAYMENTS_DISABLED_FALLBACK,
    );
  });

  it('no block: no text; an unknown 5002 is not a state (the error view shows)', () => {
    expect(payoutBlockedText(undefined)).toBeNull();
    expect(payoutBlockedText(paymentInfoFromResponse(fx('doc.payment_info')))).toBeNull();
    expect(from5002({ detail: 'Payments are paused.', meta: { type: 'security' } })).toBeNull();
  });
});
