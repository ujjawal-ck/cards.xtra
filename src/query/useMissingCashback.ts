/**
 * useMissingCashback — data + actions for the Missing Cashback claim flow.
 *
 * Reads (useQuery, refresh-on-401 like useOrders):
 *   useRetailers()            — stores to claim against
 *   useExitClickDates(store)  — visit dates + order-id meta for a store
 *   useClaims(tab)            — claims list for a status tab (+ counts)
 *
 * Actions (imperative — the submit flow needs sequential awaits + branching):
 *   useMissingCashbackActions() → { validate, submit, update, raiseTicket,
 *                                   getQueueItem } all bound to the current
 *                                   session, each retrying once on a 401/403.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  getRetailers,
  getExitClickDates,
  getQueue,
  getQueueItem,
  validateClaim,
  submitQueue,
  updateQueue,
  raiseTicket,
  type McExitMeta,
  type McClaim,
  type McTicketData,
  type McTicketFile,
  type McQueueResponse,
} from '../api/missingCashback';
import {
  mapRetailers,
  mapExitClicks,
  mapClaims,
  mapOthersClaims,
  mapRejectedClaims,
  STATUS_TAB_TO_API,
  type RetailerRow,
  type ExitMonthGroup,
  type ClaimCard,
  type OthersClaimCard,
} from '../api/missingCashbackMapper';

export type ClaimTab = 'In Review' | 'Closed' | 'Others';

// ── Reads ────────────────────────────────────────────────────────────────

export function useRetailers() {
  const { accessToken, refreshSession } = useAuth();
  return useQuery<RetailerRow[]>({
    queryKey: ['ck', 'mc', 'retailers', accessToken],
    enabled: !!accessToken,
    // The retailer list grows as the user does click-outs — keep it fresh so
    // newly-visited stores appear when they reopen the screen (the global
    // 5-min staleTime would otherwise serve a stale list).
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      try {
        return mapRetailers(await getRetailers(accessToken as string));
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return mapRetailers(await getRetailers(fresh));
        }
        throw e;
      }
    },
  });
}

export interface ExitDatesResult {
  months: ExitMonthGroup[];
  meta: McExitMeta;
}

export function useExitClickDates(storeId?: string) {
  const { accessToken, refreshSession } = useAuth();
  return useQuery<ExitDatesResult>({
    queryKey: ['ck', 'mc', 'exitdates', storeId, accessToken],
    enabled: !!accessToken && !!storeId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const id = storeId as string;
      const run = async (token: string): Promise<ExitDatesResult> => {
        const res = await getExitClickDates(token, id);
        return { months: mapExitClicks(res), meta: res.meta || {} };
      };
      try {
        return await run(accessToken as string);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return run(fresh);
        }
        throw e;
      }
    },
  });
}

export interface ClaimsResult {
  cards: ClaimCard[];
  /** Populated for the "Others" tab — raised tickets as flat detail rows. */
  othersCards: OthersClaimCard[];
  counts: { pending: number; resolved: number; others: number };
}

export function useClaims(tab: ClaimTab) {
  const { accessToken, refreshSession } = useAuth();
  return useQuery<ClaimsResult>({
    queryKey: ['ck', 'mc', 'claims', tab, accessToken],
    enabled: !!accessToken,
    // Claims change as the user submits/updates — always refetch on open.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const apiStatus = STATUS_TAB_TO_API[tab];

      // "Others" lists raised tickets (those with a Ticket ID) as flat rows.
      // A ticket can come back under any status filter, and the Rejected filter
      // sometimes errors on staging — so we gather across all three and keep
      // whatever succeeds (only failing if EVERY fetch fails → outer catch).
      const runOthers = async (token: string): Promise<ClaimsResult> => {
        const settled = await Promise.allSettled([
          getQueue(token, 'Pending'),
          getQueue(token, 'Resolved'),
          getQueue(token, 'Rejected'),
        ]);
        const fulfilled = settled.filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getQueue>>> => r.status === 'fulfilled',
        );
        if (fulfilled.length === 0) {
          // Surface the first failure so the outer catch can refresh-on-401 /
          // treat "no data" as empty.
          throw (settled.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
        }
        const seen = new Set<string>();
        const claims: McClaim[] = [];
        const counts = { pending: 0, resolved: 0, others: 0 };
        // Rejected-bucket claims are kept even without a Ticket ID (index 2
        // of `settled` is the Rejected fetch).
        const rejected = settled[2].status === 'fulfilled' ? settled[2].value.data || [] : [];
        for (const r of fulfilled) {
          if (r.value.meta?.pending != null) counts.pending = r.value.meta.pending;
          if (r.value.meta?.resolved != null) counts.resolved = r.value.meta.resolved;
          if (r.value.meta?.others != null) counts.others = r.value.meta.others;
          for (const c of r.value.data || []) {
            if (seen.has(String(c.id))) continue;
            seen.add(String(c.id));
            claims.push(c);
          }
        }
        // Raised tickets → flat rows; rejected claims without a ticket → rejected
        // HelpTicketCards. The Others count is the number of rows actually shown,
        // so the tab badge always matches the list.
        const othersCards = mapOthersClaims({ data: claims });
        const cards = mapRejectedClaims({ data: rejected }, Date.now());
        counts.others = othersCards.length + cards.length;
        return { cards, othersCards, counts };
      };

      const run = async (token: string): Promise<ClaimsResult> => {
        if (tab === 'Others') return runOthers(token);
        const res = await getQueue(token, apiStatus);
        // Stamp `now` once per fetch (timers tick live via timerTarget; this is
        // only the static fallback / "is the countdown still future" check).
        const now = Date.now();
        const cards = mapClaims(res, now);
        // The queue meta returns counts for the OTHER buckets, not the active
        // one (the active bucket IS the returned rows) — so the Pending fetch
        // carries resolved/others but no `pending`. Fall back to the row count
        // so the "In Review" tab still shows its badge number.
        return {
          cards,
          othersCards: [],
          counts: {
            pending: res.meta?.pending || (apiStatus === 'Pending' ? cards.length : 0),
            resolved: res.meta?.resolved || 0,
            others: res.meta?.others || 0,
          },
        };
      };
      try {
        return await run(accessToken as string);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return run(fresh);
        }
        // The list endpoint 404s / "no data" on an empty tab — treat as empty.
        const msg = (e as Error)?.message?.toLowerCase() || '';
        if (msg.includes('not found') || msg.includes('no data') || msg.includes('empty')) {
          return { cards: [], othersCards: [], counts: { pending: 0, resolved: 0, others: 0 } };
        }
        throw e;
      }
    },
  });
}

// ── Actions (imperative, token-bound, refresh-on-401) ───────────────────────

export function useMissingCashbackActions() {
  const { accessToken, refreshSession } = useAuth();
  const queryClient = useQueryClient();

  /** Run `fn` with the access token; on 401/403 refresh once and retry. */
  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new ApiError('Please log in to continue.', 401);
      try {
        return await fn(accessToken);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return fn(fresh);
        }
        throw e;
      }
    },
    [accessToken, refreshSession],
  );

  const validate = useCallback(
    (storeId: string, exitDate: string, orderId: string) =>
      withAuth((t) => validateClaim(t, storeId, exitDate, orderId)),
    [withAuth],
  );

  const submit = useCallback(
    (storeId: string, exitDate: string, orderId: string, orderAmount: string): Promise<McQueueResponse> =>
      withAuth((t) => submitQueue(t, storeId, exitDate, orderId, orderAmount)),
    [withAuth],
  );

  const update = useCallback(
    (queueId: string, details: { user_type?: string; category?: string }): Promise<McQueueResponse> =>
      withAuth((t) => updateQueue(t, queueId, details)),
    [withAuth],
  );

  const getItem = useCallback(
    (queueId: string): Promise<McClaim | null> => withAuth((t) => getQueueItem(t, queueId)),
    [withAuth],
  );

  const ticket = useCallback(
    (exitDate: string, storeId: string, exitId: string, data: McTicketData, files: McTicketFile[]) =>
      withAuth((t) => raiseTicket(t, exitDate, storeId, exitId, data, files)),
    [withAuth],
  );

  /** Refetch the claims list (after a submit / detail update). */
  const refreshClaims = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ck', 'mc', 'claims'] });
  }, [queryClient]);

  return { validate, submit, update, getItem, raiseTicket: ticket, refreshClaims };
}
