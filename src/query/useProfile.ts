/**
 * useProfile — the logged-in user's profile (CashKaro `/users/profile`).
 * Disabled when signed out. The profile id is persisted (tokenStore) so
 * click-out attribution has it instantly on the next launch.
 */
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api/cashkaro';
import { saveUserId } from '../auth/tokenStore';
import { useAuth } from '../auth/AuthContext';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { qk } from './keys';
import type { UserProfile } from '../api/types';

export async function fetchProfile(accessToken: string, signal?: AbortSignal): Promise<UserProfile> {
  const profile = await getProfile(accessToken, signal);
  if (profile?.id != null) void saveUserId(String(profile.id)).catch(() => undefined);
  return profile;
}

export function useProfile() {
  const { accessToken } = useAuth();
  const query = useQuery<UserProfile>({
    queryKey: qk.user.profile(),
    enabled: !!accessToken,
    queryFn: ({ signal }) => fetchProfile(accessToken as string, signal),
  });
  useRefetchOnFocus(query);
  return query;
}
