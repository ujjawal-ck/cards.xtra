/**
 * Closest cards — what Home shows when the applied filters leave 0 cards.
 *
 * 1 to 3 matching cards are NOT a dead end: they show as they are. Only an
 * exact 0 comes here. The rule: drop as FEW filter dimensions as possible, and
 * among equal choices drop the one a user cares least about first. The result
 * is never empty while the catalogue has a card.
 *
 * Pure. No rates, no "best": the copy only says what matched and what was set aside.
 */
import type { CardModel } from '../molecules';
import {
  ANNUAL_FEE_BUCKETS,
  CATEGORY_OPTIONS,
  EMPTY_FILTERS,
  TRAIT_OPTIONS,
  applyFilters,
  type AppliedFilters,
} from '../data/filterOptions';

export type FilterDim = 'categoryTagIds' | 'feeBucketIndices' | 'networks' | 'bankNames' | 'traits';

/** First to drop → last to drop. The category is the user's explicit tap on the
 *  carousel, so it survives longest. (Product choice: yours to change.) */
export const DROP_ORDER: FilterDim[] = ['traits', 'networks', 'bankNames', 'feeBucketIndices', 'categoryTagIds'];

/** Order the parts read in a sentence. */
const SENTENCE_ORDER: FilterDim[] = ['categoryTagIds', 'feeBucketIndices', 'networks', 'bankNames', 'traits'];

export interface ClosestCards {
  /** The filters that gave `cards` (the applied ones minus the dropped dimensions). */
  applied: AppliedFilters;
  /** Dimensions set aside. Empty when the applied filters already match a card. */
  dropped: FilterDim[];
  cards: CardModel[];
}

const isActive = (f: AppliedFilters, d: FilterDim) => f[d].length > 0;

/** All subsets of `items` with exactly k members, in list order. */
function combos<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combos(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

export function closestCards(catalogue: CardModel[], applied: AppliedFilters): ClosestCards {
  const exact = applyFilters(catalogue, applied);
  if (exact.length > 0) return { applied, dropped: [], cards: exact };
  const active = DROP_ORDER.filter((d) => isActive(applied, d));
  for (let k = 1; k <= active.length; k += 1) {
    for (const drop of combos(active, k)) {
      const next = drop.reduce<AppliedFilters>((f, d) => ({ ...f, [d]: [] }), applied);
      const cards = applyFilters(catalogue, next);
      if (cards.length > 0) return { applied: next, dropped: drop, cards };
    }
  }
  // Every dimension dropped and still nothing: the catalogue itself is empty.
  return { applied: EMPTY_FILTERS, dropped: active, cards: catalogue };
}

function feeLabel(indices: number[]): string {
  const sorted = [...indices].sort((a, b) => a - b);
  const fromZero = sorted.every((v, i) => v === i);
  if (fromZero) {
    const top = sorted[sorted.length - 1];
    if (top === 0) return 'Lifetime free';
    if (top === 1) return 'Up to ₹1,000 a year';
    if (top === 2) return 'Up to ₹2,000 a year';
    if (top === 3) return 'Up to ₹5,000 a year';
  }
  return sorted.map((i) => ANNUAL_FEE_BUCKETS[i]?.label).filter(Boolean).join(' or ');
}

/** One short phrase for a dimension, or null when it is not active. */
export function describeDim(f: AppliedFilters, d: FilterDim): string | null {
  if (!isActive(f, d)) return null;
  switch (d) {
    case 'categoryTagIds':
      return CATEGORY_OPTIONS.filter((o) => f.categoryTagIds.includes(o.tagId)).map((o) => o.label).join(' or ') || null;
    case 'feeBucketIndices':
      return feeLabel(f.feeBucketIndices) || null;
    case 'networks':
      return f.networks.join(' or ');
    case 'bankNames':
      return f.bankNames.join(' or ');
    case 'traits':
      return TRAIT_OPTIONS.filter((o) => f.traits.includes(o.id)).map((o) => o.short).join(' · ') || null;
  }
}

const parts = (f: AppliedFilters, dims: FilterDim[]): string[] =>
  SENTENCE_ORDER.filter((d) => dims.includes(d))
    .map((d) => describeDim(f, d))
    .filter((x): x is string => !!x);

/** Copy for the no-match state. `applied` are the filters the user has on. */
export function fallbackCopy(applied: AppliedFilters, dropped: FilterDim[]): { title: string; body: string } {
  const all = SENTENCE_ORDER.filter((d) => isActive(applied, d));
  const wanted = parts(applied, all);
  const title = wanted.length > 0 && wanted.length <= 3 ? `No exact match for ${wanted.join(' · ')}` : 'No card matches all your filters';
  const kept = parts(applied, all.filter((d) => !dropped.includes(d)));
  const aside = parts(applied, dropped);
  if (kept.length === 0) return { title, body: 'Here are our top cards instead.' };
  return { title, body: `Closest cards for ${kept.join(' · ')}. We set aside ${aside.join(' · ')}.` };
}
