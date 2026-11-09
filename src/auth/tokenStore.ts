/**
 * tokenStore.ts — encrypted persistence for the CashKaro session.
 *
 * Wraps expo-secure-store (Keychain on iOS, Keystore on Android). Holds the
 * user access/refresh tokens and a stable per-install device id (generated
 * once, reused for device_info on every login).
 *
 * The aws-token (CK bootstrap token) is intentionally NOT stored here — it is
 * short-lived and kept in memory by cashkaro.ts.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ACCESS_TOKEN = 'ck_access_token';
const REFRESH_TOKEN = 'ck_refresh_token';
const DEVICE_ID = 'device_unique_id';
// Local display name (what the user wants to be called on Home/Profile) and a
// one-shot flag set right after a fresh signup so Home knows to greet the
// first-timer with the "what should we call you?" prompt. Neither is sensitive,
// but they live here so the whole local session clears together on logout.
const DISPLAY_NAME = 'ck_display_name';
const NAME_PENDING = 'ck_name_pending';

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, session.refreshToken),
  ]);
}

export async function loadSession(): Promise<Session | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN),
    SecureStore.getItemAsync(REFRESH_TOKEN),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
    SecureStore.deleteItemAsync(DISPLAY_NAME),
    SecureStore.deleteItemAsync(NAME_PENDING),
    SecureStore.deleteItemAsync('ck_user_id'),
  ]);
}

// ── Display name + first-time greeting flag ─────────────────────────────────

export async function saveDisplayName(name: string): Promise<void> {
  await SecureStore.setItemAsync(DISPLAY_NAME, name);
}

export async function loadDisplayName(): Promise<string | null> {
  return SecureStore.getItemAsync(DISPLAY_NAME);
}

/** Set/clear the "greet this first-timer for their name" flag. */
export async function setNamePending(pending: boolean): Promise<void> {
  if (pending) await SecureStore.setItemAsync(NAME_PENDING, '1');
  else await SecureStore.deleteItemAsync(NAME_PENDING);
}

export async function loadNamePending(): Promise<boolean> {
  return (await SecureStore.getItemAsync(NAME_PENDING)) === '1';
}

/** Cryptographically random UUID v4: a stable per-install handle. */
function randomId(): string {
  return Crypto.randomUUID();
}

/** Stable device id, generated + persisted on first use. */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID);
  if (existing) return existing;
  const id = randomId();
  await SecureStore.setItemAsync(DEVICE_ID, id);
  return id;
}

// ── Onboarding seen (per install) ───────────────────────────────────────────
// Login is optional: "Get Started" lets people into the app as a guest. This
// flag sends returning guests straight to Home instead of replaying
// onboarding on every launch. Deliberately NOT cleared on logout — the
// person has already seen onboarding on this device.
const ONBOARDED = 'onboarding_seen';

export async function markOnboarded(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDED, '1');
}

export async function loadOnboarded(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDED)) === '1';
}

// ── CashKaro user id (for click-out attribution) ────────────────────────────

const USER_ID = 'ck_user_id';

/** Persist the CK account id so attribution works instantly on next launch. */
export async function saveUserId(id: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ID, id);
}

export async function loadUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID);
}
