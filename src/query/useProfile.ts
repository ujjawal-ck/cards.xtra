/**
 * useProfile — the logged-in user's profile (CashKaro `/users/profile`).
 * Requires a session; refreshes the access token once on a 401 (tokens
 * expire ~15 min), mirroring useEarnings.
 */
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api/cashkaro';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import type { UserProfile } from '../api/types';

export function useProfile() {
  const { accessToken, refreshSession } = useAuth();
  const query = useQuery<UserProfile>({
    queryKey: ['ck', 'profile', accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      try {
        return await getProfile(accessToken as string);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          const fresh = await refreshSession();
          if (fresh) return await getProfile(fresh);
        }
        throw e;
      }
    },
  });
  useRefetchOnFocus(query);
  return query;
}
