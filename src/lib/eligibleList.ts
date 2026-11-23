/**
 * eligibleList — pure list builder for the "Cards you can get" screen
 * (rejection flow, part B). No React. Takes the rejected card, the catalogue and
 * the aliases the user can get, and returns the "closest" row, the filtered and
 * sorted full list, the eligible count and the category preset.
 *
 * Eligible = alias is in `eligibleAliases`, not the rejected card, not invite-only.
 * Cards without `crossSell` cannot be scored: they never reach `closest` and they
 * come last in every sort, but they are still listed (and filterable by `card.tags`).
 *
 * Imports no token barrel (jest cannot load it).
 */
import type { CardModel } from '../molecules/CardTile';
import { bandIdx, isLtf, rankReward } from './crossSell';
import type { CrossSellCard } from './crossSell';

import { contextTag, similarityTo } from './rejection';

export type EligibleSort = 'closest' | 'reward' | 'fee';
export type ReasonKind = 'income' | 'employment' | 'other';
export type ContextTag = ReturnType<typeof contextTag>;

export interface EligibleItem {
  /** CardModel.id */
  id: string;
  alias: string;
  tag: ContextTag;
}

export interface EligibleListInput {
  rejected: CardModel;
  cards: CardModel[];
  eligibleAliases: string[];
  /** Selected category (tag) names. Empty = all. A card passes if it has ANY of them. */
  categories: string[];
  lifetimeFreeOnly: boolean;
  sort: EligibleSort;
  reasonKind?: ReasonKind;
}

export interface EligibleListResult {
  closest: EligibleItem[];
  all: EligibleItem[];
  /** Every eligible card, before category / lifetime-free filters. */
  count: number;
  /** The rejected card's tags that at least one eligible card shares. */
  presetCategories: string[];
}

export const CLOSEST_MAX = 5;
const FALLBACK_TAG: ContextTag = { text: 'You can get this card', tone: 'success' };

const aliasOf = (c: CardModel): string | undefined => c.crossSell?.alias ?? c.filterMeta?.cardAlias;
const tagsOf = (c: CardModel): string[] => c.crossSell?.tags ?? c.tags;
const isInviteOnly = (c: CardModel): boolean => !!(c.inviteOnly || c.crossSell?.inviteOnly);
const isFree = (c: CardModel): boolean => (c.crossSell ? isLtf(c.crossSell) : c.feeType === 'lifetime-free');
/** Same as the cross-sell engine: the higher of joining and annual fee. */
const feeOf = (c: CrossSellCard): number => Math.max(c.joiningFee, c.annualFee);

/** Eligible cards: in the alias list, not the rejected card, not invite-only. */
function eligiblePool(rejected: CardModel, cards: CardModel[], eligibleAliases: string[]): CardModel[] {
  const set = new Set(eligibleAliases);
  return cards.filter((c) => {
    if (c.id === rejected.id) return false;
    const alias = aliasOf(c);
    return !!alias && set.has(alias) && !isInviteOnly(c);
  });
}

/** How many cards the screen lists with no filters. The sheet's "See all N" uses this too. */
export function countEligible(rejected: CardModel, cards: CardModel[], eligibleAliases: string[]): number {
  return eligiblePool(rejected, cards, eligibleAliases).length;
}

export function presetCategoriesFor(rejected: CardModel, pool: CardModel[]): string[] {
  const shared = new Set<string>();
  pool.forEach((c) => tagsOf(c).forEach((t) => shared.add(t)));
  return Array.from(new Set(tagsOf(rejected))).filter((t) => shared.has(t));
}

/** Same list as `buildEligibleList(...).presetCategories`, without building the rest. */
export function presetCategories(rejected: CardModel, cards: CardModel[], eligibleAliases: string[]): string[] {
  return presetCategoriesFor(rejected, eligiblePool(rejected, cards, eligibleAliases));
}

/**
 * Category chips for the filter row: the preset first, then the tags most eligible
 * cards carry (ties: A to Z). Capped at `max`, but the preset is never cut.
 */
export function categoryChips(
  rejected: CardModel,
  cards: CardModel[],
  eligibleAliases: string[],
  max = 8,
): string[] {
  const pool = eligiblePool(rejected, cards, eligibleAliases);
  const preset = presetCategoriesFor(rejected, pool);
  const freq: Record<string, number> = {};
  pool.forEach((c) => Array.from(new Set(tagsOf(c))).forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
  const rest = Object.keys(freq)
    .filter((t) => preset.indexOf(t) === -1)
    .sort((a, b) => freq[b] - freq[a] || a.localeCompare(b));
  return preset.concat(rest.slice(0, Math.max(0, max - preset.length)));
}

export function buildEligibleList(input: EligibleListInput): EligibleListResult {
  const { rejected, cards, eligibleAliases, categories, lifetimeFreeOnly, sort, reasonKind } = input;
  const pool = eligiblePool(rejected, cards, eligibleAliases);
  const src = rejected.crossSell;
  // rejection.ts reads only `kind` here; `lines` are for the sheet, not for tags.
  const reason = reasonKind ? { kind: reasonKind, lines: [] as string[] } : undefined;

  const catalogue = cards.map((c) => c.crossSell).filter((c): c is CrossSellCard => !!c);
  const simOf = src ? similarityTo(src, catalogue) : () => 0;
  const sim = (c: CardModel): number => (c.crossSell ? simOf(c.crossSell) : 0);
  const bandGap = (c: CardModel): number => (src && c.crossSell ? Math.abs(bandIdx(c.crossSell) - bandIdx(src)) : 0);
  // Sort on the internal value (CashKaro rate, else commission), as before the
  // 2026-11-23 display change: the displayed reward is CashKaro-only and is
  // empty until CashKaro maps card stores.
  const reward = (c: CardModel): number => (c.crossSell ? rankReward(c.crossSell) : 0);

  const toItem = (c: CardModel): EligibleItem => ({
    id: c.id,
    alias: aliasOf(c) as string,
    tag: src && c.crossSell ? contextTag(src, c.crossSell, reason, catalogue) : FALLBACK_TAG,
  });

  // Closest: top by similarity, ties nearer fee band then higher reward, one per bank.
  const closest: EligibleItem[] = [];
  if (src) {
    const banks = new Set<string>();
    pool
      .filter((c) => !!c.crossSell)
      .sort((a, b) => sim(b) - sim(a) || bandGap(a) - bandGap(b) || reward(b) - reward(a))
      .forEach((c) => {
        const bank = (c.crossSell as CrossSellCard).bank;
        if (closest.length >= CLOSEST_MAX || banks.has(bank)) return;
        banks.add(bank);
        closest.push(toItem(c));
      });
  }

  // All: filters, then the chosen sort. Cards without crossSell go last.
  const filtered = pool.filter((c) => {
    if (categories.length && !tagsOf(c).some((t) => categories.indexOf(t) !== -1)) return false;
    if (lifetimeFreeOnly && !isFree(c)) return false;
    return true;
  });
  const compare = (a: CardModel, b: CardModel): number => {
    if (!a.crossSell || !b.crossSell) return Number(!a.crossSell) - Number(!b.crossSell);
    if (sort === 'reward') return reward(b) - reward(a) || sim(b) - sim(a);
    if (sort === 'fee') return feeOf(a.crossSell) - feeOf(b.crossSell) || reward(b) - reward(a) || sim(b) - sim(a);
    return sim(b) - sim(a) || bandGap(a) - bandGap(b) || reward(b) - reward(a);
  };
  const all = filtered.slice().sort(compare).map(toItem);

  return { closest, all, count: countEligible(rejected, cards, eligibleAliases), presetCategories: presetCategoriesFor(rejected, pool) };
}
