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
    // TODO: fill when a local backend exists.
    ck: { baseUrl: '', appVersion: '4.6', apiKey: '', basicAuthUser: '', basicAuthPass: '', trackingHost: '' },
    bk: { baseUrl: '', partnerApiKey: '' },
  },
  prod: {
    ck: {
      // CK Mini Apps production host (Postman "ck-miniapp-apis" collection).
      baseUrl: 'https://ckminapps.com/v1',
      // ckminapps rejects every other app version with 401 (verified: 4.6 → 401).
      appVersion: '4.9',
      apiKey: process.env.EXPO_PUBLIC_CK_API_KEY ?? '',
      // Prod /token needs only x-api-key; Basic auth is optional (empty is fine).
      basicAuthUser: process.env.EXPO_PUBLIC_CK_BASIC_USER ?? '',
      basicAuthPass: process.env.EXPO_PUBLIC_CK_BASIC_PASS ?? '',
      // TODO: production click-out host (e.g. cktracking.cashkaro.com) —
      // confirm with the CashKaro team. Empty = card "Apply" falls back to
      // BankKaro's network_url instead of a CashKaro-attributed link.
      trackingHost: '',
    },
    bk: {
      // BankKaro PROD host (Great.Cards Partner Guide).
      baseUrl: 'https://platform.bankkaro.com/partner',
      partnerApiKey: process.env.EXPO_PUBLIC_BK_PARTNER_KEY ?? '',
    },
  },
} as const;

const active = CONFIG[STAGE];

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
