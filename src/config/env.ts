/**
 * env.ts — environment configuration.
 *
 * The app talks to ONE host: the cards.xtra BFF (EXPO_PUBLIC_API_BASE_URL).
 * The BFF forwards to the two partner APIs and holds their keys:
 *   - `/ck/*` → CashKaro mini apps (auth, user, offers, payments; JSON:API)
 *   - `/bk/*` → BankKaro CardGenius (cards, details, eligibility, filters)
 *
 * No partner key, token or Basic auth lives in the app (decision 2026-11-17).
 * EXPO_PUBLIC_* values are compiled into the bundle, so never add a secret
 * here. Partner keys go in the BFF's Vercel env (see bff/.env.example).
 *
 * STAGE still selects the non-secret per-stage values below (x-chkr-app-version
 * and the click-out tracking host). Which partner host is used is the BFF's
 * choice.
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

// The BFF. Local dev: http://127.0.0.1:8787 (`npm run dev` in bff/).
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

const CONFIG = {
  staging: {
    ck: {
      // x-chkr-app-version (from the CK staging env).
      appVersion: '4.6',
      // CashKaro click-out / tracking host. The card "Apply Now" link is built
      // as `https://<trackingHost>/visitretailer/app/<ck_store_id>?id=<userId>`
      // (same redirect the offers `cashback_url` uses) so the click is
      // attributed through CashKaro, not BankKaro's network_url. Verified: the
      // staging host resolves the production ck_store_id from BankKaro.
      trackingHost: 'cktracking.lmssecure.com',
    },
  },
  local: {
    ck: {
      appVersion: '4.6',
      trackingHost: process.env.EXPO_PUBLIC_CK_TRACKING_HOST ?? '',
    },
  },
  prod: {
    ck: {
      // ckminapps rejects every other app version with 401 (verified: 4.6 → 401).
      appVersion: '4.9',
      // Production click-out host: set EXPO_PUBLIC_CK_TRACKING_HOST once the
      // CashKaro team confirms it. Empty = card "Apply" falls back to
      // BankKaro's network_url instead of a CashKaro-attributed link.
      trackingHost: process.env.EXPO_PUBLIC_CK_TRACKING_HOST ?? '',
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
  // Empty when the BFF URL is unset, so http/client's empty-base guard fires
  // ("not configured") instead of a misleading network error.
  baseUrl: API_BASE_URL ? `${API_BASE_URL}/ck` : '',
  device: DEVICE,
  /** Base headers present on every CashKaro request. */
  headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.api+json',
      'x-chkr-app-version': active.ck.appVersion,
    };
  },
};

/** BankKaro (CardGenius) config. */
export const BK = {
  baseUrl: API_BASE_URL ? `${API_BASE_URL}/bk` : '',
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
  if (!API_BASE_URL) problems.push('EXPO_PUBLIC_API_BASE_URL (the BFF) is empty');
  if (!CK.trackingHost) problems.push(`CK tracking host is empty for stage "${STAGE}"`);
  return problems;
}
