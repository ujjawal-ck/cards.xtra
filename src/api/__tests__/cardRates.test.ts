/**
 * Flat vs Upto on the card reward badge. Rule (same as cashkaro.com, checked on
 * all 20 listed cards on 2026-11-17): "Upto" when the CashKaro offer row has
 * `secondary_cashback_count` > 0 (lower tiers for existing customers), else "Flat".
 * Row shapes below are trimmed from the live `home-categories-exclusive` listing.
 */
import { buildCardRateIndex, resolveCkRate } from '../cardRates';
import { mapBkCardToCardModel } from '../cardMapper';

const row = (id: string, name: string, amount: string, secondary?: number) => ({
  type: 'offers',
  id,
  attributes: {
    name,
    cashback_type: 'Rewards',
    cashback: { payment_type: 'currency', currency: 'INR', amount },
    ...(secondary === undefined ? {} : { secondary_cashback_count: secondary }),
  },
});

const index = buildCardRateIndex([
  row('19878', 'Kotak League Platinum Credit Card', '1100', 2),
  row('24756', 'SBI Cashback Credit Card', '1400', 0),
  row('30001', 'Old Shape Credit Card', '900'), // field absent
]);

describe('card reward prefix', () => {
  it('marks rows with secondary tiers as upto', () => {
    expect(resolveCkRate('19878', undefined, index)).toEqual({ amount: 1100, unit: 'inr', upto: true });
    expect(resolveCkRate('24756', undefined, index)?.upto).toBe(false);
    expect(resolveCkRate('30001', undefined, index)?.upto).toBe(false);
  });

  it('keeps the flag on the name fallback', () => {
    expect(resolveCkRate(null, 'Kotak League Platinum Credit Card', index)?.upto).toBe(true);
  });

  it('maps upto to "Upto ₹X Rewards" and the rest to "Flat"', () => {
    const bk = { name: 'Kotak League Platinum Credit Card', commission: 800 } as any;
    const upto = mapBkCardToCardModel(bk, {}, resolveCkRate('19878', undefined, index));
    expect(upto.rewardPrefix).toBe('Upto');
    expect(upto.cashback).toBe('Upto ₹1,100 Rewards');
    expect(upto.cashbackValue).toBe('₹1,100');

    const flat = mapBkCardToCardModel(bk, {}, resolveCkRate('24756', undefined, index));
    expect(flat.rewardPrefix).toBe('Flat');
    expect(flat.cashback).toBe('Flat ₹1,400 Rewards');
  });

  it('falls back to Flat on BankKaro commission when there is no CashKaro match', () => {
    const m = mapBkCardToCardModel({ name: 'No Match Card', commission: 800 } as any, {}, null);
    expect(m.rewardPrefix).toBe('Flat');
    expect(m.cashback).toBe('Flat ₹800 Rewards');
  });
});
