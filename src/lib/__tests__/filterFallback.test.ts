/** Closest cards when the filters leave 0 cards; and the copy that names what was set aside. */
import type { CardModel } from '../../molecules/CardTile';
import { EMPTY_FILTERS, type AppliedFilters } from '../../data/filterOptions';
import { closestCards, describeDim, fallbackCopy } from '../filterFallback';

let n = 0;
interface Opts {
  cat?: number[];
  network?: string;
  bank?: string;
  annualFee?: number;
  isFree?: boolean;
  newToCredit?: boolean;
}
const card = (o: Opts = {}): CardModel => {
  n += 1;
  return {
    id: `c${n}`,
    name: `Card ${n}`,
    filterMeta: {
      cardAlias: `a${n}`,
      bankName: o.bank ?? 'HDFC Bank',
      network: o.network ?? 'VISA',
      categoryIds: o.cat ?? [2],
      annualFeeValue: o.annualFee ?? 500,
      isFree: o.isFree ?? false,
      newToCredit: o.newToCredit ?? false,
    },
  } as unknown as CardModel;
};
const ids = (cards: CardModel[]) => cards.map((c) => c.id);
const F = (o: Partial<AppliedFilters>): AppliedFilters => ({ ...EMPTY_FILTERS, ...o });
const FUEL = 1;
const SHOPPING = 2;

describe('closestCards', () => {
  it('a match already exists: nothing is dropped, 1 to 3 cards are returned as they are', () => {
    const fuel = [card({ cat: [FUEL] }), card({ cat: [FUEL] })];
    const out = closestCards([...fuel, card()], F({ categoryTagIds: [FUEL] }));
    expect(out.dropped).toEqual([]);
    expect(ids(out.cards)).toEqual(ids(fuel));
  });

  it('0 cards: drops one dimension, the least cared-for first (traits before network before bank)', () => {
    const fuelVisa = card({ cat: [FUEL], network: 'VISA' });
    const catalogue = [fuelVisa, card({ cat: [SHOPPING] })];
    const out = closestCards(catalogue, F({ categoryTagIds: [FUEL], traits: ['firstCard'] }));
    expect(out.dropped).toEqual(['traits']);
    expect(ids(out.cards)).toEqual([fuelVisa.id]);
  });

  it('drops as FEW dimensions as possible: one that works beats two earlier ones in the order', () => {
    // Fuel + Visa + free + first card: dropping traits or networks alone gives nothing, so is
    // dropping `feeBucketIndices` alone (traits and networks come first in the order, but fail).
    const target = card({ cat: [FUEL], network: 'VISA', isFree: false, annualFee: 900, newToCredit: true });
    const other = card({ cat: [FUEL], network: 'RuPay', isFree: true, newToCredit: false });
    const out = closestCards(
      [target, other],
      F({ categoryTagIds: [FUEL], networks: ['Visa'], feeBucketIndices: [0], traits: ['firstCard'] }),
    );
    expect(out.dropped).toEqual(['feeBucketIndices']);
    expect(ids(out.cards)).toEqual([target.id]);
  });

  it('keeps the category longest: drops the other dimensions first', () => {
    const fuel = card({ cat: [FUEL], network: 'Mastercard', annualFee: 4000 });
    const out = closestCards([fuel, card({ cat: [SHOPPING] })], F({ categoryTagIds: [FUEL], networks: ['Visa'], feeBucketIndices: [0] }));
    expect(out.dropped).toEqual(['networks', 'feeBucketIndices']);
    expect(ids(out.cards)).toEqual([fuel.id]);
    expect(out.applied.categoryTagIds).toEqual([FUEL]);
  });

  it('drops the category only when nothing else helps', () => {
    const shopping = card({ cat: [SHOPPING] });
    const out = closestCards([shopping], F({ categoryTagIds: [FUEL] }));
    expect(out.dropped).toEqual(['categoryTagIds']);
    expect(ids(out.cards)).toEqual([shopping.id]);
  });

  it('is never empty while the catalogue has a card', () => {
    const catalogue = [card({ cat: [SHOPPING], network: 'RuPay' }), card({ cat: [SHOPPING], network: 'RuPay' })];
    const out = closestCards(
      catalogue,
      F({ categoryTagIds: [FUEL], networks: ['Visa'], bankNames: ['Nope Bank'], feeBucketIndices: [0], traits: ['firstCard'] }),
    );
    expect(out.cards.length).toBeGreaterThan(0);
  });

  it('an empty catalogue returns an empty list without throwing', () => {
    expect(closestCards([], F({ categoryTagIds: [FUEL] })).cards).toEqual([]);
  });

  it('does not change the input filters', () => {
    const applied = F({ categoryTagIds: [FUEL], traits: ['firstCard'] });
    closestCards([card()], applied);
    expect(applied).toEqual(F({ categoryTagIds: [FUEL], traits: ['firstCard'] }));
  });
});

describe('copy', () => {
  it('describes each dimension in short words', () => {
    expect(describeDim(F({ categoryTagIds: [FUEL] }), 'categoryTagIds')).toBe('Fuel');
    expect(describeDim(F({ feeBucketIndices: [0] }), 'feeBucketIndices')).toBe('Lifetime free');
    expect(describeDim(F({ feeBucketIndices: [0, 1] }), 'feeBucketIndices')).toBe('Up to ₹1,000 a year');
    expect(describeDim(F({ feeBucketIndices: [0, 1, 2] }), 'feeBucketIndices')).toBe('Up to ₹2,000 a year');
    expect(describeDim(F({ networks: ['Visa', 'RuPay'] }), 'networks')).toBe('Visa or RuPay');
    expect(describeDim(F({ traits: ['firstCard'] }), 'traits')).toBe('First card');
    expect(describeDim(EMPTY_FILTERS, 'networks')).toBeNull();
  });

  it('names what matched and what was set aside', () => {
    const applied = F({ categoryTagIds: [FUEL], feeBucketIndices: [0], networks: ['Visa'] });
    const copy = fallbackCopy(applied, ['feeBucketIndices', 'networks']);
    expect(copy.title).toBe('No exact match for Fuel · Lifetime free · Visa');
    expect(copy.body).toBe('Closest cards for Fuel. We set aside Lifetime free · Visa.');
  });

  it('when everything was set aside it says top cards', () => {
    const copy = fallbackCopy(F({ categoryTagIds: [FUEL] }), ['categoryTagIds']);
    expect(copy.body).toBe('Here are our top cards instead.');
  });

  it('with more than 3 filters the title does not list them all', () => {
    const applied = F({ categoryTagIds: [FUEL], feeBucketIndices: [0], networks: ['Visa'], traits: ['firstCard'] });
    expect(fallbackCopy(applied, ['traits']).title).toBe('No card matches all your filters');
  });

  it('contains no rupee rate or percent', () => {
    const applied = F({ categoryTagIds: [FUEL], feeBucketIndices: [0], networks: ['Visa'] });
    const { title, body } = fallbackCopy(applied, ['networks']);
    expect(`${title} ${body}`).not.toMatch(/%/);
  });
});
