/**
 * Offers money rules: a rupee cashback ('currency' or 'flat') shows ₹, never
 * a percent (DATA-02); a store with no amount shows the server's
 * cashback_button_text (CashKaro parity J); an unusable body is not an empty
 * category.
 */
import {
  cashbackStrikeText,
  cashbackValueText,
  isRupeeCashback,
  mapCategoryOffers,
  mapOfferStore,
} from '../offersMapper';

const fx = (name: string) => JSON.parse(JSON.stringify(require(`../__fixtures__/${name}.json`)));

/** The CashKaro rupee row: included[2].related_offers.offers → outzidr-coupons. */
function currencyRow(): any {
  const store = fx('staging.offer_store');
  const offers: any[] = store.included[2].related_offers.offers;
  return offers.find((o) => o.attributes.unique_identifier === 'outzidr-coupons');
}

describe('isRupeeCashback (DATA-02)', () => {
  it('is true for the fixture rupee row and for flat', () => {
    const cb = currencyRow().attributes.cashback;
    expect(cb.payment_type).toBe('currency');
    expect(isRupeeCashback(cb)).toBe(true);
    expect(isRupeeCashback({ payment_type: 'flat' })).toBe(true);
    expect(isRupeeCashback({ payment_type: ' Currency ' })).toBe(true);
  });

  it('is false for percent, unknown or missing', () => {
    expect(isRupeeCashback({ payment_type: 'percent' })).toBe(false);
    expect(isRupeeCashback({ payment_type: 'INR' })).toBe(false);
    expect(isRupeeCashback({})).toBe(false);
    expect(isRupeeCashback(undefined)).toBe(false);
    expect(isRupeeCashback(null)).toBe(false);
  });
});

describe('rupee rows show ₹ on every surface (DATA-02)', () => {
  it('grid tile CTA, store value and strike value', () => {
    const row = currencyRow();
    const amount = row.attributes.cashback.amount;
    expect(mapCategoryOffers({ data: [row] })[0].ctaLabel).toBe(`Shop & Earn Flat ₹${amount}`);
    expect(cashbackValueText(row.attributes.cashback)).toBe(`₹${amount}`);
    expect(cashbackStrikeText({ ...row.attributes.cashback, strike_out_value: 100 })).toBe('₹100');
  });

  it('store page headline and rate rows', () => {
    const row = currencyRow();
    const store = mapOfferStore({ data: { id: '1', attributes: row.attributes } })!;
    expect(store.cashbackValue).toBe(`₹${row.attributes.cashback.amount}`);
    expect(store.rewardRates[0].rate).toBe(`₹${row.attributes.cashback.amount}`);
  });

  it('a currency secondary rate row is ₹ too', () => {
    const res = {
      data: { id: '1', attributes: { name: 'S', cashback: { payment_type: 'percent', amount: '5' } } },
      included: [{ secondary_cashback: [{ attributes: { payment_type: 'currency', amount: '150', details: 'x' } }] }],
    };
    expect(mapOfferStore(res)!.rewardRates.map((r) => r.rate)).toEqual(['5%', '₹150']);
  });

  it('percent rows are unchanged', () => {
    const stores = mapCategoryOffers(fx('staging.offers_category'));
    for (const s of stores) expect(s.ctaLabel).toMatch(/^Shop & Earn (Flat|Upto) [\d.]+%$/);
  });
});

describe('no amount: server cashback_button_text (parity J)', () => {
  const zeroRow = (attrs: Record<string, unknown>) => {
    const row = fx('staging.offers_category').data[1];
    return { ...row, attributes: { ...row.attributes, ...attrs } };
  };

  it('amount 0 shows the row server text', () => {
    const row = zeroRow({ cashback: { payment_type: 'percent', amount: '0' } });
    expect(row.attributes.cashback_button_text).toBeTruthy();
    expect(mapCategoryOffers({ data: [row] })[0].ctaLabel).toBe(row.attributes.cashback_button_text);
  });

  it('a missing amount or cashback block shows the server text', () => {
    const row = zeroRow({ cashback: undefined, cashback_button_text: '  Earn Rewards  on X ' });
    expect(mapCategoryOffers({ data: [row] })[0].ctaLabel).toBe('Earn Rewards on X');
  });

  it('falls back to the generic CTA when the server text is blank or absent', () => {
    for (const text of ['', '   ', undefined, null, 5]) {
      const row = zeroRow({ cashback: { amount: '0' }, cashback_button_text: text });
      expect(mapCategoryOffers({ data: [row] })[0].ctaLabel).toBe('Shop & Earn Cashback');
    }
  });

  it('a store with an amount ignores the server text', () => {
    const row = zeroRow({});
    expect(mapCategoryOffers({ data: [row] })[0].ctaLabel).toMatch(/^Shop & Earn /);
  });
});

describe('unusable category response', () => {
  it('a real empty category is []; a body without a data list throws', () => {
    expect(mapCategoryOffers({ data: [] })).toEqual([]);
    expect(() => mapCategoryOffers('<html>portal</html>')).toThrow();
    expect(() => mapCategoryOffers({})).toThrow();
    expect(() => mapCategoryOffers(undefined)).toThrow();
  });

  it('R-10: a category that counts 0 stores is empty, with no data list or a null one', () => {
    expect(mapCategoryOffers({ meta: { total_records: 0 }, data: [] })).toEqual([]);
    expect(mapCategoryOffers({ meta: { total_records: 0 } })).toEqual([]);
    expect(mapCategoryOffers({ meta: { total_records: 0 }, data: null })).toEqual([]);
    expect(mapCategoryOffers({ meta: { total_records: '0' } })).toEqual([]);
    // Stores counted but no list, a missing count, or a list of the wrong type: still an error.
    expect(() => mapCategoryOffers({ meta: { total_records: 9 } })).toThrow();
    expect(() => mapCategoryOffers({ meta: {} })).toThrow();
    expect(() => mapCategoryOffers({ meta: { total_records: '' } })).toThrow();
    expect(() => mapCategoryOffers({ meta: { total_records: null } })).toThrow();
    expect(() => mapCategoryOffers({ meta: { total_records: 0 }, data: 'oops' })).toThrow();
  });
});

describe('storeId on the grid summary (C5)', () => {
  it('is the row id as a string, not the slug, when unique_identifier differs', () => {
    const [s] = mapCategoryOffers({
      data: [{ type: 'offers', id: 12345, attributes: { name: 'Some Store', unique_identifier: 'some-store-coupons' } }],
    });
    expect(s.slug).toBe('some-store-coupons');
    expect(s.storeId).toBe('12345');
  });

  it('is undefined when the row has no id (the slug comes from unique_identifier)', () => {
    const [s] = mapCategoryOffers({ data: [{ type: 'offers', attributes: { name: 'No Id', unique_identifier: 'no-id' } }] });
    expect(s.slug).toBe('no-id');
    expect(s.storeId).toBeUndefined();
  });
});
