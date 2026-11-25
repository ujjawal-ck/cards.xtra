/**
 * tokenStore.ts — encrypted persistence for the CashKaro session.
 *
 * Wraps expo-secure-store (Keychain on iOS, Keystore on Android). Holds the
 * user access/refresh tokens, the CashKaro user id and segment (from the
 * login, signup and refresh responses) and a stable per-install device id
 * (generated once, reused for device_info on every login).
 *
 * The aws-token (CK bootstrap token) is intentionally NOT stored here — it is
 * short-lived and kept in memory by cashkaro.ts.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { UserSegment } from '../api/cashkaro';

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
  // The memory copy goes at once, before the first await.
  segmentMemory = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
    SecureStore.deleteItemAsync(DISPLAY_NAME),
    SecureStore.deleteItemAsync(NAME_PENDING),
    SecureStore.deleteItemAsync('ck_user_id'),
    SecureStore.deleteItemAsync(SEGMENT_IDS),
    SecureStore.deleteItemAsync(SEGMENT_NEW_USER_EXPIRY),
    SecureStore.deleteItemAsync(SEGMENT_JOINED_AT),
  ]);
}

/** Delete only the user id and the segment (memory and keys), not the tokens. */
export async function clearIdentity(): Promise<void> {
  segmentMemory = null;
  await Promise.all([
    SecureStore.deleteItemAsync('ck_user_id'),
    SecureStore.deleteItemAsync(SEGMENT_IDS),
    SecureStore.deleteItemAsync(SEGMENT_NEW_USER_EXPIRY),
    SecureStore.deleteItemAsync(SEGMENT_JOINED_AT),
  ]);
}

// ── CashKaro segment (login / signup / refresh; sent as filter[segmentid]) ──
// segment_id[], new_user_segment_expiry_time_sec and user_joined_at. A memory
// copy serves the offers calls without a read; it is null for a guest.
const SEGMENT_IDS = 'ck_segment_ids';
const SEGMENT_NEW_USER_EXPIRY = 'ck_new_user_segment_expiry_sec';
const SEGMENT_JOINED_AT = 'ck_user_joined_at';

let segmentMemory: UserSegment | null = null;

/** The current user's segment from memory (null for a guest or before loadSegment). */
export function currentSegment(): UserSegment | null {
  return segmentMemory;
}

/**
 * Save the fields that `update` carries; a field it leaves out keeps its
 * stored value (a refresh without segment fields changes nothing). An empty
 * `ids` list is a value and replaces the old list.
 */
export async function saveSegment(update: UserSegment): Promise<void> {
  const next: UserSegment = { ...(segmentMemory ?? {}) };
  const writes: Promise<void>[] = [];
  if (update.ids !== undefined) {
    next.ids = update.ids;
    writes.push(SecureStore.setItemAsync(SEGMENT_IDS, JSON.stringify(update.ids)));
  }
  if (update.newUserExpirySec !== undefined) {
    next.newUserExpirySec = update.newUserExpirySec;
    writes.push(SecureStore.setItemAsync(SEGMENT_NEW_USER_EXPIRY, String(update.newUserExpirySec)));
  }
  if (update.joinedAt !== undefined) {
    next.joinedAt = update.joinedAt;
    writes.push(SecureStore.setItemAsync(SEGMENT_JOINED_AT, update.joinedAt));
  }
  if (!writes.length) return;
  segmentMemory = next;
  await Promise.all(writes);
}

/** Read the stored segment into memory (launch). Null when nothing is stored. */
export async function loadSegment(): Promise<UserSegment | null> {
  const [rawIds, rawExpiry, joinedAt] = await Promise.all([
    SecureStore.getItemAsync(SEGMENT_IDS),
    SecureStore.getItemAsync(SEGMENT_NEW_USER_EXPIRY),
    SecureStore.getItemAsync(SEGMENT_JOINED_AT),
  ]);
  const segment: UserSegment = {};
  if (rawIds) {
    try {
      const parsed = JSON.parse(rawIds);
      if (Array.isArray(parsed)) segment.ids = parsed.map(String);
    } catch {
      // unreadable: treat as not stored
    }
  }
  if (rawExpiry && Number.isFinite(Number(rawExpiry))) segment.newUserExpirySec = Number(rawExpiry);
  if (joinedAt) segment.joinedAt = joinedAt;
  segmentMemory = Object.keys(segment).length ? segment : null;
  return segmentMemory;
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
