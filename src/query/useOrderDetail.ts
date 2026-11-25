/**
 * useOrderDetail — one order's detail (CashKaro `/users/orders/:id`).
 * Disabled until both a session and an orderId exist.
 */
import { useQuery } from '@tanstack/react-query';
import { getOrderDetail } from '../api/cashkaro';
import { mapOrderDetail, type OrderDetailModel } from '../api/ordersMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { qk } from './keys';

/** The detail query's key and fetch. The Orders list's date fetch
 *  (useOrderDates) uses the same pair, so both share one cache entry. */
export function orderDetailQuery(accessToken: string, orderId: string) {
  return {
    queryKey: qk.user.order(orderId),
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<OrderDetailModel> =>
      mapOrderDetail(await getOrderDetail(accessToken, orderId, signal)),
  };
}

export function useOrderDetail(orderId?: string) {
  const { accessToken } = useAuth();
  const query = useQuery<OrderDetailModel>({
    ...orderDetailQuery(accessToken as string, orderId as string),
    enabled: !!accessToken && !!orderId,
  });
  // First focus: the cached detail is used as is (the Orders list's date fetch
  // usually filled it, and a cold cache still loads on mount). Returning to the
  // screen refetches.
  useRefetchOnFocus(query, { skipFirstFocus: true });
  return query;
}
