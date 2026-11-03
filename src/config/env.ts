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

// Single switch for the whole app, set by EXPO_PUBLIC_STAGE in .env (or the
// EAS build profile's env). Anything other than 'local' / 'prod' is staging.
const RAW_STAGE = process.env.EXPO_PUBLIC_STAGE;
export const STAGE: Stage = RAW_STAGE === 'prod' || RAW_STAGE === 'local' ? RAW_STAGE : 'staging';

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
    // Point at a local/dev backend via .env. Secrets come from the same keys.
    ck: {
      baseUrl: process.env.EXPO_PUBLIC_CK_BASE_URL ?? '',
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
    // Filled from .env / the EAS production profile at cutover. Production
    // hosts and keys are NOT committed. Before prod, the CK basic-auth and the
    // BK partner key should sit behind a server proxy (see docs/GAP_AUDIT.md P0
    // #5); when that exists, point the base URLs at the proxy and leave the
    // secret keys empty.
    ck: {
      baseUrl: process.env.EXPO_PUBLIC_CK_BASE_URL ?? '',
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
};

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
