/**
 * Payout safety in payments.ts (audit CODE-02, DATA-05), pinned against the
 * CashKaro doc and staging fixtures.
 */
import {
  extractPaymentData,
  extractPaymentMethodIds,
  paymentInProcessAmountFromError,
  paymentThresholdFromError,
  requirePaymentMethodId,
  PaymentMethodUnavailableError,
  PAYOUT_TIMEOUT_MS,
} from '../payments';
import { ApiError } from '../http/errors';
import { setHandledErrorReporter } from '../http/report';

const fx = (name: string) => JSON.parse(JSON.stringify(require(`../__fixtures__/${name}.json`)));

describe('payment method ids (no built-in fallback)', () => {
  it('reads every id from the doc fixture', () => {
    const ids = extractPaymentMethodIds(fx('doc.payment_info'));
    expect(ids).toEqual({ amazon: 12, flipkart: 13, upi: 20, bank: 18 });
    expect(requirePaymentMethodId(ids, 'upi')).toBe(20);
    expect(requirePaymentMethodId(ids, 'amazon')).toBe(12);
    expect(requirePaymentMethodId(ids, 'flipkart')).toBe(13);
  });

  it('returns no ids when the response has no payment_methods, and still reports it', () => {
    const seen: string[] = [];
    setHandledErrorReporter((_e, ctx) => seen.push(ctx));
    expect(extractPaymentMethodIds({ data: { attributes: {} } })).toEqual({});
    expect(seen).toHaveLength(1);
  });

  it('throws instead of falling back to a hard-coded id', () => {
    const ids = extractPaymentMethodIds({ data: { attributes: {} } });
    expect(() => requirePaymentMethodId(ids, 'upi')).toThrow(PaymentMethodUnavailableError);
    expect(() => requirePaymentMethodId(undefined, 'amazon')).toThrow(PaymentMethodUnavailableError);
    // Only the listed method counts: UPI listed, Flipkart not.
    const onlyUpi = extractPaymentMethodIds({
      relationships: { payment_methods: { data: [{ id: 20, attributes: { payment_name: 'UPI' } }] } },
    });
    expect(requirePaymentMethodId(onlyUpi, 'upi')).toBe(20);
    expect(() => requirePaymentMethodId(onlyUpi, 'flipkart')).toThrow(PaymentMethodUnavailableError);
  });
});

describe('withdrawable amounts (null, never 0, when unknown)', () => {
  it('maps the doc fixture amounts exactly', () => {
    const d = extractPaymentData(fx('doc.payment_info'));
    expect(d.cashbackEarnings).toBe(739);
    expect(d.rewardsEarnings).toBe(1089);
    expect(d.totalEarnings).toBe(1828);
    expect(d.paymentThreshold).toBe(100);
  });

  it('keeps paise exact', () => {
    const d = extractPaymentData({ data: { attributes: { total_earnings: '99.60', cashback_earnings: '99.60', rewards_earnings: '0.00' } } });
    expect(d.cashbackEarnings).toBe(99.6);
    expect(d.rewardsEarnings).toBe(0); // a real "0.00" stays 0
  });

  it('turns a missing or non-numeric amount into null', () => {
    const d = extractPaymentData({ data: { attributes: { total_earnings: 'n/a', cashback_earnings: '' } } });
    expect(d.totalEarnings).toBeNull();
    expect(d.cashbackEarnings).toBeNull();
    expect(d.rewardsEarnings).toBeNull();
  });
});

describe('5002 / 5003 detection keeps its meaning', () => {
  it('5002 fixture: in-process amount; null means "not a 5002"', () => {
    expect(paymentInProcessAmountFromError(new ApiError('pending', 400, fx('doc.payment_info_2')))).toBe(20);
    expect(paymentInProcessAmountFromError(new ApiError('min', 400, fx('doc.payment_info_1')))).toBeNull();
    expect(paymentInProcessAmountFromError(new ApiError('down', 502))).toBeNull();
  });

  it('5003 fixtures: the cash-out minimum', () => {
    expect(paymentThresholdFromError(new ApiError('min', 400, fx('doc.payment_info_1')))).toBe(100);
    expect(paymentThresholdFromError(new ApiError('min', 400, fx('staging.payment_info')))).toBe(250);
  });
});

describe('payout deadline', () => {
  it('outlasts the BFF wait (55 s) and Vercel maxDuration (60 s)', () => {
    expect(PAYOUT_TIMEOUT_MS).toBe(65_000);
    expect(PAYOUT_TIMEOUT_MS).toBeGreaterThan(60_000);
  });
});
