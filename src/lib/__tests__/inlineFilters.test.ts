/** Inline filter questions: rows, counts, merge, stop rules, placement. */
import type { CardModel } from '../../molecules/CardTile';
import { EMPTY_FILTERS, applyFilters, type AppliedFilters } from '../../data/filterOptions';
import {
  INLINE_SLOTS,
  buildInlineRows,
  placeInlineRows,
  type InlineRow,
} from '../inlineFilters';

let n = 0;
interface Opts {
  annualFee?: number;
  isFree?: boolean;
  newToCredit?: boolean;
  cashback?: boolean;
  categoryIds?: number[];
}
const card = (o: Opts = {}): CardModel => {
  n += 1;
  return {
    id: `c${n}`,
    name: `Card ${n}`,
    filterMeta: {
      cardAlias: `a${n}`,
      network: 'VISA',
      categoryIds: o.categoryIds ?? [2],
      annualFeeValue: o.annualFee ?? 500,
      isFree: o.isFree ?? false,
      newToCredit: o.newToCredit ?? false,
    },
    crossSell: { rewardType: o.cashback ? 'cashback' : 'rewards' },
  } as unknown as CardModel;
};
const many = (count: number, o: Opts = {}) => Array.from({ length: count }, () => card(o));

/** 12 cards: 3 lifetime free, 4 at ₹500, 3 at ₹1,500, 2 at ₹6,000. */
const catalogue = (): CardModel[] => [
  ...many(3, { annualFee: 0, isFree: true, newToCredit: true }),
  ...many(4, { annualFee: 500, newToCredit: true, cashback: true }),
  ...many(3, { annualFee: 1500 }),
  ...many(2, { annualFee: 6000 }),
];
const row = (rows: InlineRow[], id: string) => rows.find((r) => r.id === id);
const input = (cards: CardModel[], applied: AppliedFilters = EMPTY_FILTERS, eligibilityKnown = false) => ({
  cards,
  applied,
  eligibilityKnown,
});

describe('buildInlineRows', () => {
  it('asks fee, first card, cashback, then eligibility, with the cards each answer leaves', () => {
    const rows = buildInlineRows(input(catalogue()));
    expect(rows.map((r) => r.id)).toEqual(['fee', 'firstCard', 'cashback', 'eligibility']);
    expect(row(rows, 'fee')!.chips.map((c) => [c.key, c.count])).toEqual([
      ['free', 3],
      ['upto1000', 7],
      ['upto2000', 10],
    ]);
    expect(row(rows, 'firstCard')!.chips[0].count).toBe(7);
    expect(row(rows, 'cashback')!.chips[0].count).toBe(4);
  });

  it('the count on a chip is the length of the list its `next` filters give', () => {
    const cards = catalogue();
    for (const r of buildInlineRows(input(cards))) {
      for (const c of r.chips) {
        if (c.next) expect(applyFilters(cards, c.next)).toHaveLength(c.count!);
      }
    }
  });

  it('an answer is ADDED to the filters already applied', () => {
    const cards = [
      ...catalogue(),
      ...many(4, { annualFee: 0, isFree: true, categoryIds: [12] }),
      ...many(2, { annualFee: 3000, categoryIds: [12] }),
    ];
    const applied: AppliedFilters = { ...EMPTY_FILTERS, categoryTagIds: [12], networks: ['Visa'] };
    const free = row(buildInlineRows(input(cards, applied)), 'fee')!.chips[0];
    expect(free.next).toEqual({ ...applied, feeBucketIndices: [0] });
    expect(free.count).toBe(4);
  });

  it('a selected chip removes its answer on the next tap', () => {
    const applied: AppliedFilters = { ...EMPTY_FILTERS, feeBucketIndices: [0, 1], traits: ['cashback'] };
    const rows = buildInlineRows(input(catalogue(), applied));
    const fee = row(rows, 'fee')!.chips.find((c) => c.selected)!;
    expect(fee.key).toBe('upto1000');
    expect(fee.next).toEqual({ ...applied, feeBucketIndices: [] });
    const cashback = row(rows, 'cashback')!.chips[0];
    expect(cashback.selected).toBe(true);
    expect(cashback.next).toEqual({ ...applied, traits: [] });
  });

  it('a fee selection made in the sheet that is not one of the answers shows no chip as selected', () => {
    const rows = buildInlineRows(input(catalogue(), { ...EMPTY_FILTERS, feeBucketIndices: [2] }));
    const fee = row(rows, 'fee');
    // 3 cards show (₹1,500), so no new question is asked and the fee row is not answered.
    expect(fee).toBeUndefined();
  });

  it('drops a chip and a question that cannot narrow the list', () => {
    // No lifetime-free card, no cashback card, and every card is first-card friendly.
    const cards = [
      ...many(6, { annualFee: 500, newToCredit: true }),
      ...many(2, { annualFee: 1500, newToCredit: true }),
      ...many(2, { annualFee: 6000, newToCredit: true }),
    ];
    const rows = buildInlineRows(input(cards));
    expect(row(rows, 'fee')!.chips.map((c) => c.key)).toEqual(['upto1000', 'upto2000']);
    expect(row(rows, 'firstCard')).toBeUndefined();
    expect(row(rows, 'cashback')).toBeUndefined();
  });

  it('after 2 answers no new question is asked, and the answered rows stay', () => {
    const cards = [...catalogue(), ...many(8, { annualFee: 500, newToCredit: true, cashback: true })];
    const applied: AppliedFilters = { ...EMPTY_FILTERS, feeBucketIndices: [0, 1], traits: ['firstCard'] };
    const rows = buildInlineRows(input(cards, applied, true));
    expect(rows.map((r) => [r.id, r.answered])).toEqual([
      ['fee', true],
      ['firstCard', true],
    ]);
  });

  it('a short list gets no new question and no eligibility row', () => {
    const cards = many(5, { annualFee: 0, isFree: true, cashback: true });
    expect(buildInlineRows(input([...cards, ...many(3)], { ...EMPTY_FILTERS, traits: ['cashback'] }))).toEqual([
      expect.objectContaining({ id: 'cashback', answered: true }),
    ]);
  });

  it('no eligibility row once the user gave eligibility details', () => {
    const rows = buildInlineRows(input(catalogue(), EMPTY_FILTERS, true));
    expect(row(rows, 'eligibility')).toBeUndefined();
  });

  it('the eligibility chip is an action, not a filter change', () => {
    const chip = row(buildInlineRows(input(catalogue())), 'eligibility')!.chips[0];
    expect(chip.action).toBe('eligibility');
    expect(chip.next).toBeUndefined();
  });
});

describe('placeInlineRows', () => {
  const q = (id: string): InlineRow => ({ kind: 'question', id: id as InlineRow['id'], title: id, chips: [], answered: false });
  const kinds = (list: Array<CardModel | InlineRow>) => list.map((x) => ('kind' in x ? x.id : 'card'));

  it('puts each row after its slot', () => {
    const out = placeInlineRows(many(10), [q('fee'), q('firstCard')]);
    expect(out).toHaveLength(12);
    expect(kinds(out)[INLINE_SLOTS[0]]).toBe('fee'); // after 3 cards
    expect(kinds(out)[INLINE_SLOTS[1] + 1]).toBe('firstCard'); // after 8 cards, plus the first row
  });

  it('a row whose slot is past the end goes at the end', () => {
    const out = placeInlineRows(many(4), [q('fee'), q('cashback')]);
    expect(kinds(out)).toEqual(['card', 'card', 'card', 'fee', 'card', 'cashback']);
  });

  it('an empty list or no rows returns the cards unchanged', () => {
    const cards = many(3);
    expect(placeInlineRows([], [q('fee')])).toEqual([]);
    expect(placeInlineRows(cards, [])).toBe(cards);
  });
});
