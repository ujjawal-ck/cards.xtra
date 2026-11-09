/**
 * env.ts — environment configuration for the two backends.
 *
 * The app talks to TWO independent APIs, each with its own host + auth:
 *   - CashKaro (CK)  → auth, user, offers, payments  (JSON:API format)
 *   - BankKaro (BK)  → CardGenius catalog (cards, details, eligibility, filters)
 *
 * STAGE switches the whole config between environments. Only `staging` is
 * filled today (the values shipped in the Postman environments); add
 * `local` / `prod` hosts when they exist and flip STAGE.
 *
 * SECURITY NOTE: the api keys / basic-auth below are bundled into the app —
 * there is no way to keep a client-side secret without a server proxy. These
 * are STAGING credentials and acceptable for the demo. Before production,
 * front these calls with a proxy (or accept that staging keys ship in the
 * binary). Do NOT paste production secrets here without that conversation.
 *
 * Secret values are read from `.env` (gitignored; copy `.env.example`).
 * EXPO_PUBLIC_* values are still inlined into the JS bundle at build time:
 * this keeps them out of git, it does NOT make them secret on device.
 */
import { Platform } from 'react-native';

type Stage = 'local' | 'staging' | 'prod';

// Single switch for the whole app, read from EXPO_PUBLIC_STAGE in .env
// (staging | prod | local). Defaults to staging; anything unrecognised also
// falls back to staging so a typo can never silently point at prod.
const STAGES: readonly Stage[] = ['local', 'staging', 'prod'];
const envStage = process.env.EXPO_PUBLIC_STAGE as Stage | undefined;
export const STAGE: Stage = envStage && STAGES.includes(envStage) ? envStage : 'staging';

// x-chkr-app-version comes from CONFIG per stage (staging 4.6, prod 4.9:
// ckminapps.com rejects anything else with a 401). Override with
// EXPO_PUBLIC_CK_APP_VERSION if CashKaro bumps it.
const APP_VERSION_OVERRIDE = process.env.EXPO_PUBLIC_CK_APP_VERSION;
const DEVICE = 'App'; // ?device=App on most CK calls

const CONFIG = {
  staging: {
    ck: {
      // helper_url root; sub-resources are paths under it
      // (e.g. /users/profile, /offers/...). See docs/api collections.
      baseUrl: 'https://ckapistaging.lmssecure.com/v1',
      // x-chkr-app-version (from the CK staging env).
      appVersion: '4.6',
      apiKey: process.env.EXPO_PUBLIC_CK_API_KEY ?? '',
      basicAuthUser: process.env.EXPO_PUBLIC_CK_BASIC_USER ?? '',
      basicAuthPass: process.env.EXPO_PUBLIC_CK_BASIC_PASS ?? '',
      // CashKaro click-out / tracking host. The card "Apply Now" link is built
      // as `https://<trackingHost>/visitretailer/app/<ck_store_id>?id=<userId>`
      // (same redirect the offers `cashback_url` uses) so the click is
      // attributed through CashKaro, not BankKaro's network_url. Verified: the
      // staging host resolves the production ck_store_id from BankKaro.
      trackingHost: 'cktracking.lmssecure.com',
    },
    bk: {
      baseUrl: 'https://platform.bankkaro.com/partner',
      // partner-token used to mint the per-session jwttoken
      partnerApiKey: process.env.EXPO_PUBLIC_BK_PARTNER_KEY ?? '',
    },
  },
  local: {
    // Point at a local/dev backend via .env. Secrets come from the same keys.
    ck: {
      baseUrl: process.env.EXPO_PUBLIC_CK_BASE_URL ?? '',
      appVersion: '4.6',
      apiKey: process.env.EXPO_PUBLIC_CK_API_KEY ?? '',
      basicAuthUser: process.env.EXPO_PUBLIC_CK_BASIC_USER ?? '',
      basicAuthPass: process.env.EXPO_PUBLIC_CK_BASIC_PASS ?? '',
      trackingHost: process.env.EXPO_PUBLIC_CK_TRACKING_HOST ?? '',
    },
    bk: {
      baseUrl: process.env.EXPO_PUBLIC_BK_BASE_URL ?? '',
      partnerApiKey: process.env.EXPO_PUBLIC_BK_PARTNER_KEY ?? '',
    },
  },
  prod: {
    ck: {
      // CK Mini Apps production host (Postman "ck-miniapp-apis" collection).
      baseUrl: process.env.EXPO_PUBLIC_CK_BASE_URL || 'https://ckminapps.com/v1',
      // ckminapps rejects every other app version with 401 (verified: 4.6 → 401).
      appVersion: '4.9',
      apiKey: process.env.EXPO_PUBLIC_CK_API_KEY ?? '',
      // Prod /token needs only x-api-key; Basic auth is optional (empty is fine).
      basicAuthUser: process.env.EXPO_PUBLIC_CK_BASIC_USER ?? '',
      basicAuthPass: process.env.EXPO_PUBLIC_CK_BASIC_PASS ?? '',
      // Production click-out host: set EXPO_PUBLIC_CK_TRACKING_HOST once the
      // CashKaro team confirms it. Empty = card "Apply" falls back to
      // BankKaro's network_url instead of a CashKaro-attributed link.
      trackingHost: process.env.EXPO_PUBLIC_CK_TRACKING_HOST ?? '',
    },
    bk: {
      // BankKaro PROD host (Great.Cards Partner Guide).
      baseUrl: process.env.EXPO_PUBLIC_BK_BASE_URL || 'https://platform.bankkaro.com/partner',
      partnerApiKey: process.env.EXPO_PUBLIC_BK_PARTNER_KEY ?? '',
    },
  },
};

const active = {
  ...CONFIG[STAGE],
  ck: { ...CONFIG[STAGE].ck, appVersion: APP_VERSION_OVERRIDE || CONFIG[STAGE].ck.appVersion },
};

/** CashKaro config + the headers every CK call shares. */
export const CK = {
  ...active.ck,
  device: DEVICE,
  /** Base headers present on every CashKaro request. */
  headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.api+json',
      'x-chkr-app-version': active.ck.appVersion,
      'x-api-key': active.ck.apiKey,
    };
  },
};

/** BankKaro (CardGenius) config. */
export const BK = {
  ...active.bk,
};

/** Coarse platform string used in device_info payloads. */
export const PLATFORM = Platform.OS;

/**
 * Missing settings for the active stage (empty array = good to go). Checked
 * once at startup: dev builds warn loudly, release builds report to
 * Crashlytics, so a misconfigured build is caught before users hit errors.
 */
export function configProblems(): string[] {
  const problems: string[] = [];
  if (!CK.baseUrl) problems.push(`CK base URL is empty for stage "${STAGE}"`);
  if (!CK.apiKey) problems.push(`CK API key is empty for stage "${STAGE}"`);
  if (!CK.trackingHost) problems.push(`CK tracking host is empty for stage "${STAGE}"`);
  if (!BK.baseUrl) problems.push(`BK base URL is empty for stage "${STAGE}"`);
  if (!BK.partnerApiKey) problems.push(`BK partner key is empty for stage "${STAGE}"`);
  return problems;
}
