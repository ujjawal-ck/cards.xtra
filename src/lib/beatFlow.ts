/**
 * beatFlow: pure helpers for the Beat my card flow (pick a card, then one
 * spends page with category chips, then the result). No React, no tokens, no
 * network. Answers are in question units. No amount goes into analytics.
 *
 * Product rules (docs/beat-my-card-flow-spec.md, sections 3.2 and 9):
 *  - Chips: the categories the picked card rewards (catalogue tags) come
 *    first, then the rest, each part in TOOL_CATEGORIES order.
 *  - Selected on entry: only the categories with a saved spend above 0.
 *  - A hidden (unselected) category keeps its answers in memory, but they are
 *    NOT sent: only the keys of selected categories go to calculate.
 */
import { buildSpends, questionsForCategory, TOOL_CATEGORIES } from './cardTools';
import type { CalculateSpends } from '../api/types';
import type { ToolCategory, ToolCategoryId } from './cardTools';
import { categoryAnswers, hasAnyAnswer } from './toolFlows';
import type { Answers } from './toolFlows';
import { formatINR } from './money';

export type { Answers };

/** Fixed probe body for the picker list: buildSpends({ amazon_spends: 5000 }), all other keys 0. */
export const PROBE_SPENDS: CalculateSpends = buildSpends({ amazon_spends: 5000 });

/** BankKaro tag id -> tool category. Tags with no chip (15 UPI) are not listed. */
const TAG_CATEGORY: Record<number, ToolCategoryId> = {
  2: 'shopping',
  7: 'groceries',
  14: 'bills',
  1: 'fuel',
  5: 'food',
  6: 'dining',
  12: 'travel',
  4: 'travel', // Airport Lounge
};

const ORDER: ToolCategoryId[] = TOOL_CATEGORIES.map((c) => c.id);

/** Ids kept in TOOL_CATEGORIES order, each once. */
const inOrder = (ids: ToolCategoryId[]): ToolCategoryId[] => ORDER.filter((id) => ids.includes(id));

/** BankKaro tag ids -> tool categories, unique, in TOOL_CATEGORIES order. Unknown ids are ignored. */
export function categoriesForTags(tagIds: number[]): ToolCategoryId[] {
  return inOrder(tagIds.map((t) => TAG_CATEGORY[t]).filter((id): id is ToolCategoryId => !!id));
}

/** All 10 TOOL_CATEGORIES: the ones in `rewarded` first, then the rest; each part keeps TOOL_CATEGORIES order. */
export function orderChips(rewarded: ToolCategoryId[]): ToolCategory[] {
  return [
    ...TOOL_CATEGORIES.filter((c) => rewarded.includes(c.id)),
    ...TOOL_CATEGORIES.filter((c) => !rewarded.includes(c.id)),
  ];
}

/** Categories with at least one saved answer above 0, in TOOL_CATEGORIES order. [] when none. */
export function defaultSelection(saved: Answers): ToolCategoryId[] {
  return TOOL_CATEGORIES.filter((c) => hasAnyAnswer(saved, c.keys)).map((c) => c.id);
}

/** Add or remove a category id; result stays in TOOL_CATEGORIES order. */
export function toggleCategory(selected: ToolCategoryId[], id: ToolCategoryId): ToolCategoryId[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : inOrder([...selected, id]);
}

/** Selected categories (TOOL_CATEGORIES order) that have at least one answer above 0. */
export function answeredCategories(selected: ToolCategoryId[], answers: Answers): ToolCategoryId[] {
  return TOOL_CATEGORIES.filter((c) => selected.includes(c.id) && hasAnyAnswer(answers, c.keys)).map(
    (c) => c.id,
  );
}

/** true when answeredCategories(...) is not empty. */
export function canSeeResult(selected: ToolCategoryId[], answers: Answers): boolean {
  return answeredCategories(selected, answers).length > 0;
}

/** Answers to send: ONLY keys of selected categories, missing = 0. */
export function answersToSend(selected: ToolCategoryId[], answers: Answers): Answers {
  return categoryAnswers(selected, answers);
}

/** "Based on Shopping, Fuel and Dining Out": labels of answeredCategories, "and" before the last. None: "". */
export function basedOnText(selected: ToolCategoryId[], answers: Answers): string {
  const labels = answeredCategories(selected, answers).map(
    (id) => TOOL_CATEGORIES.find((c) => c.id === id)!.label,
  );
  if (labels.length === 0) return '';
  const last = labels.pop()!;
  return `Based on ${labels.length ? `${labels.join(', ')} and ${last}` : last}`;
}

/** Footer line: "Based on 1 category" / "Based on 3 categories". 0 -> "". */
export function categoryCountText(selected: ToolCategoryId[], answers: Answers): string {
  const n = answeredCategories(selected, answers).length;
  if (n === 0) return '';
  return `Based on ${n} ${n === 1 ? 'category' : 'categories'}`;
}

/**
 * One-line summary of a folded group, e.g. "₹12,000 a month" or
 * "₹5,000 a year · 4 lounge visits a year". Rupee keys: all answered ones
 * monthly -> sum a month; otherwise each as yearly (month x 12), summed a year.
 * Visit keys: total lounge visits a year. Nothing answered -> "".
 */
export function groupSummary(id: ToolCategoryId, answers: Answers): string {
  const answered = questionsForCategory(id).filter((q) => (answers[q.key] ?? 0) > 0);
  const rupees = answered.filter((q) => q.unit === 'rupees');
  const visits = answered.filter((q) => q.unit === 'visits');
  const parts: string[] = [];
  if (rupees.length) {
    const monthly = rupees.every((q) => q.period === 'month');
    const sum = rupees.reduce(
      (s, q) => s + (answers[q.key] ?? 0) * (monthly || q.period === 'year' ? 1 : 12),
      0,
    );
    parts.push(`${formatINR(sum)} ${monthly ? 'a month' : 'a year'}`);
  }
  if (visits.length) {
    const total = visits.reduce((s, q) => s + (answers[q.key] ?? 0), 0);
    parts.push(`${total} lounge visits a year`);
  }
  return parts.join(' · ');
}
