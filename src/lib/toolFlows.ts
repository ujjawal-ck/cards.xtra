/**
 * toolFlows: pure helpers for the three input flows (spend quiz, best card by
 * category, best card for brands). No React, no tokens, no network.
 * Answers are in question units. No amount goes into analytics.
 */
import {
  MAX_BRANDS,
  SPEND_QUESTIONS,
  TOOL_BRANDS,
  TOOL_CATEGORIES,
} from './cardTools';
import type { SpendKey, ToolBrand, ToolCategory, ToolCategoryId } from './cardTools';

export type Answers = Partial<Record<SpendKey, number>>;

/** The line shown when a brand that is not Amazon or Flipkart is picked. */
export const BRANDS_HONEST_LINE =
  'Amazon and Flipkart are matched exactly. Other brands are counted in their category.';

/** true when any listed key (default: all keys) has an answer above 0. */
export function hasAnyAnswer(answers: Answers, keys?: SpendKey[]): boolean {
  const list = keys ?? SPEND_QUESTIONS.map((q) => q.key);
  return list.some((k) => (answers[k] ?? 0) > 0);
}

/** The chosen category ids in picker order. Unknown ids are dropped. */
export function orderedCategories(ids: string[]): ToolCategory[] {
  return TOOL_CATEGORIES.filter((c) => ids.includes(c.id));
}

/** All question keys of the chosen categories, in picker order. */
export function keysForCategories(ids: string[]): SpendKey[] {
  return orderedCategories(ids).flatMap((c) => c.keys);
}

/**
 * Answers for the category flow: ONLY the keys of the chosen categories.
 * A key with no answer is 0.
 */
export function categoryAnswers(ids: string[], answers: Answers): Answers {
  const out: Answers = {};
  for (const key of keysForCategories(ids)) out[key] = Math.max(0, answers[key] ?? 0);
  return out;
}

/** "Shopping, Fuel": the labels of the chosen categories, in picker order. */
export function categorySubtitle(ids: string[]): string {
  return orderedCategories(ids)
    .map((c) => c.label)
    .join(', ');
}

/** Add or remove a category id. Keeps the others. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Add or remove a brand id. Adding stops at `max`. Pick order is kept. */
export function toggleBrand(list: string[], id: string, max: number = MAX_BRANDS): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  return list.length >= max ? list : [...list, id];
}

/** The picker tabs in use: category ids that at least one brand sits under, in category order. */
export function brandTabs(brands: ToolBrand[] = TOOL_BRANDS): ToolCategoryId[] {
  const used = new Set(brands.map((b) => b.tab));
  return TOOL_CATEGORIES.filter((c) => used.has(c.id)).map((c) => c.id);
}

/** Brands under a tab ('all' for every brand) whose name contains the query (trimmed, any case). */
export function filterBrands(
  brands: ToolBrand[],
  tab: ToolCategoryId | 'all',
  query: string,
): ToolBrand[] {
  const q = query.trim().toLowerCase();
  return brands.filter(
    (b) => (tab === 'all' || b.tab === tab) && (q === '' || b.name.toLowerCase().includes(q)),
  );
}

/**
 * Brand answers: for each picked brand with a spend above 0, add its monthly
 * amount to `answers[brand.key]`. Brands that share a key are summed.
 */
export function brandAnswers(picks: Array<{ brandId: string; monthly: number }>): Answers {
  const out: Answers = {};
  for (const pick of picks) {
    const brand = TOOL_BRANDS.find((b) => b.id === pick.brandId);
    const monthly = Math.round(pick.monthly);
    if (!brand || !(monthly > 0)) continue;
    out[brand.key] = (out[brand.key] ?? 0) + monthly;
  }
  return out;
}

/** The honest line for the results screen: set only when a counted-by-category brand has a spend. */
export function brandsSubtitle(picks: Array<{ brandId: string; monthly: number }>): string | undefined {
  const hasCounted = picks.some(
    (p) => p.monthly > 0 && TOOL_BRANDS.find((b) => b.id === p.brandId)?.exact === false,
  );
  return hasCounted ? BRANDS_HONEST_LINE : undefined;
}

/** The question a brand's spend card follows (ruler and typed limits). */
export function questionForBrand(brand: ToolBrand) {
  return SPEND_QUESTIONS.find((q) => q.key === brand.key);
}
