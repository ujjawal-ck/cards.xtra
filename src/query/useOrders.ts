/**
 * useOrders — the logged-in user's order list (CashKaro `/users/orders`),
 * loaded page by page (20 rows a page) so long histories aren't cut off.
 * Disabled when signed out; token refresh is handled by the API layer.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  useInfiniteQuery,
  useQueries,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from '@tanstack/react-query';
import { getOrders, type OrdersApiFilters } from '../api/cashkaro';
import {
  mapOrders,
  type OrderListRow,
  type OrderDetailModel,
  type OrderDatesById,
} from '../api/ordersMapper';
import { useAuth } from '../auth/AuthContext';
import { limitConcurrency } from '../lib/limitConcurrency';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { orderDetailQuery } from './useOrderDetail';
import { qk } from './keys';

export const ORDERS_PAGE_SIZE = 20;

interface OrdersPage {
  rows: OrderListRow[];
  page: number;
  total: number;
}

export function useOrders(filters: OrdersApiFilters = {}) {
  const { accessToken } = useAuth();
  const query = useInfiniteQuery({
    queryKey: qk.user.orders(filters),
    enabled: !!accessToken,
    initialPageParam: 1,
    // Keep the previous results on screen while a filtered refetch runs, so
    // applying a filter doesn't flash the loading spinner.
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam, signal }): Promise<OrdersPage> => {
      const res = await getOrders(accessToken as string, filters, { page: pageParam, size: ORDERS_PAGE_SIZE }, signal);
      const rows = mapOrders(res);
      const total = Number(res?.meta?.total_records ?? rows.length) || 0;
      return { rows, page: pageParam, total };
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.rows.length, 0);
      return last.rows.length === ORDERS_PAGE_SIZE && loaded < last.total ? last.page + 1 : undefined;
    },
    // Screens read a flat list (`data`), as before.
    select: (d) => d.pages.flatMap((p) => p.rows),
  });
  useRefetchOnFocus(query);
  return query;
}

// ── month dates for the Orders list ──────────────────────────────────────────

/** At most this many order-detail calls run at once for the list's dates. */
export const ORDER_DATE_CONCURRENCY = 4;
const limitDetailCalls = limitConcurrency(ORDER_DATE_CONCURRENCY);

/** One detail cache entry → the row's date: ISO when known, null when the call
 *  failed or sent no date (the "Other" group), undefined while not fetched. */
export function orderDateFrom(entry: {
  data?: OrderDetailModel;
  status: 'pending' | 'error' | 'success';
}): string | null | undefined {
  if (entry.data) return entry.data.transactionDateISO ?? null;
  return entry.status === 'error' ? null : undefined;
}

/**
 * Fetch each order's detail into the detail screen's cache entry, at most
 * ORDER_DATE_CONCURRENCY at a time. A fresh entry costs no call (the client's
 * staleTime, the same as useOrderDetail). A failure is not retried here: the
 * HTTP client has its own retries. `shouldFetch` is checked when a slot opens,
 * so a row that left the list, or a closed screen, costs no call.
 * `onNotFetched` gets each id that ended with no date and no error: skipped,
 * or cancelled mid-call (React Query cancels it when the row leaves the list).
 */
export function prefetchOrderDetails(
  queryClient: QueryClient,
  accessToken: string,
  orderIds: string[],
  shouldFetch: (orderId: string) => boolean = () => true,
  onNotFetched: (orderId: string) => void = () => undefined
): Promise<void> {
  return Promise.all(
    orderIds.map((orderId) =>
      limitDetailCalls(async () => {
        if (!shouldFetch(orderId)) return onNotFetched(orderId);
        const query = orderDetailQuery(accessToken, orderId);
        await queryClient.fetchQuery({ ...query, retry: false }).catch(() => undefined);
        const state = queryClient.getQueryState<OrderDetailModel>(query.queryKey);
        if (!state || orderDateFrom(state) === undefined) onNotFetched(orderId);
      })
    )
  ).then(() => undefined);
}

/**
 * useOrderDates — the Orders list's month dates. The list response has no
 * date, so each shown row's detail (`transaction_date`) is fetched in the
 * background and cached under the detail screen's key: opening that order
 * then reads the cache. Returns row id → date (see OrderDatesById).
 * OrdersList only: Earnings also calls useOrders and must not fire these calls.
 */
export function useOrderDates(rows: OrderListRow[] | undefined): OrderDatesById {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const ids = useMemo(() => (rows ?? []).map((r) => r.id).filter(Boolean), [rows]);

  // Watch each row's detail entry without fetching from here (enabled: false):
  // a date already in the cache shows at once, and new results re-render.
  const datesById = useQueries({
    queries: ids.map((id) => ({ ...orderDetailQuery(accessToken as string, id), enabled: false })),
    combine: (results) => {
      const out: OrderDatesById = {};
      results.forEach((r, i) => {
        const date = orderDateFrom(r);
        if (date !== undefined) out[ids[i]] = date;
      });
      return out;
    },
  });

  // Ids queued on this screen, so a failed id is not queued again when the
  // next page loads. `shown` and `alive` are read when a slot opens.
  const scheduled = useRef(new Set<string>());
  const shown = useRef(new Set<string>());
  shown.current = new Set(ids);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const fresh = ids.filter((id) => !scheduled.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => scheduled.current.add(id));
    void prefetchOrderDetails(
      queryClient,
      accessToken,
      fresh,
      (id) => alive.current && shown.current.has(id),
      // Not fetched (or cancelled): the row can queue again if it comes back.
      (id) => scheduled.current.delete(id)
    );
  }, [ids, accessToken, queryClient]);

  return datesById;
}
