/**
 * useOrders — the logged-in user's order list (CashKaro `/users/orders`),
 * loaded page by page (20 rows a page) so long histories aren't cut off.
 * Disabled when signed out; token refresh is handled by the API layer.
 */
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { getOrders, type OrdersApiFilters } from '../api/cashkaro';
import { mapOrders, type OrderListRow } from '../api/ordersMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
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
