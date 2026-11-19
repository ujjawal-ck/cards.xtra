/** Advisor results page helpers: pickCards, buildResults, hasFreeAndPaid. */
import type { CardModel } from '../../../molecules/CardTile';
import { buildResults, hasFreeAndPaid, pickCards } from '../results';

const card = (id: string, annualFeeValue: number, isFree = false): CardModel =>
  ({ id, name: `Card ${id}`, filterMeta: { annualFeeValue, isFree } }) as unknown as CardModel;
const ids = (cards: CardModel[]) => cards.map((c) => c.id);

const a = card('a', 999);
const b = card('b', 0, true);
const c = card('c', 499);
const d = card('d', 0, true);
const all = [a, b, c, d];

describe('pickCards', () => {
  it('keeps the order of cardIds', () => {
    expect(ids(pickCards(all, ['c', 'a', 'd']))).toEqual(['c', 'a', 'd']);
  });
  it('skips an unknown id', () => {
    expect(ids(pickCards(all, ['a', 'zzz', 'b']))).toEqual(['a', 'b']);
  });
  it('does not double a duplicate id', () => {
    expect(ids(pickCards(all, ['a', 'b', 'a']))).toEqual(['a', 'b']);
  });
  it('returns an empty list for no ids', () => {
    expect(pickCards(all, [])).toEqual([]);
  });
});

describe('buildResults', () => {
  it('keeps the given order for recommended', () => {
    expect(ids(buildResults(all, 'recommended', false))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('keeps only free cards for freeOnly', () => {
    expect(ids(buildResults(all, 'recommended', true))).toEqual(['b', 'd']);
  });
  it('sorts by lowest annual fee', () => {
    expect(ids(buildResults(all, 'fee', false))).toEqual(['b', 'd', 'c', 'a']);
  });
  it('combines free only and fee sort', () => {
    expect(ids(buildResults([d, a, b], 'fee', true))).toEqual(['d', 'b']);
  });
  it('does not mutate the input', () => {
    const input = [a, b, c, d];
    buildResults(input, 'fee', false);
    buildResults(input, 'recommended', true);
    expect(ids(input)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('hasFreeAndPaid', () => {
  it('is false for all free', () => expect(hasFreeAndPaid([b, d])).toBe(false));
  it('is false for all paid', () => expect(hasFreeAndPaid([a, c])).toBe(false));
  it('is true for a mix', () => expect(hasFreeAndPaid(all)).toBe(true));
  it('is false for an empty list', () => expect(hasFreeAndPaid([])).toBe(false));
});
