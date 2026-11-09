/**
 * useMissingCashback — data + actions for the Missing Cashback claim flow.
 *
 * Reads (useQuery; token refresh is handled by the API layer):
 *   useRetailers()            — stores to claim against
 *   useExitClickDates(store)  — visit dates + order-id meta for a store
 *   useClaims(tab)            — claims list for a status tab (+ counts)
 *
 * Actions (imperative — the submit flow needs sequential awaits + branching):
 *   useMissingCashbackActions() → { validate, submit, update, raiseTicket,
 *                                   getQueueItem } all bound to the current
 *                                   session.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { qk } from './keys';
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
  STATUS_TAB_TO_API,
  type RetailerRow,
  type ExitMonthGroup,
  type ClaimCard,
  type OthersClaimCard,
} from '../api/missingCashbackMapper';

export type ClaimTab = 'In Review' | 'Closed' | 'Others';

// ── Reads ────────────────────────────────────────────────────────────────

export function useRetailers() {
  const { accessToken } = useAuth();
  return useQuery<RetailerRow[]>({
    queryKey: qk.user.mc.retailers(),
    enabled: !!accessToken,
    // The retailer list grows as the user does click-outs — keep it fresh so
    // newly-visited stores appear when they reopen the screen (the global
    // 5-min staleTime would otherwise serve a stale list).
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => mapRetailers(await getRetailers(accessToken as string)),
  });
}

export interface ExitDatesResult {
  months: ExitMonthGroup[];
  meta: McExitMeta;
}

export function useExitClickDates(storeId?: string) {
  const { accessToken } = useAuth();
  return useQuery<ExitDatesResult>({
    queryKey: qk.user.mc.exitDates(storeId),
    enabled: !!accessToken && !!storeId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const id = storeId as string;
      const run = async (token: string): Promise<ExitDatesResult> => {
        const res = await getExitClickDates(token, id);
        return { months: mapExitClicks(res), meta: res.meta || {} };
      };
      return run(accessToken as string);
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
  const { accessToken } = useAuth();
  return useQuery<ClaimsResult>({
    queryKey: qk.user.mc.claims(tab),
    enabled: !!accessToken,
    // Claims change as the user submits/updates — always refetch on open.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const apiStatus = STATUS_TAB_TO_API[tab];

      // "Others" lists raised tickets (those with a Ticket ID) as flat rows.
      // A ticket can come back under either status filter, so gather both and
      // keep whatever succeeds (only failing if EVERY fetch fails → outer
      // catch). The API accepts only Pending | Resolved; "Rejected" always
      // returns 422 (verified on staging 2026-11-03), so it isn't requested.
      const runOthers = async (token: string): Promise<ClaimsResult> => {
        const settled = await Promise.allSettled([
          getQueue(token, 'Pending'),
          getQueue(token, 'Resolved'),
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
        // mapOthersClaims keeps only ticket claims (those with a Ticket ID).
        return { cards: [], othersCards: mapOthersClaims({ data: claims }), counts };
      };

      const run = async (token: string): Promise<ClaimsResult> => {
        if (tab === 'Others') return runOthers(token);
        const res = await getQueue(token, apiStatus);
        // Note: the queue API only accepts filter[status] Pending | Resolved
        // (Rejected returns 422 on staging, verified 2026-11-03), so closed-
        // without-cashback claims arrive in Resolved and are labelled
        // 'not-tracked' by mapClaimToCard.
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
        // An empty tab can come back as 404 — treat that as empty. Every
        // other failure is a real error and shows the retry state.
        if (e instanceof ApiError && e.kind === 'http' && e.status === 404) {
          return { cards: [], othersCards: [], counts: { pending: 0, resolved: 0, others: 0 } };
        }
        throw e;
      }
    },
  });
}

// ── Actions (imperative; writes refresh the claims list on success) ─────────

export function useMissingCashbackActions() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  /** Run `fn` with the session token (401 refresh happens in the API layer). */
  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new ApiError('Please log in to continue.', 401);
      return fn(accessToken);
    },
    [accessToken],
  );

  /** Pass a write's result through after marking the claims list stale. */
  const afterWrite = useCallback(
    <T,>(res: T): T => {
      void queryClient.invalidateQueries({ queryKey: qk.user.mc.all });
      return res;
    },
    [queryClient],
  );

  const validate = useCallback(
    (storeId: string, exitDate: string, orderId: string) =>
      withAuth((t) => validateClaim(t, storeId, exitDate, orderId)),
    [withAuth],
  );

  const submit = useCallback(
    (storeId: string, exitDate: string, orderId: string, orderAmount: string): Promise<McQueueResponse> =>
      withAuth((t) => submitQueue(t, storeId, exitDate, orderId, orderAmount)).then(afterWrite),
    [withAuth, afterWrite],
  );

  const update = useCallback(
    (queueId: string, details: { user_type?: string; category?: string }): Promise<McQueueResponse> =>
      withAuth((t) => updateQueue(t, queueId, details)).then(afterWrite),
    [withAuth, afterWrite],
  );

  const getItem = useCallback(
    (queueId: string): Promise<McClaim | null> => withAuth((t) => getQueueItem(t, queueId)),
    [withAuth],
  );

  const ticket = useCallback(
    (exitDate: string, storeId: string, exitId: string, data: McTicketData, files: McTicketFile[]) =>
      withAuth((t) => raiseTicket(t, exitDate, storeId, exitId, data, files)).then(afterWrite),
    [withAuth, afterWrite],
  );

  /** Refetch the claims list (after a submit / detail update). */
  const refreshClaims = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.user.mc.all });
  }, [queryClient]);

  return { validate, submit, update, getItem, raiseTicket: ticket, refreshClaims };
}
