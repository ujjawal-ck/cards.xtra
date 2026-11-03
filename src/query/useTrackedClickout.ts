/**
 * useTrackedClickout — the ONE way to open an affiliate click-out (card
 * Apply, store Shop). Click-outs are CashKaro's revenue, so this guards the
 * two ways attribution leaked before:
 *
 *   1. No URL → we used to open nothing but still log a conversion. Now the
 *      user sees a clear message, `clickout_blocked` is logged, and the
 *      caller gets `opened: false` so it must not log a conversion.
 *   2. Signed-in user whose profile id hasn't loaded yet → the tracker went
 *      out with an empty `id=`, so CashKaro could not credit the user. Now we
 *      wait for the profile (up to PROFILE_WAIT_MS) before opening.
 *
 * If the id still isn't available (offline, profile API down) we open
 * anyway: blocking the click would lose the commission entirely. The result
 * says `attributed: false` so the caller logs it and the gap is measurable.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from './useProfile';
import { openUrl, withTrackingUser } from '../lib/openUrl';
import { analytics, Events } from '../analytics';

const PROFILE_WAIT_MS = 4000;

export interface ClickoutRequest {
  url?: string | null;
  /** Where the click came from, e.g. 'home_apply', 'store_shop'. */
  surface: string;
  itemId?: string | number;
}

export interface ClickoutResult {
  opened: boolean;
  /** True when the tracker carried the user's id. */
  attributed: boolean;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

export function useTrackedClickout() {
  const { accessToken } = useAuth();
  const profileQuery = useProfile();
  const profileId = profileQuery.data?.id;
  const refetchProfile = profileQuery.refetch;

  return useCallback(
    async ({ url, surface, itemId }: ClickoutRequest): Promise<ClickoutResult> => {
      const clean = (url ?? '').trim();
      if (!clean) {
        analytics.track(Events.CLICKOUT_BLOCKED, { surface, reason: 'no_url', item_id: itemId });
        Alert.alert(
          "This link isn't available right now",
          'Please try again in a little while.'
        );
        return { opened: false, attributed: false };
      }
      let userId: string | number | undefined = profileId;
      if (accessToken && (userId === undefined || userId === null || userId === '')) {
        const res = await withTimeout(refetchProfile(), PROFILE_WAIT_MS);
        userId = res?.data?.id;
      }
      const attributed = userId !== undefined && userId !== null && userId !== '';
      openUrl(withTrackingUser(clean, userId));
      return { opened: true, attributed };
    },
    [accessToken, profileId, refetchProfile]
  );
}
