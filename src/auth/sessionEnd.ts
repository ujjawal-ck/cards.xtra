/**
 * sessionEnd.ts — the one way a session ends on this device, plus the launch
 * check of a saved session.
 *
 * signOut, expireSession (refresh token rejected) and the launch dead-token
 * path all call endLocalSession, so the next person on the phone never sees
 * the previous user's data (AUTH-02, DATA-03, QA-10). AuthContext resets its
 * React state around it.
 *
 * Cleared, because it belongs to the user:
 *   - secure store: ck_access_token, ck_refresh_token, ck_display_name,
 *     ck_name_pending, ck_user_id (clearSession); cardsxtra.profile.v1 (PIN
 *     code, income, income type, applied cards); cardsxtra.toolSpends.v1;
 *     never_miss_cashback_enabled (the Cashback Reminder opt-in);
 *     cardsxtra.payoutUnknownUntil.v1 (the payout cool-down, review R-05)
 *   - memory: the React Query cache, the saved spends, the advisor chat, the
 *     payout cool-down
 *   - analytics: the ck_user_id user property; the user id goes back to the
 *     device id
 *   - the Cashback Reminder service is stopped
 * Kept, because it belongs to the install: device_unique_id,
 * onboarding_seen, never_miss_cashback_nudge_dismissed and the recent
 * searches (catalog names only).
 */
import * as SecureStore from 'expo-secure-store';

import { clearSession, saveSession, type Session } from './tokenStore';
import { clearSavedProfile } from '../lib/savedProfile';
import { clearSavedSpends } from '../lib/savedSpends';
import { clearPayoutCooldown } from '../lib/payoutCooldown';
import { resetAdvisorSession } from '../screens/advisor/advisorSession';
import {
  bumpSessionGeneration,
  currentSessionGeneration,
  isExpiring,
  isRefreshTokenDead,
} from '../api/http/tokenManager';
import { queryClient } from '../query/queryClient';
import { analytics } from '../analytics';
import * as CashbackGuard from '../../modules/cashback-guard';

/** Same key as ENABLED_KEY in CashbackGuardScreen: the Cashback Reminder opt-in. */
const CASHBACK_REMINDER_OPT_IN = 'never_miss_cashback_enabled';

/** GA4 user properties that name the signed-in account. */
const USER_PROPERTIES = ['ck_user_id'];

/**
 * End the session on this device. Safe to call twice; never throws.
 * The steps in memory run first, so nothing that resolves later can write
 * this user's data back.
 * @param deviceId the per-install id; analytics falls back to it (null clears the user id)
 */
export async function endLocalSession(deviceId: string | null): Promise<void> {
  // A refresh still running drops its tokens (AUTH-05).
  bumpSessionGeneration();
  // Cached earnings, orders and profile. This also cancels their fetches.
  queryClient.clear();
  clearSavedSpends();
  resetAdvisorSession();
  // AUTH-06: GA4 keeps user properties on the device.
  analytics.clearUserProperties(USER_PROPERTIES);
  analytics.identify(deviceId);
  // TODO(native): DATA-11, AUTH-03. stopGuard only stops the service. The
  // native url_* and label_* prefs (CashbackGuardModule.kt) still hold this
  // user's tracking links. Add a native clearMerchants() and call it here.
  // setMerchants([]) cannot do it: it writes only non-empty values.
  try {
    CashbackGuard.stopGuard();
  } catch {
    // never block the session end
  }
  await Promise.allSettled([
    clearSession(),
    clearSavedProfile(),
    // Without the opt-in, CashbackGuardScreen does not start the service again.
    SecureStore.deleteItemAsync(CASHBACK_REMINDER_OPT_IN),
    // The next user must not be blocked by this user's payout cool-down. It
    // clears the memory copy at once, then the key.
    clearPayoutCooldown(),
  ]);
}

/**
 * Launch check of a saved session. A valid access token is used as is; an
 * expiring one is refreshed first. A dead refresh token ends the local
 * session (the same clear as a logout) and gives null. A network failure
 * keeps the session (the next call refreshes again). If a sign-in or a
 * session end happens during the refresh, nothing is saved and the result
 * is 'superseded'.
 */
export async function restoreSession(
  saved: Session,
  deviceId: string | null,
  refresh: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>,
): Promise<Session | null | 'superseded'> {
  if (!isExpiring(saved.accessToken)) return saved;
  const gen = currentSessionGeneration();
  let res: { accessToken: string; refreshToken?: string };
  try {
    res = await refresh(saved.refreshToken);
  } catch (e) {
    if (gen !== currentSessionGeneration()) return 'superseded';
    if (!isRefreshTokenDead(e)) return saved;
    await endLocalSession(deviceId);
    return null;
  }
  if (gen !== currentSessionGeneration()) return 'superseded';
  const next: Session = { accessToken: res.accessToken, refreshToken: res.refreshToken || saved.refreshToken };
  await saveSession(next).catch(() => undefined);
  return next;
}
