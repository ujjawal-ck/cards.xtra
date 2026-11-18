/** Home filters: network match, fee buckets, traits, sort. */
import type { CardModel } from '../../molecules/CardTile';
import {
  ANNUAL_FEE_BUCKETS,
  EMPTY_FILTERS,
  applyFilters,
  cardNetworks,
  hasActiveFilters,
  sortCards,
} from '../../data/filterOptions';

let n = 0;
interface Opts {
  network?: string;
  annualFee?: number;
  isFree?: boolean;
  newToCredit?: boolean;
  cashback?: boolean;
  noMeta?: boolean;
}
const card = (o: Opts = {}): CardModel => {
  n += 1;
  return {
    id: `c${n}`,
    name: `Card ${n}`,
    filterMeta: o.noMeta
      ? undefined
      : {
          cardAlias: `a${n}`,
          network: o.network ?? 'VISA',
          categoryIds: [2],
          annualFeeValue: o.annualFee ?? 500,
          isFree: o.isFree ?? false,
          newToCredit: o.newToCredit,
        },
    crossSell: { rewardType: o.cashback ? 'cashback' : 'rewards' },
  } as unknown as CardModel;
};
const ids = (cards: CardModel[]) => cards.map((c) => c.id);

describe('network filter', () => {
  it('reads one network or a comma list, in any spelling', () => {
    expect(cardNetworks('VISA')).toEqual(['visa']);
    expect(cardNetworks('VISA, RuPay')).toEqual(['visa', 'rupay']);
    expect(cardNetworks('AmericanExpress')).toEqual(['americanexpress']);
    expect(cardNetworks('American Express')).toEqual(['americanexpress']);
    expect(cardNetworks(undefined)).toEqual([]);
  });

  it('"Visa" matches VISA cards and multi-network cards that include Visa', () => {
    const visa = card({ network: 'VISA' });
    const both = card({ network: 'VISA,RuPay' });
    const rupay = card({ network: 'RuPay' });
    const out = applyFilters([visa, both, rupay], { ...EMPTY_FILTERS, networks: ['Visa'] });
    expect(ids(out)).toEqual([visa.id, both.id]);
  });

  it('the sheet labels with a space match the API spelling without one', () => {
    const amex = card({ network: 'AmericanExpress' });
    const diners = card({ network: 'DinersClub' });
    const visa = card({ network: 'VISA' });
    const all = [amex, diners, visa];
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, networks: ['American Express'] }))).toEqual([amex.id]);
    expect(ids(applyFilters(all, { ...EMPTY_FILTERS, networks: ['Diners Club'] }))).toEqual([diners.id]);
  });
});

describe('annual fee buckets', () => {
  const bucketsOf = (annualFee: number, isFree: boolean) =>
    ANNUAL_FEE_BUCKETS.map((b, i) => (b.test(annualFee, isFree) ? i : -1)).filter((i) => i >= 0);

  it('every fee lands in exactly one bucket', () => {
    expect(bucketsOf(0, true)).toEqual([0]);
    expect(bucketsOf(0, false)).toEqual([1]); // ₹0 annual fee with a joining fee
    expect(bucketsOf(1000, false)).toEqual([1]);
    expect(bucketsOf(1001, false)).toEqual([2]);
    expect(bucketsOf(2000, false)).toEqual([2]);
    expect(bucketsOf(5000, false)).toEqual([3]);
    expect(bucketsOf(5001, false)).toEqual([4]);
  });

  it('an unknown fee (NaN) lands in no bucket', () => {
    expect(bucketsOf(NaN, false)).toEqual([]);
  });
});

describe('traits', () => {
  it('firstCard keeps only cards with newToCredit true', () => {
    const yes = card({ newToCredit: true });
    const no = card({ newToCredit: false });
    const unknown = card();
    expect(ids(applyFilters([yes, no, unknown], { ...EMPTY_FILTERS, traits: ['firstCard'] }))).toEqual([yes.id]);
  });

  it('two traits are AND: the card must have both', () => {
    const both = card({ newToCredit: true, cashback: true });
    const onlyFirst = card({ newToCredit: true });
    const onlyCashback = card({ cashback: true });
    const out = applyFilters([both, onlyFirst, onlyCashback], { ...EMPTY_FILTERS, traits: ['firstCard', 'cashback'] });
    expect(ids(out)).toEqual([both.id]);
  });

  it('a trait counts as an active filter', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, traits: ['cashback'] })).toBe(true);
  });
});

describe('sortCards', () => {
  it('recommended returns the same array', () => {
    const cards = [card(), card()];
    expect(sortCards(cards, 'recommended')).toBe(cards);
  });

  it('annualFeeAsc: lifetime free first, then fee low to high, unknown last, ties keep order', () => {
    const fee999 = card({ annualFee: 999 });
    const noMeta = card({ noMeta: true });
    const free = card({ annualFee: 0, isFree: true });
    const zeroAnnual = card({ annualFee: 0, isFree: false });
    const textFee = card({ annualFee: NaN });
    const fee499a = card({ annualFee: 499 });
    const fee499b = card({ annualFee: 499 });
    const input = [fee999, noMeta, free, zeroAnnual, textFee, fee499a, fee499b];
    expect(ids(sortCards(input, 'annualFeeAsc'))).toEqual(
      ids([free, zeroAnnual, fee499a, fee499b, fee999, noMeta, textFee]),
    );
    // The input is not changed.
    expect(input[0]).toBe(fee999);
  });
});
