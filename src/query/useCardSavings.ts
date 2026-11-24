/**
 * useCardSavings: one BankKaro `calculate` call for a spend profile, mapped,
 * ranked and joined to the app's own cards.
 *
 * Every card tool reads its result from this hook, keyed by the spend profile,
 * so two screens with the same spends share one call. Screens pass only the
 * spends through navigation, never the result.
 *
 * Join rule: name, art, fees text, Rewards and the Apply link come from the
 * app card (useCards). Only the savings numbers come from `calculate`. A row
 * joins by alias first, then by BankKaro id; one app card joins at most one
 * row (`joinAppCards` in src/lib/cardTools.ts).
 *
 * `league`: every calculate row in rank order (SHOW_CARDS_NOT_IN_APP), with
 * `card` set only when the join finds one. While the cards list loads, or when
 * it fails, rows come without `card`.
 * `isLoading` and `isOffline` wait for BOTH calls: the card rule (mapped only)
 * cannot run before the cards list is known, so the screens never show a
 * league row while it loads. `isError` follows the calculate call only.
 * `cardsError` is the cards list failing with nothing cached: screens show an
 * error for it, because the league cannot apply the card rule without it.
 *
 * The join uses EVERY active app card, not only the shown ones: the Beat my
 * card picker lists the league, and the user's own card is an input, not a
 * card we sell. The league is never narrowed here. Screens that list cards to
 * sell apply the card rule for display with `shown` (leagueForDisplay in
 * src/api/cardRates.ts).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateSavings } from '../api/bankkaro';
import { contract } from '../api/schemas/validate';
import { CalculateResponse } from '../api/schemas/calculate';
import type { CalculateSpends } from '../api/types';
import type { CardModel } from '../molecules';
import {
  buildLeague,
  hasAnySpend,
  mapCalculateResponse,
  rankByNetValue,
  spendsKey,
  SHOW_CARDS_NOT_IN_APP,
  type CardSavings,
  type LeagueRowOf,
} from '../lib/cardTools';
import { isNoMappedCardsError, useCardCatalog } from './useCards';
import type { ShownCards } from '../api/cardRates';

/** What the calculate query caches: the ranked list and how long the call took. */
interface CalculateResult {
  list: CardSavings[];
  loadMs: number;
}

/** Long enough that going back and forward between tool screens does not refetch. */
const CALCULATE_STALE_MS = 10 * 60 * 1000;

const nowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/** One league row: every calculate row, `card` set when the app lists the card. */
export type LeagueRow = LeagueRowOf<CardModel>;

export interface UseCardSavingsResult {
  /** Every calculate row in rank order. `card` is set only when the join finds one. Empty until loaded. */
  league: LeagueRow[];
  /**
   * The app cards the card rule shows (isCardShown), for display only
   * (leagueForDisplay). null while the cards list is not known (loading or
   * failed).
   */
  shown: ShownCards | null;
  /**
   * true while the calculate call or the cards list has no data and is
   * fetching (the cards list until it resolves or fails).
   * false while paused offline (see `isOffline`).
   */
  isLoading: boolean;
  /**
   * true when the hook is enabled, and the calculate call or the cards list has
   * no result yet and is paused because the phone is offline. React Query
   * resumes the call by itself when the phone is back online. `league` is
   * empty here, and that does NOT mean "no card saves you money".
   */
  isOffline: boolean;
  /** true when the calculate call failed for good. A failed cards list only leaves `card` unset. */
  isError: boolean;
  /**
   * true when the cards list failed AND no cards are cached (cardsQueryFailed).
   * A failed background refetch keeps the cached list, so this stays false.
   */
  cardsError: boolean;
  /**
   * true when `cardsError` is because no card matched a CashKaro store row
   * (NoMappedCardsError), not a network or server failure. Screens pick the copy.
   */
  cardsNoMatch: boolean;
  refetch: () => void;
  /**
   * How long the calculate call took, for analytics. Set only when this hook
   * instance saw the call finish; undefined for a cached result.
   */
  loadMs?: number;
}

/**
 * The cards query failed and has no data. Never bare `isError`: a failed
 * background refetch keeps the last list, and must not replace a working league.
 */
export function cardsQueryFailed(q: { isError: boolean; data?: unknown }): boolean {
  return q.isError && !q.data;
}

/** The query fields the loading flags read (a v5 query result fits). */
interface QueryStatusInput {
  data?: unknown;
  isPending: boolean;
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

/**
 * The loading and offline flags of useCardSavings. Both calls gate them: the
 * calculate call and the cards list (the card rule needs the shown set).
 * Offline: App.js wires NetInfo into onlineManager and the network mode is
 * 'online', so a query with no data is PAUSED (isPending, fetchStatus
 * 'paused'). v5 `isLoading` is false then, so it cannot be used here.
 */
export function savingsFlags(
  enabled: boolean,
  calc: QueryStatusInput,
  cards: QueryStatusInput,
): { isLoading: boolean; isOffline: boolean } {
  const paused = (q: QueryStatusInput) => q.data === undefined && q.fetchStatus === 'paused';
  const loading = (q: QueryStatusInput) => q.isPending && q.fetchStatus !== 'paused';
  const isOffline = enabled && (paused(calc) || paused(cards));
  return { isOffline, isLoading: enabled && !isOffline && (loading(calc) || loading(cards)) };
}

/**
 * Pass null (or an all-zero profile) to keep the hook idle.
 * `keepForSession`: the result never goes stale and is never dropped while the app runs (the Beat my
 * card picker's probe list, spec 9.3). Every caller of that profile must pass it.
 */
export function useCardSavings(
  spends: CalculateSpends | null,
  opts?: { keepForSession?: boolean },
): UseCardSavingsResult {
  const enabled = spends !== null && hasAnySpend(spends);
  const cards = useCardCatalog();

  const calc = useQuery<CalculateResult>({
    queryKey: ['bk', 'calculate', enabled && spends ? spendsKey(spends) : 'idle'],
    queryFn: async ({ signal }) => {
      const started = nowMs();
      const raw = await calculateSavings(spends as CalculateSpends, signal);
      const loadMs = Math.round(nowMs() - started);
      contract('bk/cardgenius/calculate', CalculateResponse, raw);
      return { list: rankByNetValue(mapCalculateResponse(raw)), loadMs };
    },
    enabled,
    staleTime: opts?.keepForSession ? Infinity : CALCULATE_STALE_MS,
    ...(opts?.keepForSession ? { gcTime: Infinity } : null),
    // calculateSavings already retries once in the transport; no second layer here.
    retry: false,
  });

  const league = useMemo<LeagueRow[]>(() => {
    const list = calc.data?.list;
    if (!list) return [];
    return buildLeague(list, cards.data?.all, SHOW_CARDS_NOT_IN_APP);
  }, [calc.data, cards.data]);

  const catalog = cards.data;
  const shown = useMemo<ShownCards | null>(
    () => (catalog ? { ids: new Set(catalog.shown.map((c) => c.id)) } : null),
    [catalog],
  );

  const calcRefetch = calc.refetch;
  const cardsRefetch = cards.refetch;
  const calcFailed = calc.isError;
  const cardsFailed = cards.isError;
  const refetch = useMemo(
    () => () => {
      // Nothing failed means the call is paused (offline): ask both again, so
      // "Try again" does something as soon as the phone is back online.
      if (cardsFailed || !calcFailed) void cardsRefetch();
      if (calcFailed || !cardsFailed) void calcRefetch();
    },
    [calcFailed, cardsFailed, calcRefetch, cardsRefetch],
  );

  const { isLoading, isOffline } = savingsFlags(enabled, calc, cards);
  const cardsError = cardsQueryFailed(cards);

  return {
    league,
    shown,
    isLoading,
    isOffline,
    isError: enabled && calc.isError,
    cardsError,
    cardsNoMatch: cardsError && isNoMappedCardsError(cards.error),
    refetch,
    // A cached result keeps the first call's duration; report it only for a
    // call this instance saw finish.
    loadMs: calc.isSuccess && calc.isFetchedAfterMount ? calc.data?.loadMs : undefined,
  };
}
