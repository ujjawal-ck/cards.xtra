/**
 * Inline filter questions — one-question rows placed between the Home card
 * tiles. A chip tap ADDS its answer to the filters already applied (it never
 * resets the other rails), and a second tap on the same chip removes it.
 *
 * Pure: the screen passes the loaded catalogue and the applied filters, and
 * gets back the rows (with the number of cards each answer leaves) and the
 * list with the rows placed in it.
 */
import type { CardModel } from '../molecules';
import { applyFilters, type AppliedFilters, type CardTrait } from '../data/filterOptions';

export type InlineQuestionId = 'fee' | 'firstCard' | 'eligibility';

export interface InlineChip {
  key: string;
  label: string;
  selected: boolean;
  /** Cards the list shows when this chip is on. Absent on an action chip. */
  count?: number;
  /** The filters after a tap (the answer added, or removed when selected). */
  next?: AppliedFilters;
  /** A chip that opens a flow in place of changing the filters. */
  action?: 'eligibility';
}

export interface InlineRow {
  kind: 'question';
  id: InlineQuestionId;
  title: string;
  chips: InlineChip[];
  answered: boolean;
}

/** Rows go after this many list cards: the 1st row after 3 cards, and so on. */
export const INLINE_SLOTS = [3, 8, 13, 18];
/** Once this many questions have an answer, no new question is asked. */
export const MAX_ANSWERS = 2;
/** Below this many cards on screen, no new question is asked. */
export const MIN_CARDS_FOR_QUESTION = 6;

// Fee answers are sets of ANNUAL_FEE_BUCKETS indices (0 = lifetime free,
// 1 = up to ₹1,000, 2 = ₹1,000 to ₹2,000), so the filter sheet's Annual Fee
// rail shows the same selection.
const FEE_ANSWERS: Array<{ key: string; label: string; buckets: number[] }> = [
  { key: 'free', label: 'Lifetime free', buckets: [0] },
  { key: 'upto1000', label: 'Up to ₹1,000 a year', buckets: [0, 1] },
  { key: 'upto2000', label: 'Up to ₹2,000 a year', buckets: [0, 1, 2] },
];

const TRAIT_QUESTIONS: Array<{ id: InlineQuestionId; trait: CardTrait; title: string; label: string }> = [
  { id: 'firstCard', trait: 'firstCard', title: 'Is this your first credit card?', label: 'Yes, show cards I can start with' },
];

const sameSet = (a: number[], b: number[]) => a.length === b.length && b.every((x) => a.includes(x));

export interface InlineRowsInput {
  /** The full loaded catalogue (not the filtered list). */
  cards: CardModel[];
  applied: AppliedFilters;
  /** True when the user already gave eligibility details. */
  eligibilityKnown: boolean;
}

/** The question rows to show, in order. A chip that cannot narrow the list is
 *  dropped. A question with no chips left is dropped. */
export function buildInlineRows({ cards, applied, eligibilityKnown }: InlineRowsInput): InlineRow[] {
  const count = (f: AppliedFilters) => applyFilters(cards, f).length;
  const current = count(applied);
  const rows: InlineRow[] = [];

  // Fee: one answer at a time. A tap on another answer replaces the fee selection.
  const feeChips: InlineChip[] = [];
  for (const a of FEE_ANSWERS) {
    const selected = sameSet(applied.feeBucketIndices, a.buckets);
    const on: AppliedFilters = { ...applied, feeBucketIndices: a.buckets };
    const n = selected ? current : count(on);
    // Skip an answer that cannot narrow the list (0 cards, or every card already matches).
    if (!selected && (n === 0 || n === current)) continue;
    feeChips.push({
      key: a.key,
      label: a.label,
      selected,
      count: n,
      next: selected ? { ...applied, feeBucketIndices: [] } : on,
    });
  }
  if (feeChips.length) {
    rows.push({
      kind: 'question',
      id: 'fee',
      title: 'How much annual fee is fine?',
      chips: feeChips,
      answered: feeChips.some((c) => c.selected),
    });
  }

  for (const q of TRAIT_QUESTIONS) {
    const selected = applied.traits.includes(q.trait);
    const on: AppliedFilters = selected ? applied : { ...applied, traits: [...applied.traits, q.trait] };
    const n = selected ? current : count(on);
    // Skip a question that cannot narrow the list (0 cards, or every card already matches).
    if (!selected && (n === 0 || n === current)) continue;
    rows.push({
      kind: 'question',
      id: q.id,
      title: q.title,
      chips: [
        {
          key: q.trait,
          label: q.label,
          selected,
          count: n,
          next: selected ? { ...applied, traits: applied.traits.filter((t) => t !== q.trait) } : on,
        },
      ],
      answered: selected,
    });
  }

  // Stop asking after MAX_ANSWERS answers, or when the list is already short.
  // Answered rows stay, so the user can undo an answer where they gave it.
  const answers = rows.filter((r) => r.answered).length;
  const askMore = answers < MAX_ANSWERS && current >= MIN_CARDS_FOR_QUESTION;
  const kept = rows.filter((r) => r.answered || askMore);

  if (!eligibilityKnown && current >= MIN_CARDS_FOR_QUESTION) {
    kept.push({
      kind: 'question',
      id: 'eligibility',
      title: 'Not sure which cards you can get?',
      chips: [{ key: 'check', label: 'Check eligibility', selected: false, action: 'eligibility' }],
      answered: false,
    });
  }
  return kept;
}

/** Place the rows between the list cards at INLINE_SLOTS. A row whose slot is
 *  past the end of the list goes at the end. An empty list gets no rows. */
export function placeInlineRows(cards: CardModel[], rows: InlineRow[]): Array<CardModel | InlineRow> {
  if (cards.length === 0 || rows.length === 0) return cards;
  const out: Array<CardModel | InlineRow> = [];
  const pending = rows.slice(0, INLINE_SLOTS.length);
  let next = 0;
  cards.forEach((card, i) => {
    out.push(card);
    while (next < pending.length && INLINE_SLOTS[next] === i + 1) {
      out.push(pending[next]);
      next += 1;
    }
  });
  while (next < pending.length) {
    out.push(pending[next]);
    next += 1;
  }
  return out;
}
