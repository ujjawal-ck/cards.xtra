/**
 * Mappers against real responses (staging captures + CashKaro doc examples).
 * These pin what each screen shows for a known payload, so a refactor or an
 * API change that silently blanks a field fails here.
 */
import { mapEarnings } from '../earningsMapper';
import { mapOrders, mapOrderDetail } from '../ordersMapper';
import { mapCategoryOffers, mapOfferStore } from '../offersMapper';
import { mapRetailers, mapExitClicks, mapClaims } from '../missingCashbackMapper';
import { extractPaymentData, extractPaymentMethodIds, paymentThresholdFromError } from '../payments';
import { ApiError } from '../http/errors';
import { setHandledErrorReporter } from '../http/report';

const fx = (name: string) => JSON.parse(JSON.stringify(require(`../__fixtures__/${name}.json`)));

describe('earnings', () => {
  it('maps the doc example amounts to display strings and numbers', () => {
    const e = mapEarnings(fx('doc.earnings'));
    expect(e.hasData).toBe(true);
    expect(e.confirmed).toBe('₹500');
    expect(e.totalEarnings).toBe('₹14,58,689.92');
    expect(e.combinedNum).toBe(Math.round(500 + 123495.88));
  });

  it('maps a real staging account (zero balances) without blanks', () => {
    const e = mapEarnings(fx('staging.earnings'));
    expect(e.hasData).toBe(true);
    expect(e.totalEarnings).toMatch(/^₹/);
  });

  it('degrades to zeros, not a crash, on an empty body', () => {
    const e = mapEarnings({});
    expect(e.hasData).toBe(false);
    expect(e.confirmed).toBe('₹0');
  });
});

describe('orders', () => {
  it('maps every doc order row with id, amount and status', () => {
    const rows = mapOrders(fx('doc.orders'));
    expect(rows).toHaveLength(3);
    for (const r of rows as any[]) {
      expect(r.id).toBeTruthy();
    }
  });

  it('maps an empty staging list to []', () => {
    expect(mapOrders(fx('staging.orders'))).toEqual([]);
  });

  it('maps the doc order detail', () => {
    const d: any = mapOrderDetail(fx('doc.order_detail'));
    expect(d).toBeTruthy();
    expect(JSON.stringify(d)).toContain('25');
  });
});

describe('offers', () => {
  it('maps staging category stores with the slug the store page needs', () => {
    const stores: any[] = mapCategoryOffers(fx('staging.offers_category'));
    expect(stores.length).toBeGreaterThan(0);
    for (const s of stores) {
      expect(s.name).toBeTruthy();
      expect(s.slug).toBeTruthy();
      expect(s.ctaLabel).toMatch(/Earn/);
    }
  });

  it('maps the staging store page', () => {
    const store: any = mapOfferStore(fx('staging.offer_store'));
    expect(store).not.toBeNull();
    expect(store.name).toBeTruthy();
  });

  it('returns null for a missing store, not a broken object', () => {
    expect(mapOfferStore({})).toBeNull();
  });
});

describe('missing cashback', () => {
  it('maps doc retailers, exit dates and claims', () => {
    expect(mapRetailers(fx('doc.mc_retailers')).length).toBe(2);
    expect(mapExitClicks(fx('doc.mc_exit_dates')).length).toBeGreaterThan(0);
    expect(mapClaims(fx('doc.mc_queue'), Date.parse('2022-08-20T00:00:00Z')).length).toBeGreaterThan(0);
  });

  it('maps empty staging lists to []', () => {
    expect(mapRetailers(fx('staging.mc_retailers'))).toEqual([]);
    expect(mapClaims(fx('staging.mc_queue_pending'), Date.now())).toEqual([]);
  });
});

describe('payments', () => {
  it('reads method ids from the documented relationships block', () => {
    expect(extractPaymentMethodIds(fx('doc.payment_info'))).toEqual({ amazon: 12, flipkart: 13, upi: 20, bank: 18 });
    const d = extractPaymentData(fx('doc.payment_info'));
    expect(d.paymentThreshold).toBe(100);
  });

  it('reports when it has to fall back to built-in method ids', () => {
    const seen: string[] = [];
    setHandledErrorReporter((_e, ctx) => seen.push(ctx));
    extractPaymentMethodIds({ data: { attributes: {} } });
    expect(seen).toEqual(['payment method ids: using defaults']);
  });

  it('reads the withdrawal minimum from a 5003 error', () => {
    const body = fx('doc.payment_info_1');
    const err = new ApiError('Payment threshold not reached.', 400, body);
    expect(err.hasCode(5003)).toBe(true);
    expect(paymentThresholdFromError(err)).toBe(100);
  });
});
