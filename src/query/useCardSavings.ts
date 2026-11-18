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
 * row. A calculate row with no app card is dropped, because the app cannot
 * open or apply for it.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateSavings } from '../api/bankkaro';
import { contract } from '../api/schemas/validate';
import { CalculateResponse } from '../api/schemas/calculate';
import type { CalculateSpends } from '../api/types';
import type { CardModel } from '../molecules';
import {
  hasAnySpend,
  mapCalculateResponse,
  rankByNetValue,
  spendsKey,
  type CardSavings,
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

export interface ToolCard {
  /** 1-based position after ranking and the join. */
  rank: number;
  card: CardModel;
  savings: CardSavings;
}

export interface UseCardSavingsResult {
  /** Ranked by net yearly value. Only cards the app lists. Empty until loaded. */
  ranked: ToolCard[];
  /**
   * true while the cards list or the calculate call has no data and is fetching.
   * false while paused offline (see `isOffline`).
   */
  isLoading: boolean;
  /**
   * true when the hook is enabled, has no result yet, and the cards list or the
   * calculate call is paused because the phone is offline. React Query resumes
   * the call by itself when the phone is back online. `ranked` is empty here,
   * and that does NOT mean "no card saves you money".
   */
  isOffline: boolean;
  /** true when the calculate call (or the cards list) failed for good. */
  isError: boolean;
  refetch: () => void;
  /**
   * How long the calculate call took, for analytics. Set only when this hook
   * instance saw the call finish; undefined for a cached result.
   */
  loadMs?: number;
}

/** Pass null (or an all-zero profile) to keep the hook idle. */
export function useCardSavings(spends: CalculateSpends | null): UseCardSavingsResult {
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
    staleTime: CALCULATE_STALE_MS,
    // calculateSavings already retries once in the transport; no second layer here.
    retry: false,
  });

  const ranked = useMemo<ToolCard[]>(() => {
    const list = calc.data?.list;
    const appCards = cards.data;
    if (!list || !appCards) return [];
    const byAlias = new Map<string, CardModel>();
    const byId = new Map<string, CardModel>();
    for (const card of appCards) {
      const alias = card.filterMeta?.cardAlias;
      if (alias && !byAlias.has(alias)) byAlias.set(alias, card);
      if (card.id && !byId.has(card.id)) byId.set(card.id, card);
    }
    // Pass 1: alias. Pass 2: id, only for rows still without a card. One app
    // card joins at most one row, and an alias match always beats an id match.
    const used = new Set<CardModel>();
    const matched = new Map<CardSavings, CardModel>();
    for (const savings of list) {
      const card = byAlias.get(savings.alias);
      if (card && !used.has(card)) {
        used.add(card);
        matched.set(savings, card);
      }
    }
    for (const savings of list) {
      if (matched.has(savings) || !savings.id) continue;
      const card = byId.get(savings.id);
      if (card && !used.has(card)) {
        used.add(card);
        matched.set(savings, card);
      }
    }
    const out: ToolCard[] = [];
    for (const savings of list) {
      const card = matched.get(savings);
      if (card) out.push({ rank: out.length + 1, card, savings });
    }
    return out;
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
  const hasResult = calc.data !== undefined && cards.data !== undefined;
  const paused = cards.fetchStatus === 'paused' || calc.fetchStatus === 'paused';
  const isOffline = enabled && !hasResult && paused;
  const pendingActive = (q: { isPending: boolean; fetchStatus: string }) =>
    q.isPending && q.fetchStatus !== 'paused';
  const isLoading = enabled && !isOffline && (pendingActive(cards) || pendingActive(calc));

  return {
    ranked,
    isLoading,
    isOffline,
    isError: enabled && (cards.isError || calc.isError),
    refetch,
    // A cached result keeps the first call's duration; report it only for a
    // call this instance saw finish.
    loadMs: calc.isSuccess && calc.isFetchedAfterMount ? calc.data?.loadMs : undefined,
  };
}
