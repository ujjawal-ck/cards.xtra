/**
 * CashKaro card rewards and the "filter once mapped" rule (decision 2026-11-23).
 *
 * Flat vs Upto on the card reward badge. Rule (same as cashkaro.com, checked on
 * all 20 listed cards on 2026-11-17): "Upto" when the CashKaro offer row has
 * `secondary_cashback_count` > 0 (lower tiers for existing customers), else "Flat".
 * Row shapes below are trimmed from the live `home-categories-exclusive` listing.
 */
import {
  buildCardRateIndex,
  isCardShown,
  isCkFilterOn,
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
    expect(isCkFilterOn(idx, [card])).toBe(true);
    expect(isCardShown(card, idx, true)).toBe(true);
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

describe('filter once mapped (isCkFilterOn + isCardShown)', () => {
  const sbi = { ck_store_id: '24756', name: 'SBI Cashback Credit Card', commission: '1400' };
  const axisPaid = { ck_store_id: '11111', name: 'Axis Unmapped Credit Card', commission: '900' };
  const axisFree = { ck_store_id: '11112', name: 'Axis Miles Credit Card', commission: '0', bk_commission: '700' };
  const noComm = { ck_store_id: '11113', name: 'No Comm Credit Card', commission: 'N/A' };
  const twin = { ck_store_id: '99999', name: 'Kotak League Platinum Credit Card CG May' };

  it('index empty or failed: the filter is off', () => {
    for (const empty of [buildCardRateIndex([]), buildCardRateIndex(undefined as any)]) {
      expect(isCkFilterOn(empty, [sbi, axisPaid])).toBe(false);
    }
  });

  it('filter off: commissionable only, as before (CashKaro amount or BankKaro commission above 0)', () => {
    const empty = buildCardRateIndex([]);
    expect(isCardShown(axisPaid, empty, false)).toBe(true);
    expect(isCardShown(noComm, empty, false)).toBe(false);
    // Same parse as before: `commission` "0" is truthy, so `bk_commission` is not read.
    expect(isCardShown(axisFree, empty, false)).toBe(false);
    expect(isCardShown({ name: 'x', bk_commission: '500' }, empty, false)).toBe(true);
  });

  it('an index with only non-card stores leaves the filter off', () => {
    const nonCard = buildCardRateIndex([
      { id: '16919', attributes: { name: 'Nykaa Fashion', cashback: { payment_type: 'percent', amount: '5' } } },
      { id: '100000015', attributes: { name: 'Dot & Key IDFC', cashback: { payment_type: 'percent', amount: '12' } } },
    ]);
    expect(isCkFilterOn(nonCard, [sbi, axisPaid, noComm])).toBe(false);
    expect(isCardShown(sbi, nonCard, false)).toBe(true); // commission keeps it, as before
    expect(isCardShown(noComm, nonCard, false)).toBe(false);
  });

  it('filter on once one card matches: only matched cards show, commission does not count', () => {
    expect(isCkFilterOn(index, [axisPaid, sbi])).toBe(true);
    expect(isCardShown(sbi, index, true)).toBe(true); // by id
    expect(isCardShown(axisPaid, index, true)).toBe(false); // unmatched: hidden despite a commission
    expect(isCardShown({ name: 'No Name Match' }, index, true)).toBe(false);
  });

  it('a name-fallback match turns the filter on and is shown', () => {
    expect(isCkFilterOn(index, [twin, noComm])).toBe(true);
    expect(isCardShown(twin, index, true)).toBe(true);
  });
});

describe('league for display (leagueForDisplay)', () => {
  const lr = (alias: string, cardId?: string) => ({
    savings: { alias },
    ...(cardId ? { card: { id: cardId } } : {}),
  });
  const rows = [lr('a', '1'), lr('b', '2'), lr('not-in-app'), lr('mine', '9')];
  const aliases = (xs: Array<{ savings: { alias: string } }>) => xs.map((r) => r.savings.alias);

  it('keeps every row as it is while the card list is not known', () => {
    expect(leagueForDisplay(rows, null)).toBe(rows);
  });

  it('filter on: only rows whose app card is shown; rows with no app card drop out', () => {
    expect(aliases(leagueForDisplay(rows, { ids: new Set(['1']), filterOn: true }))).toEqual(['a']);
  });

  it('filter off: every row stays, a card the app does not sell loses its `card` (no Apply)', () => {
    const out = leagueForDisplay(rows, { ids: new Set(['1']), filterOn: false });
    expect(aliases(out)).toEqual(['a', 'b', 'not-in-app', 'mine']);
    expect(out.map((r) => !!(r as { card?: unknown }).card)).toEqual([true, false, false, false]);
  });

  it("always keeps the user's own card with its card, matched or not", () => {
    const on = leagueForDisplay(rows, { ids: new Set(['1']), filterOn: true }, 'mine');
    expect(aliases(on)).toEqual(['a', 'mine']);
    const off = leagueForDisplay(rows, { ids: new Set(['1']), filterOn: false }, 'mine');
    expect((off[3] as { card?: { id: string } }).card?.id).toBe('9');
  });
});
