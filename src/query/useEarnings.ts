/**
 * useEarnings — the logged-in user's earnings summary (CashKaro).
 * Disabled when signed out. Token refresh on 401 happens in the API layer
 * (tokenManager), so this hook only fetches and maps.
 */
import { useQuery } from '@tanstack/react-query';
import { getEarnings } from '../api/cashkaro';
import { requireEarnings, type EarningsValues } from '../api/earningsMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { qk } from './keys';

/** The earnings query function, shared with the login prefetch (warmUserCache,
 *  review R-08). An unusable body (no amount at all) throws, so the screen
 *  shows its error state and Try again instead of ₹0 balances. */
export async function fetchEarnings(accessToken: string, signal?: AbortSignal): Promise<EarningsValues> {
  return requireEarnings(await getEarnings(accessToken, signal));
}

export function useEarnings() {
  const { accessToken } = useAuth();
  const query = useQuery<EarningsValues>({
    queryKey: qk.user.earnings(),
    enabled: !!accessToken,
    queryFn: ({ signal }) => fetchEarnings(accessToken as string, signal),
  });
  // Refresh the balances every time the Earnings tab regains focus.
  useRefetchOnFocus(query);
  return query;
}
