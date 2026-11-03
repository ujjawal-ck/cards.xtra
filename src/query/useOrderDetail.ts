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

export function useOrderDetail(orderId?: string) {
  const { accessToken } = useAuth();
  const query = useQuery<OrderDetailModel>({
    queryKey: qk.user.order(orderId),
    enabled: !!accessToken && !!orderId,
    queryFn: async ({ signal }) =>
      mapOrderDetail(await getOrderDetail(accessToken as string, orderId as string, signal)),
  });
  useRefetchOnFocus(query);
  return query;
}
