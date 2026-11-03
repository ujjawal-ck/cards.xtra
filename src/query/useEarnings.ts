/**
 * useEarnings — the logged-in user's earnings summary (CashKaro).
 * Requires a user session; disabled (and returns nothing) when signed out.
 *
 * CashKaro access tokens expire in ~15 min, so a 401 triggers one
 * refresh-token exchange (via AuthContext) and a retry before failing.
 */
import { useQuery } from '@tanstack/react-query';
import { getEarnings } from '../api/cashkaro';
import { ApiError } from '../api/client';
import { mapEarnings, type EarningsValues } from '../api/earningsMapper';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export function useEarnings() {
  const { accessToken, refreshSession } = useAuth();
  const query = useQuery<EarningsValues>({
    queryKey: ['ck', 'earnings', accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      try {
        return mapEarnings(await getEarnings(accessToken as string));
      } catch (e) {
        // Stale access token → refresh once and retry.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return mapEarnings(await getEarnings(fresh));
        }
        throw e;
      }
    },
  });
  // Refresh the balances every time the Earnings tab regains focus.
  useRefetchOnFocus(query);
  return query;
}
