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

// Single switch for the whole app. Wire to EXPO_PUBLIC_STAGE later if needed.
export const STAGE: Stage = 'staging';

// Shared app identity sent to CashKaro.
const APP_VERSION = '4.6'; // x-chkr-app-version (from CK env)
const DEVICE = 'App'; // ?device=App on most CK calls

const CONFIG = {
  staging: {
    ck: {
      // helper_url root; sub-resources are paths under it
      // (e.g. /users/profile, /offers/...). See docs/api collections.
      baseUrl: 'https://ckapistaging.lmssecure.com/v1',
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
    ck: { baseUrl: '', apiKey: '', basicAuthUser: '', basicAuthPass: '', trackingHost: '' },
    bk: { baseUrl: '', partnerApiKey: '' },
  },
  prod: {
    // TODO: fill at prod cutover (see project-goal: staging → prod → stores).
    // trackingHost is the production CashKaro click-out host (e.g.
    // cktracking.cashkaro.com) — confirm with the CashKaro team before cutover.
    ck: { baseUrl: '', apiKey: '', basicAuthUser: '', basicAuthPass: '', trackingHost: '' },
    bk: { baseUrl: '', partnerApiKey: '' },
  },
} as const;

const active = CONFIG[STAGE];

/** CashKaro config + the headers every CK call shares. */
export const CK = {
  ...active.ck,
  appVersion: APP_VERSION,
  device: DEVICE,
  /** Base headers present on every CashKaro request. */
  headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.api+json',
      'x-chkr-app-version': APP_VERSION,
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
