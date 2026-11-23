/**
 * Withdraw stack amounts come from /payment/payment (audit DATA-08), and an
 * unknown amount is a visible state, never ₹0 (audit CODE-02, DATA-04).
 */
jest.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ accessToken: null }) }));
jest.mock('../../../query/useRefetchOnFocus', () => ({ useRefetchOnFocus: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn(() => () => undefined) } }));

import { ApiError } from '../../../api/http/errors';
import { paymentInfoFromError, paymentInfoFromResponse, type PaymentInfo } from '../../../query/usePaymentInfo';
import { bucketAmount, resolveWithdrawView } from '../balances';

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
