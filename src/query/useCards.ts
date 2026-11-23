/**
 * useCards — Home card list from BankKaro CardGenius.
 *
 * Fetches the full catalog once (TanStack Query caches it per queryClient
 * defaults), filters to active cards (`status: true` — ~159 of 184), and
 * maps each to the app's CardModel via the shared mapper.
 *
 * Which cards the app shows is decided by ONE rule, `isCardShown` in
 * src/api/cardRates.ts ("filter once mapped", decision 2026-11-23): once at
 * least one card matches a CashKaro store row, only the matched cards; until
 * then, the cards with a CashKaro amount or a BankKaro commission (internal,
 * never displayed), as before. `useCards()` returns the shown cards. Input
 * pickers (the user picks a card they already hold) pass
 * `{ includeUnmapped: true }` for every active card. Both read one cached query.
 */
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getCards, initBundle } from '../api/bankkaro';
import { getCardRateStores } from '../api/cashkaro';
import {
  mapBkCardToCardModel,
  buildBankDirectory,
  type BankDirectory,
  type BkCard,
} from '../api/cardMapper';
import {
  buildCardRateIndex,
  isCardShown,
  isCkFilterOn,
  resolveCkRate,
  type CardRateIndex,
} from '../api/cardRates';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { fallbackTo } from '../api/http/report';
import type { CardModel } from '../molecules';

export const cardsQueryKey = ['bk', 'cards'] as const;

/** The raw /cardgenius/cards response (every row). useCardTags reads it too, so both share one download. */
export const rawCardsQueryKey = ['bk', 'cards', 'raw'] as const;

/** What the cards query caches. Plain arrays only, so React Query's structural sharing keeps references. */
export interface CardCatalog {
  /** Every active card, mapped. Input pickers use this. */
  all: CardModel[];
  /** The cards the app shows (isCardShown). */
  shown: CardModel[];
  /** true when at least one card matches a CashKaro store row (isCkFilterOn). */
  filterOn: boolean;
}

// Module-level selects: stable references, so React Query runs them only when the data changes.
const selectShown = (d: CardCatalog): CardModel[] => d.shown;
const selectAll = (d: CardCatalog): CardModel[] => d.all;

async function fetchCatalog(queryClient: QueryClient): Promise<CardCatalog> {
  // Cards + the bank directory + the CashKaro card-store rates, in parallel.
  // The directory (bank names + logos) comes from the init-bundle; the rates
  // come from CashKaro (the displayed reward is CashKaro's only — see
  // cardRates.ts). Each side fails soft: a missing directory falls back to
  // static names; missing rates leave the index empty (filter off), so no
  // card shows an amount. The card list still loads either way.
  const [cardsRes, initRes, rateStores] = await Promise.all([
    // staleTime 0: each useCards fetch (mount, focus refetch) downloads again,
    // as before; a raw fetch already in flight (useCardTags) is joined.
    queryClient.fetchQuery({ queryKey: rawCardsQueryKey, queryFn: getCards, staleTime: 0 }),
    initBundle().catch(fallbackTo(null, 'bk init-bundle (bank directory)')),
    getCardRateStores().catch(fallbackTo([] as any[], 'ck card-rate stores')),
  ]);
  const list: BkCard[] = Array.isArray(cardsRes?.data) ? cardsRes.data : [];
  return buildCardCatalog(list, buildBankDirectory(initRes), buildCardRateIndex(rateStores));
}

/** Raw BankKaro rows → the cached catalog: active cards only, mapped, and the shown subset. */
export function buildCardCatalog(
  list: BkCard[],
  bankDir: BankDirectory,
  rateIndex: CardRateIndex,
): CardCatalog {
  const active = (list ?? []).filter((c) => c?.status === true);
  const filterOn = isCkFilterOn(rateIndex, active);
  const all: CardModel[] = [];
  const shown: CardModel[] = [];
  for (const c of active) {
    const card = mapBkCardToCardModel(c, bankDir, resolveCkRate(c.ck_store_id, c.name, rateIndex));
    all.push(card);
    if (isCardShown(c, rateIndex, filterOn)) shown.push(card);
  }
  return { all, shown, filterOn };
}

/** The whole cached catalog, for a caller that needs both lists (useCardSavings). */
export function useCardCatalog() {
  const queryClient = useQueryClient();
  const query = useQuery<CardCatalog>({
    queryKey: cardsQueryKey,
    queryFn: () => fetchCatalog(queryClient),
  });
  useRefetchOnFocus(query);
  return query;
}

/**
 * The cards the app shows (isCardShown). `includeUnmapped: true` returns every
 * active card instead: only for input pickers, never for a list of cards we sell.
 */
export function useCards(opts?: { includeUnmapped?: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery<CardCatalog, Error, CardModel[]>({
    queryKey: cardsQueryKey,
    queryFn: () => fetchCatalog(queryClient),
    select: opts?.includeUnmapped ? selectAll : selectShown,
  });
  // Refresh the catalog when the screen regains focus. The list stays on screen
  // during the background refetch, so there's no flash.
  useRefetchOnFocus(query);
  return query;
}
