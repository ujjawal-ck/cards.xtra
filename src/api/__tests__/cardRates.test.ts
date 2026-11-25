/**
 * CashKaro card rewards and the mapped-only card rule (owner rule D-A, 2026-11-24).
 *
 * Flat vs Upto on the card reward badge. Rule (same as cashkaro.com, checked on
 * all 20 listed cards on 2026-11-17): "Upto" when the CashKaro offer row has
 * `secondary_cashback_count` > 0 (lower tiers for existing customers), else "Flat".
 * Row shapes below are trimmed from the live `home-categories-exclusive` listing.
 */
import {
  buildCardRateIndex,
  isCardShown,
  leagueForDisplay,
  resolveCkRate,
} from '../cardRates';
import { mapBkCardToCardModel, rewardLabel } from '../cardMapper';

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

  it('never shows the BankKaro commission: no CashKaro match means no amount', () => {
    const m = mapBkCardToCardModel(
      { name: 'No Match Card', commission: '800', bk_commission: '900' } as any,
      {},
      null,
    );
    expect(m.cashbackValue).toBe('');
    expect(m.cashback).toBe('Rewards');
    expect(rewardLabel(m)).toBe('');
    expect(m.crossSell).toBeUndefined(); // no alias here; the reward rule is covered in cardMapperCrossSell
  });
});

describe('card reward unit (DATA-02)', () => {
  const typed = (id: string, payment_type: string | undefined, amount: string) => ({
    id,
    attributes: {
      name: `Card ${id} Credit Card`,
      cashback: { ...(payment_type ? { payment_type } : {}), amount },
    },
  });
  const idx = buildCardRateIndex([
    typed('1', 'currency', '1200'),
    typed('2', 'flat', '500'),
    typed('3', 'percent', '5'),
    typed('4', undefined, '700'),
  ]);

  it("reads a 'currency' row as rupees", () => {
    expect(resolveCkRate('1', undefined, idx)).toMatchObject({ amount: 1200, unit: 'inr' });
    expect(mapBkCardToCardModel({ name: 'x' } as any, {}, resolveCkRate('1', undefined, idx)).cashbackValue).toBe('₹1,200');
  });

  it("reads 'flat' as rupees and 'percent' as a percent", () => {
    expect(resolveCkRate('2', undefined, idx)).toMatchObject({ amount: 500, unit: 'inr' });
    expect(resolveCkRate('3', undefined, idx)).toMatchObject({ amount: 5, unit: 'percent' });
  });

  it('shows no amount for an unknown payment type, but the row still counts as a store', () => {
    const rate = resolveCkRate('4', undefined, idx);
    expect(rate).not.toBeNull();
    expect(rate?.amount).toBe(0);
    expect(mapBkCardToCardModel({ name: 'x' } as any, {}, rate).cashbackValue).toBe('');
  });
});

describe('store row with amount 0 (parity J)', () => {
  const zero = (id: string, text?: string) => ({
    id,
    attributes: {
      name: `Zero ${id} Credit Card`,
      cashback: { payment_type: 'currency', amount: '0' },
      ...(text === undefined ? {} : { cashback_button_text: text }),
    },
  });
  const idx = buildCardRateIndex([zero('50', '  Earn Rewards on Zero  '), zero('51', ''), zero('52')]);

  it("uses the server's cashback_button_text as the reward label", () => {
    const m = mapBkCardToCardModel({ name: 'Zero 50' } as any, {}, resolveCkRate('50', undefined, idx));
    expect(m.cashbackValue).toBe('');
    expect(m.cashback).toBe('Earn Rewards on Zero');
    expect(rewardLabel(m)).toBe('Earn Rewards on Zero');
  });

  it('falls back to the no-amount label when the text is empty or absent', () => {
    expect(mapBkCardToCardModel({ name: 'a' } as any, {}, resolveCkRate('51', undefined, idx)).cashback).toBe('Rewards');
    expect(mapBkCardToCardModel({ name: 'b' } as any, {}, resolveCkRate('52', undefined, idx)).cashback).toBe('Rewards');
  });

  it('a card on an amount-0 row is still a matched card, so it is shown', () => {
    const card = { ck_store_id: '50', name: 'Zero 50' };
    expect(isCardShown(card, idx)).toBe(true);
  });

  it('a row with amount 0 never makes a rated card\'s name ambiguous', () => {
    const idx2 = buildCardRateIndex([
      { id: '70', attributes: { name: 'Twin Credit Card', cashback: { payment_type: 'currency', amount: '0' } } },
      { id: '71', attributes: { name: 'Twin Credit Card CG May', cashback: { payment_type: 'currency', amount: '800' } } },
    ]);
    expect(resolveCkRate('999', 'Twin Credit Card', idx2)).toMatchObject({ amount: 800, unit: 'inr' });
  });

  it('two rated rows on one name stay ambiguous; two 0 rows too', () => {
    const rated = buildCardRateIndex([
      { id: '80', attributes: { name: 'Dup Credit Card', cashback: { payment_type: 'currency', amount: '500' } } },
      { id: '81', attributes: { name: 'Dup Credit Card CG', cashback: { payment_type: 'currency', amount: '600' } } },
      { id: '82', attributes: { name: 'Dup Credit Card Nov', cashback: { payment_type: 'currency', amount: '0' } } },
    ]);
    expect(resolveCkRate(null, 'Dup Credit Card', rated)).toBeNull();
    const zeros = buildCardRateIndex([
      { id: '90', attributes: { name: 'Zed Credit Card', cashback: { payment_type: 'currency', amount: '0' } } },
      { id: '91', attributes: { name: 'Zed Credit Card CG', cashback: { payment_type: 'currency', amount: '0' } } },
    ]);
    expect(resolveCkRate(null, 'Zed Credit Card', zeros)).toBeNull();
    expect(resolveCkRate('90', undefined, zeros)).not.toBeNull(); // still matched by id
  });

  it('keeps the label off a row that has an amount', () => {
    const withAmount = buildCardRateIndex([
      { id: '60', attributes: { name: 'A Credit Card', cashback_button_text: 'Earn Rewards', cashback: { payment_type: 'currency', amount: '900' } } },
    ]);
    expect(resolveCkRate('60', undefined, withAmount)?.label).toBeUndefined();
  });
});

describe('mapped only (isCardShown, owner rule D-A)', () => {
  // Dummy amounts. Commission fields stay on the inputs to prove the rule never reads them.
  const sbi = { ck_store_id: '24756', name: 'SBI Cashback Credit Card', commission: '100' };
  const axisPaid = { ck_store_id: '11111', name: 'Axis Unmapped Credit Card', commission: '200' };
  const bkOnly = { ck_store_id: '11112', name: 'Axis Miles Credit Card', commission: '0', bk_commission: '200' };
  const twin = { ck_store_id: '99999', name: 'Kotak League Platinum Credit Card CG May' };

  it('an empty index shows no card, also one with a BankKaro commission', () => {
    for (const empty of [buildCardRateIndex([]), buildCardRateIndex(undefined as any)]) {
      expect(isCardShown(sbi, empty)).toBe(false);
      expect(isCardShown(axisPaid, empty)).toBe(false);
      expect(isCardShown({ name: 'x', bk_commission: '100' } as any, empty)).toBe(false);
    }
  });

  it('an index with only non-card stores shows no card', () => {
    const nonCard = buildCardRateIndex([
      { id: '16919', attributes: { name: 'Nykaa Fashion', cashback: { payment_type: 'percent', amount: '5' } } },
      { id: '100000015', attributes: { name: 'Dot & Key IDFC', cashback: { payment_type: 'percent', amount: '10' } } },
    ]);
    expect(isCardShown(sbi, nonCard)).toBe(false);
    expect(isCardShown(axisPaid, nonCard)).toBe(false);
  });

  it('an unmatched card with a BankKaro commission is hidden', () => {
    expect(isCardShown(axisPaid, index)).toBe(false);
    expect(isCardShown(bkOnly, index)).toBe(false);
    expect(isCardShown({ name: 'No Name Match' }, index)).toBe(false);
  });

  it('a card matched by id is shown', () => {
    expect(isCardShown(sbi, index)).toBe(true);
  });

  it('a matched card with amount 0 is shown', () => {
    const zeroIdx = buildCardRateIndex([
      { id: '40', attributes: { name: 'Zero Forty Credit Card', cashback: { payment_type: 'currency', amount: '0' } } },
    ]);
    expect(resolveCkRate('40', undefined, zeroIdx)?.amount).toBe(0);
    expect(isCardShown({ ck_store_id: '40', name: 'Other Name' }, zeroIdx)).toBe(true);
  });

  it('a name-fallback match is shown (contract Q2)', () => {
    expect(isCardShown(twin, index)).toBe(true);
  });
});

describe('league for display (leagueForDisplay)', () => {
  const lr = (alias: string, cardId?: string) => ({
    savings: { alias },
    ...(cardId ? { card: { id: cardId } } : {}),
  });
  const rows = [lr('a', '1'), lr('b', '2'), lr('not-in-app'), lr('mine', '9')];
  const aliases = (xs: Array<{ savings: { alias: string } }>) => xs.map((r) => r.savings.alias);

  it('a null shown set (cards loading or failed) returns no unmapped row; only the own card stays', () => {
    expect(leagueForDisplay(rows, null)).toEqual([]);
    const out = leagueForDisplay(rows, null, 'mine');
    expect(aliases(out)).toEqual(['mine']);
    expect((out[0] as { card?: { id: string } }).card?.id).toBe('9');
  });

  it('only rows whose app card is shown; rows with no app card drop out', () => {
    expect(aliases(leagueForDisplay(rows, { ids: new Set(['1']) }))).toEqual(['a']);
  });

  it('an empty shown set drops every row', () => {
    expect(leagueForDisplay(rows, { ids: new Set<string>() })).toEqual([]);
  });

  it("always keeps the user's own card with its card, matched or not", () => {
    const out = leagueForDisplay(rows, { ids: new Set(['1']) }, 'mine');
    expect(aliases(out)).toEqual(['a', 'mine']);
    expect((out[1] as { card?: { id: string } }).card?.id).toBe('9');
    expect(aliases(leagueForDisplay(rows, { ids: new Set<string>() }, 'mine'))).toEqual(['mine']);
  });
});
