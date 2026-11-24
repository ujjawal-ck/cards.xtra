/**
 * useCards — Home card list from BankKaro CardGenius.
 *
 * Fetches the full catalog once (TanStack Query caches it per queryClient
 * defaults), filters to active cards (`status: true`), and maps each to the
 * app's CardModel via the shared mapper.
 *
 * Which cards the app shows is decided by ONE rule, `isCardShown` in
 * src/api/cardRates.ts (owner rule D-A, 2026-11-24, mapped only): a card shows
 * only when it matches a CashKaro card-rate store row. Never a fallback to
 * unmapped cards. In production on 2026-11-24, 161 of 281 cards matched.
 * `useCards()` returns the shown cards. Input pickers (the user picks a card
 * they already hold) pass `{ includeUnmapped: true }` for every active card.
 * Both read one cached query.
 *
 * Last good card-rate rows (contract Q1, F2): the rows live in their own cache
 * entry (`qk.cards.rateStores`, 10 min fresh, never garbage-collected). A run
 * replaces them only when the call succeeds AND at least one active card
 * matches. A failed call, or one that matches no card, keeps the last good
 * rows. With no last good rows the catalog query throws, so screens show an
 * error with Retry. The entry is cleared with the rest of the cache at
 * sign-in and session end (AuthContext, sessionEnd.ts).
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
  resolveCkRate,
  type CardRateIndex,
} from '../api/cardRates';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { fallbackTo, reportHandled } from '../api/http/report';
import { qk } from './keys';
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
}

// Module-level selects: stable references, so React Query runs them only when the data changes.
const selectShown = (d: CardCatalog): CardModel[] => d.shown;
const selectAll = (d: CardCatalog): CardModel[] => d.all;

/** How long the card-rate rows stay fresh: a catalog run inside this window does not call CashKaro again. */
export const CARD_RATE_STALE_MS = 10 * 60 * 1000;

/** The active BankKaro rows: the catalogue the card rule runs on. */
function activeRows(cardsRes: any): BkCard[] {
  const list: BkCard[] = Array.isArray(cardsRes?.data) ? cardsRes.data : [];
  return list.filter((c) => c?.status === true);
}

/**
 * The card-rate rows for this run. A good run (the call succeeds and at least
 * one active card matches) replaces the cached rows. A failed run, or one that
 * matches no card, throws inside the query function, so React Query keeps the
 * last good rows; this returns them. With none, it throws.
 */
async function fetchRateRows(queryClient: QueryClient, cardsP: Promise<any>): Promise<any[]> {
  try {
    return await queryClient.fetchQuery({
      queryKey: qk.cards.rateStores,
      queryFn: async () => {
        const [rows, cardsRes] = await Promise.all([getCardRateStores(), cardsP]);
        const index = buildCardRateIndex(rows);
        if (!activeRows(cardsRes).some((c) => isCardShown(c, index))) {
          throw new Error(`card-rate rows match no card (${index.size} rows)`);
        }
        return rows;
      },
      staleTime: CARD_RATE_STALE_MS,
      gcTime: Infinity,
      // The transport already retries a failed page; a zero-match run is not retried.
      retry: false,
    });
  } catch (error) {
    // A failed cards call fails the catalog anyway: nothing to keep or report here.
    if (await cardsP.then(() => false, () => true)) throw error;
    const last = queryClient.getQueryData<any[]>(qk.cards.rateStores);
    if (!last) throw error;
    reportHandled(error, 'ck card-rate stores (kept the last good rows)');
    return last;
  }
}

/** One catalog run. Exported for tests. */
export async function fetchCatalog(queryClient: QueryClient): Promise<CardCatalog> {
  // Cards + the bank directory + the CashKaro card-store rates, in parallel.
  // The directory (bank names + logos) comes from the init-bundle and fails
  // soft (static names). The rates come from CashKaro (the displayed reward is
  // CashKaro's only, and they decide which cards show — see cardRates.ts); they
  // fall back to the last good rows, else the catalog fails (fetchRateRows).
  // staleTime 0: each useCards fetch (mount, focus refetch) downloads the cards
  // again, as before; a raw fetch already in flight (useCardTags) is joined.
  const cardsP = queryClient.fetchQuery({ queryKey: rawCardsQueryKey, queryFn: getCards, staleTime: 0 });
  const [cardsRes, initRes, rateStores] = await Promise.all([
    cardsP,
    initBundle().catch(fallbackTo(null, 'bk init-bundle (bank directory)')),
    fetchRateRows(queryClient, cardsP),
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
  const all: CardModel[] = [];
  const shown: CardModel[] = [];
  for (const c of active) {
    const card = mapBkCardToCardModel(c, bankDir, resolveCkRate(c.ck_store_id, c.name, rateIndex));
    all.push(card);
    if (isCardShown(c, rateIndex)) shown.push(card);
  }
  return { all, shown };
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
