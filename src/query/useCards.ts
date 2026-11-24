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
 * error with Retry. The entry survives the cache clear at sign-in, sign-out
 * and session end (clearQueryCache in queryClient.ts): public data, kept for
 * the app session. A no-match failure is never retried (catalogRetry), and a
 * covered card-rate failure is reported once until the next good run.
 */
import { isCancelledError, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getCards, initBundle } from '../api/bankkaro';
import { CardRateShortListError, getCardRateStores } from '../api/cashkaro';
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
import { defaultQueryRetry } from './queryClient';
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

/**
 * The card-rate rows loaded but matched no active card, and no last good rows
 * exist. Not a network or server failure: screens use their own copy for it.
 */
export class NoMappedCardsError extends Error {
  constructor(rowCount: number) {
    super(`card-rate rows match no card (${rowCount} rows)`);
    this.name = 'NoMappedCardsError';
  }
}

/** True when the cards query failed because no card matched (NoMappedCardsError). */
export function isNoMappedCardsError(error: unknown): boolean {
  return error instanceof NoMappedCardsError;
}

/**
 * The catalog query's retry: never a NoMappedCardsError (a second run would
 * download the whole BankKaro list again for the same answer); any other error
 * as the app default (defaultQueryRetry).
 */
export function catalogRetry(failureCount: number, error: unknown): boolean {
  if (isNoMappedCardsError(error)) return false;
  return defaultQueryRetry(failureCount, error);
}

/**
 * A card-rate failure covered by the last good rows is reported once until the
 * next good run, so an outage does not send one Crashlytics non-fatal per
 * catalog run. The CashKaro call itself still runs on every stale run.
 */
let rateFailureReported = false;

/** Tests only: forget that a card-rate failure was reported. */
export function __resetCardRateReport(): void {
  rateFailureReported = false;
}

/** The active BankKaro rows: the catalogue the card rule runs on. */
function activeRows(cardsRes: any): BkCard[] {
  const list: BkCard[] = Array.isArray(cardsRes?.data) ? cardsRes.data : [];
  return list.filter((c) => c?.status === true);
}

/**
 * The card-rate rows for this run. A good run (the call succeeds and at least
 * one active card matches) replaces the cached rows. A failed run, or one that
 * matches no card, throws inside the query function, so React Query keeps the
 * last good rows; this returns them. With none, it throws, except:
 *   - a short list (CardRateShortListError) with no last good rows returns the
 *     short rows (a short list hides some cards, a throw hides all). They are
 *     never saved as last good.
 *   - a cancelled fetch (the cache clear at sign-in or session end) is no
 *     card-rate failure: never reported, and the report flag stays as it is.
 */
async function fetchRateRows(queryClient: QueryClient, cardsP: Promise<any>): Promise<any[]> {
  try {
    return await queryClient.fetchQuery({
      queryKey: qk.cards.rateStores,
      queryFn: async () => {
        const [rows, cardsRes] = await Promise.all([getCardRateStores(), cardsP]);
        const index = buildCardRateIndex(rows);
        if (!activeRows(cardsRes).some((c) => isCardShown(c, index))) {
          throw new NoMappedCardsError(index.size);
        }
        rateFailureReported = false; // a good run: the next failure is reported again
        return rows;
      },
      staleTime: CARD_RATE_STALE_MS,
      gcTime: Infinity,
      // No retry here: the transport already retries a failed page, and a
      // zero-match run is no transient failure. The catalog query (catalogRetry)
      // re-runs a network failure once, never a zero-match.
      retry: false,
    });
  } catch (error) {
    // A failed cards call fails the catalog anyway: nothing to keep or report here.
    if (await cardsP.then(() => false, () => true)) throw error;
    const last = queryClient.getQueryData<any[]>(qk.cards.rateStores);
    const short = error instanceof CardRateShortListError ? error : null;
    const rows = last ?? short?.rows;
    if (!rows) throw error;
    if (!isCancelledError(error) && !rateFailureReported) {
      rateFailureReported = true;
      reportHandled(
        error,
        last
          ? 'ck card-rate stores (kept the last good rows)'
          : `ck card-rate stores (short list: ${short?.rows.length} of ${short?.total} rows)`,
      );
    }
    return rows;
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

/** The catalog query options both hooks use (one key, one query function, catalogRetry). */
export function catalogQueryOptions(queryClient: QueryClient) {
  return {
    queryKey: cardsQueryKey,
    queryFn: () => fetchCatalog(queryClient),
    retry: catalogRetry,
  };
}

/** The whole cached catalog, for a caller that needs both lists (useCardSavings). */
export function useCardCatalog() {
  const queryClient = useQueryClient();
  const query = useQuery<CardCatalog>(catalogQueryOptions(queryClient));
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
    ...catalogQueryOptions(queryClient),
    select: opts?.includeUnmapped ? selectAll : selectShown,
  });
  // Refresh the catalog when the screen regains focus. The list stays on screen
  // during the background refetch, so there's no flash.
  useRefetchOnFocus(query);
  return query;
}
