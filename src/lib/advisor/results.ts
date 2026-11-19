/** Advisor results page: pick the cards of a route, then filter and sort them. Pure. */
import type { CardModel } from '../../molecules';
import { sortCards } from '../../data/filterOptions';

export type ResultsSort = 'recommended' | 'fee';

/** The cards of `cardIds`, in that order. An id that is not in `cards` is skipped. */
export function pickCards(cards: CardModel[], cardIds: string[]): CardModel[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: CardModel[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (!card || seen.has(id)) continue;
    seen.add(id);
    out.push(card);
  }
  return out;
}

/** The list to show. `freeOnly` keeps cards with no joining and no annual fee. Never mutates `list`. */
export function buildResults(list: CardModel[], sort: ResultsSort, freeOnly: boolean): CardModel[] {
  const kept = freeOnly ? list.filter((c) => c.filterMeta?.isFree === true) : list;
  return sort === 'fee' ? sortCards(kept, 'annualFeeAsc') : kept.slice();
}

/** True when the list has a free card and a paid card, so "free only" changes something. */
export function hasFreeAndPaid(list: CardModel[]): boolean {
  const free = list.some((c) => c.filterMeta?.isFree === true);
  const paid = list.some((c) => c.filterMeta?.isFree !== true);
  return free && paid;
}
