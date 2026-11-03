/**
 * useOrders — the logged-in user's order list (CashKaro `/users/orders`).
 * Requires a session; refreshes the access token once on a 401 (tokens
 * expire ~15 min), mirroring useEarnings / useProfile.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getOrders, type OrdersApiFilters } from '../api/cashkaro';
import { ApiError } from '../api/client';
import { mapOrders, type OrderListRow } from '../api/ordersMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export function useOrders(filters: OrdersApiFilters = {}) {
  const { accessToken, refreshSession } = useAuth();
  const query = useQuery<OrderListRow[]>({
    queryKey: ['ck', 'orders', accessToken, filters],
    enabled: !!accessToken,
    // Keep the previous results on screen while a filtered refetch runs, so
    // applying a filter doesn't flash the loading spinner.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        return mapOrders(await getOrders(accessToken as string, filters));
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return mapOrders(await getOrders(fresh, filters));
        }
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}
