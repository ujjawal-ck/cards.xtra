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
 * `card` set only when the join finds one. It needs only the calculate call:
 * while the cards list loads, or when it fails, rows come without `card`.
 * `isLoading`, `isOffline` and `isError` follow the calculate call only.
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
import { useCards } from './useCards';

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
   * true while the calculate call has no data and is fetching.
   * false while paused offline (see `isOffline`).
   */
  isLoading: boolean;
  /**
   * true when the hook is enabled, has no result yet, and the calculate call is
   * paused because the phone is offline. React Query resumes the call by itself
   * when the phone is back online. `league` is empty here, and that does NOT
   * mean "no card saves you money".
   */
  isOffline: boolean;
  /** true when the calculate call failed for good. A failed cards list only leaves `card` unset. */
  isError: boolean;
  refetch: () => void;
  /**
   * How long the calculate call took, for analytics. Set only when this hook
   * instance saw the call finish; undefined for a cached result.
   */
  loadMs?: number;
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
  const cards = useCards();

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
    return buildLeague(list, cards.data, SHOW_CARDS_NOT_IN_APP);
  }, [calc.data, cards.data]);

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

  // Offline: App.js wires NetInfo into onlineManager and the network mode is
  // 'online', so a query with no data is PAUSED (isPending, fetchStatus
  // 'paused'). v5 `isLoading` is false then, so it cannot be used here.
  // The cards list does not gate these flags: the league shows without it.
  const isOffline = enabled && calc.data === undefined && calc.fetchStatus === 'paused';
  const isLoading = enabled && !isOffline && calc.isPending && calc.fetchStatus !== 'paused';

  return {
    league,
    isLoading,
    isOffline,
    isError: enabled && calc.isError,
    refetch,
    // A cached result keeps the first call's duration; report it only for a
    // call this instance saw finish.
    loadMs: calc.isSuccess && calc.isFetchedAfterMount ? calc.data?.loadMs : undefined,
  };
}
