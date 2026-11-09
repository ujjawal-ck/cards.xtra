/**
 * useEarnings — the logged-in user's earnings summary (CashKaro).
 * Disabled when signed out. Token refresh on 401 happens in the API layer
 * (tokenManager), so this hook only fetches and maps.
 */
import { useQuery } from '@tanstack/react-query';
import { getEarnings } from '../api/cashkaro';
import { mapEarnings, type EarningsValues } from '../api/earningsMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { qk } from './keys';

export function useEarnings() {
  const { accessToken } = useAuth();
  const query = useQuery<EarningsValues>({
    queryKey: qk.user.earnings(),
    enabled: !!accessToken,
    queryFn: async ({ signal }) => mapEarnings(await getEarnings(accessToken as string, signal)),
  });
  // Refresh the balances every time the Earnings tab regains focus.
  useRefetchOnFocus(query);
  return query;
}
