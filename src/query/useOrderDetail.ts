/**
 * useOrderDetail — one order's detail (CashKaro `/users/orders/:id`).
 * Disabled until both a session and an orderId exist; refreshes the
 * access token once on a 401, mirroring useOrders.
 */
import { useQuery } from '@tanstack/react-query';
import { getOrderDetail } from '../api/cashkaro';
import { ApiError } from '../api/client';
import { mapOrderDetail, type OrderDetailModel } from '../api/ordersMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export function useOrderDetail(orderId?: string) {
  const { accessToken, refreshSession } = useAuth();
  const query = useQuery<OrderDetailModel>({
    queryKey: ['ck', 'order', orderId, accessToken],
    enabled: !!accessToken && !!orderId,
    queryFn: async () => {
      const id = orderId as string;
      try {
        return mapOrderDetail(await getOrderDetail(accessToken as string, id));
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return mapOrderDetail(await getOrderDetail(fresh, id));
        }
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}
