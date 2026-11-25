/**
 * storyState — isolation between stories, auth seeding and click-out spies.
 *
 * Storybook keeps one JS module graph for every story in the iframe, so module
 * state leaks from one story to the next. The harness calls prepareStory() in
 * the render phase of its first render (lazy useState), BEFORE its children
 * (AuthProvider, screens) mount and read anything.
 */
import { Linking, Share } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { queryClient } from '../../src/query/queryClient';
import { resetAdvisorSession } from '../../src/screens/advisor/advisorSession';
import { __resetPayoutLock } from '../../src/query/mutations/withdraw';
import { clearSavedSpends } from '../../src/lib/savedSpends';
import { __resetContractReports } from '../../src/api/schemas/validate';
import { resetSecureStore, seedSecureStore } from '../mocks/secureStore';
import { installApiMock, type ApiParams, type ApiRoute, reply } from './apiMock';
import { ENDPOINTS } from './endpoints';

export type HarnessAuth = 'guest' | 'signedIn' | 'sessionExpired';

/** Keys from src/auth/tokenStore.ts. */
export const STORAGE_KEYS = {
  accessToken: 'ck_access_token',
  refreshToken: 'ck_refresh_token',
  deviceId: 'device_unique_id',
  displayName: 'ck_display_name',
  namePending: 'ck_name_pending',
  userId: 'ck_user_id',
  onboarded: 'onboarding_seen',
  /** src/lib/savedProfile.ts */
  savedProfile: 'cardsxtra.profile.v1',
  /** src/lib/savedSpends.ts */
  savedSpends: 'cardsxtra.toolSpends.v1',
} as const;

/**
 * Opaque (non-JWT) tokens: tokenManager.isExpiring() returns false when there
 * is no `exp` claim, so AuthProvider trusts them with no refresh call.
 */
export const FAKE_SESSION = {
  accessToken: 'storybook-access-token',
  refreshToken: 'storybook-refresh-token',
  deviceId: 'storybook-device-0001',
} as const;

export interface AuthSeed {
  auth?: HarnessAuth;
  /** Name the user picked (ck_display_name). Home and Profile prefer it over profile.fullname. */
  displayName?: string | null;
  /** true sets ck_name_pending = '1' (Home greets a first-timer with the name prompt). */
  namePending?: boolean;
  /** Any other secure-store keys, e.g. { [STORAGE_KEYS.onboarded]: '1' }. */
  storage?: Record<string, string | null | undefined>;
}

/** Fill the in-memory secure store for this auth state. Call after resetSecureStore(). */
export function seedAuth({ auth = 'guest', displayName, namePending, storage }: AuthSeed): void {
  const values: Record<string, string | null | undefined> = { [STORAGE_KEYS.deviceId]: FAKE_SESSION.deviceId };
  if (auth !== 'guest') {
    values[STORAGE_KEYS.accessToken] = FAKE_SESSION.accessToken;
    values[STORAGE_KEYS.refreshToken] = FAKE_SESSION.refreshToken;
    if (displayName) values[STORAGE_KEYS.displayName] = displayName;
    if (namePending) values[STORAGE_KEYS.namePending] = '1';
  }
  seedSecureStore({ ...values, ...storage });
}

const SESSION_EXPIRED_BODY = { errors: [{ status: '401', code: '2004', title: 'Invalid Refresh Token', detail: 'Invalid Refresh Token' }] };
const TOKEN_EXPIRED_BODY = { errors: [{ status: '401', title: 'Token expired', detail: 'Token expired' }] };

/**
 * Routes that the auth state adds IN FRONT of the story's api routes.
 * sessionExpired: every user call answers 401 and /refreshtoken answers 401,
 * so tokenManager calls onExpired → AuthContext sets sessionExpiredAt →
 * status 'unauthenticated' → LoginSheetProvider opens the login sheet.
 */
export function authRoutes(auth: HarnessAuth): ApiRoute[] {
  if (auth !== 'sessionExpired') return [];
  return [
    { name: 'sessionExpired', method: 'POST', match: ENDPOINTS.refreshToken.path, answer: reply.error(401, SESSION_EXPIRED_BODY) },
    { name: 'sessionExpired', match: /^\/ck\/(users|payment)\//, answer: reply.error(401, TOKEN_EXPIRED_BODY) },
  ];
}

// ── Click-out spies ──────────────────────────────────────────────────────────
let spiesInstalled = false;

/** Linking.openURL and Share.share log to the console and open nothing. */
export function installClickOutSpies(): void {
  if (spiesInstalled) return;
  spiesInstalled = true;
  Linking.openURL = async (url: string) => {
    console.log(`[storybook] click-out ${url}`);
    return true;
  };
  Linking.canOpenURL = async () => true;
  Share.share = async (content) => {
    const c = content as { url?: string; message?: string };
    console.log(`[storybook] click-out share ${c.url ?? c.message ?? ''}`);
    return { action: Share.sharedAction };
  };
}

// ── Reset ────────────────────────────────────────────────────────────────────

/**
 * Reset every module singleton a story can touch (fe-inventory part 5):
 *  - secure store (tokens, saved profile, saved spends, recent searches, onboarded)
 *  - react-query: the app singleton queryClient (queries + mutations), focus
 *  - advisor session  → resetAdvisorSession()   (src/screens/advisor/advisorSession.ts)
 *  - payout lock      → __resetPayoutLock()     (src/query/mutations/withdraw.ts)
 *  - saved spends     → clearSavedSpends()      (src/lib/savedSpends.ts, in-memory snapshot)
 *  - contract reports → __resetContractReports() (so each story logs its own drift)
 * NOT resettable (no export; documented in README): OffersScreen
 * `promoSeenThisSession`, CardDetailScreenAndroid `pagerNudgeShown`,
 * CardArt `decodedImageUris`, analytics super props.
 */
export function resetStoryState(): void {
  void queryClient.cancelQueries();
  queryClient.clear();
  focusManager.setFocused(true);
  resetSecureStore();
  resetAdvisorSession();
  __resetPayoutLock();
  clearSavedSpends();
  __resetContractReports();
}

export interface PrepareOptions extends AuthSeed {
  api?: ApiParams;
  /** Runs after the reset and before the first child mounts (e.g. seed getAdvisorSession()). */
  beforeMount?: () => void;
}

/** Everything a harness does once, before its children mount. */
export function prepareStory({ api, beforeMount, ...seed }: PrepareOptions): void {
  installClickOutSpies();
  resetStoryState();
  seedAuth(seed);
  const auth = seed.auth ?? 'guest';
  installApiMock({ ...api, routes: [...authRoutes(auth), ...(api?.routes ?? [])] });
  beforeMount?.();
}

// Install the spies as soon as any harness module loads, so a story that
// renders a component with no harness wrapper is covered too.
installClickOutSpies();
