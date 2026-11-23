/**
 * payoutCooldown — the payout cool-down after an unknown outcome, kept on the
 * device so that killing the app does not clear it (review R-01).
 *
 * One secure-store key holds `{ until, userId }`: the time until which new
 * payouts are blocked, and the CashKaro account id (`ck_user_id`, saved by
 * fetchProfile) when it is known. Memory keeps a copy for the sync check.
 * The saved value is read once per app run, before the first check
 * (hydratePayoutCooldown). It blocks every account on the phone, whatever
 * user id it was saved with (review-2). A read error means "no saved cool-down",
 * as in the other secure-store helpers. Cleared at every session end
 * (sessionEnd.ts, review R-05). Unavailable on web, where only memory is used.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { loadUserId } from '../auth/tokenStore';

export const PAYOUT_COOLDOWN_KEY = 'cardsxtra.payoutUnknownUntil.v1';

const canPersist = Platform.OS !== 'web';

interface SavedCooldown {
  until: number;
  userId?: string;
}

/** Time until which new payouts are blocked. The sync copy. */
let until = 0;
/** The read of the saved value for this app run, once started. */
let hydrated: Promise<void> | null = null;
/** Bumped by a clear, so a read that started before it is dropped. */
let generation = 0;

/** Defensive parse: anything malformed is no cool-down. */
function parseSaved(raw: string | null): SavedCooldown | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.until !== 'number' || !Number.isFinite(data.until)) return null;
    return typeof data.userId === 'string' && data.userId
      ? { until: data.until, userId: data.userId }
      : { until: data.until };
  } catch {
    return null;
  }
}

const currentUserId = (): Promise<string | null> => loadUserId().catch(() => null);

/** Read the saved cool-down, once per app run. It never lowers the memory copy. */
export function hydratePayoutCooldown(): Promise<void> {
  if (!hydrated) {
    const gen = generation;
    hydrated = (async () => {
      if (!canPersist) return;
      try {
        const [raw, me] = await Promise.all([SecureStore.getItemAsync(PAYOUT_COOLDOWN_KEY), currentUserId()]);
        const saved = parseSaved(raw);
        if (!saved || gen !== generation) return;
        // Every account on this phone is blocked (review-2 R2-02, R2-04): the
        // stored user id can switch between the login id and the profile id,
        // so an id match was a way round the cool-down. The id is kept in the
        // saved value for diagnosis only.
        void me;
        until = Math.max(until, saved.until);
      } catch {
        // No saved cool-down.
      }
    })();
  }
  return hydrated;
}

/** True while the cool-down runs. Sync: await hydratePayoutCooldown first. */
export function payoutCooldownOn(now: number): boolean {
  return now < until;
}

/** Start (or extend) the cool-down to `end` and save it. Never throws. */
export async function startPayoutCooldown(end: number): Promise<void> {
  until = Math.max(until, end);
  if (!canPersist) return;
  try {
    const userId = await currentUserId();
    const saved: SavedCooldown = userId ? { until, userId } : { until };
    await SecureStore.setItemAsync(PAYOUT_COOLDOWN_KEY, JSON.stringify(saved));
  } catch {
    // Memory still holds it for this app run.
  }
}

/** End the cool-down in memory and on the device. Never throws. */
export async function clearPayoutCooldown(): Promise<void> {
  const gen = ++generation;
  until = 0;
  // No read while the key is deleted; after it, the next check reads again.
  hydrated = Promise.resolve();
  if (canPersist) {
    try {
      await SecureStore.deleteItemAsync(PAYOUT_COOLDOWN_KEY);
    } catch {
      // A key left behind is read again (and checked against the user id).
    }
  }
  if (gen === generation) hydrated = null;
}

/**
 * Forget the memory copy only; the saved value stays. Used at a session end:
 * the next check reads the device again and the saved value blocks. The
 * same user logging back in stays blocked (log out and in is not a way round
 * the cool-down); a different account on the phone is blocked too; an unknown user id
 * stays blocked (fail closed). Review follow-up to R-05.
 */
export function forgetPayoutCooldownMemory(): void {
  generation++;
  until = 0;
  hydrated = null;
}

/** Test seam: memory as after an app restart. The saved value is kept. */
export function __resetPayoutCooldownMemory(): void {
  forgetPayoutCooldownMemory();
}
