/**
 * cashkaro.ts — CashKaro auth/user API (JSON:API).
 *
 * Two-tier token model:
 *   1. aws-token — short-lived bootstrap token from GET /token (HTTP Basic
 *      auth). Required as Bearer on the pre-login calls (loginotp, login,
 *      signupotp, signupV1, refreshtoken). Cached in memory here.
 *   2. user session — access_token + refresh_token returned by /login or
 *      /signupV1. Persisted via tokenStore; passed in by callers for
 *      authenticated user endpoints.
 *
 * Every request carries the shared CK headers (Accept/x-api-key/app-version);
 * writes add the vnd.api+json Content-Type. Responses are unwrapped from the
 * `{ data: { attributes } }` envelope before returning.
 */
import { Platform } from 'react-native';
import { CK } from '../config/env';
import { httpRequest, basicAuthHeader } from './http/client';
import { ApiError } from './http/errors';
import { createCachedToken, withCachedToken, withUserToken } from './http/tokenManager';
import type { ZodTypeAny } from 'zod';
import { checkContract } from './schemas/validate';
import * as Schemas from './schemas';
import type { LoginOtpResult, AuthSession, UserProfile } from './types';

type Auth = 'aws' | 'user' | { userToken: string } | undefined;

interface CkOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: Auth;
  /** React Query's cancellation signal. */
  signal?: AbortSignal;
  /** Per-call deadline; payments use a longer one. */
  timeoutMs?: number;
  /** Mark a write safe to retry on transient failures. */
  idempotent?: boolean;
  /** Response contract: [endpoint name, zod schema]. Mismatches are reported, never thrown. */
  contract?: [string, ZodTypeAny];
}

// App token (GET /token). Cached until shortly before its JWT exp, minted
// single-flight, re-minted once on a 401/403 (see tokenManager.ts).
const APP_TOKEN_FALLBACK_TTL = 25 * 60 * 1000;
const appToken = createCachedToken(async () => {
  const res = await httpRequest<any>(CK.baseUrl, '/token', {
    method: 'GET',
    headers: {
      ...CK.headers(),
      // Basic auth is only needed where CashKaro issued it (staging);
      // ckminapps.com /token works with x-api-key alone.
      ...(CK.basicAuthUser ? { Authorization: basicAuthHeader(CK.basicAuthUser, CK.basicAuthPass) } : {}),
    },
  });
  const value = res?.data?.attributes?.token;
  if (!value) throw new ApiError('Could not obtain access token from CashKaro.', 0, res);
  return value as string;
}, APP_TOKEN_FALLBACK_TTL);

/** Force the next pre-login call to re-mint an aws-token. */
export function resetAwsToken(): void {
  appToken.invalidate();
}

// Public IP — /signupV1 validates a required `ip_address` (login does not).
// A managed Expo runtime can't read the LAN IP, so resolve the public one
// once (cached) via ipify; fall back to a format-valid placeholder if the
// lookup fails so signup never blocks on it.
let publicIp: string | null = null;
async function getPublicIp(): Promise<string> {
  if (publicIp) return publicIp;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = await res.json();
    if (json?.ip) publicIp = String(json.ip);
  } catch {
    // ignore — fall through to the placeholder
  }
  return publicIp ?? '0.0.0.0';
}

export async function ck<T = any>(path: string, opts: CkOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth, signal, timeoutMs, idempotent, contract } = opts;
  const headers: Record<string, string> = { ...CK.headers() };
  // JSON:API content-type for write bodies — EXCEPT multipart (FormData file
  // uploads), where the runtime must set the boundary content-type itself.
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isMultipart) headers['Content-Type'] = 'application/vnd.api+json';
  const send = (bearer?: string) =>
    httpRequest<T>(CK.baseUrl, path, {
      method,
      body,
      query,
      signal,
      timeoutMs,
      idempotent,
      headers: bearer ? { ...headers, Authorization: `Bearer ${bearer}` } : headers,
    });
  const res =
    auth === 'aws'
      ? await withCachedToken(appToken, send)
      : auth === 'user'
        ? await withUserToken(send)
        : auth && 'userToken' in auth
          ? await withUserToken(send, auth.userToken)
          : await send();
  if (contract) checkContract(contract[0], contract[1], res);
  return res;
}

/**
 * device_info block the login/signup endpoints expect (CK doc, "Login from
 * App"). Only the documented fields are sent, with real values:
 *   - device_unique_id: stable per-install UUID (tokenStore)
 *   - fcm_id: must be non-empty and match what /users/logout sends. There is
 *     no FCM registration yet, so it is the device id; swap in the FCM token
 *     when push is added.
 *   - imei_number: Android no longer exposes IMEI to apps; the doc's
 *     placeholder of zeros is what CK expects.
 *   - device_client: the real OS ("Android" / "iOS").
 * We no longer send invented values (lat/long 0, network "wifi", a fake
 * advertising id). Verified: staging /login accepts this block (200).
 */
function buildDeviceInfo(deviceId: string): Record<string, string> {
  return {
    fcm_id: deviceId,
    device_unique_id: deviceId,
    imei_number: '000000000000000',
    device_client: Platform.OS === 'ios' ? 'iOS' : 'Android',
    app_version: CK.appVersion,
    os_version: String(Platform.Version),
  };
}

// ── Login (OTP) ──────────────────────────────────────────────────────────

/** Request a login OTP; returns the otp_guid needed to verify. */
export async function loginOtp(mobileNumber: string): Promise<LoginOtpResult> {
  const res = await ck<any>('/loginotp', { contract: ['loginotp', Schemas.OtpRequestResponse],
    method: 'POST',
    auth: 'aws',
    query: { device: CK.device },
    body: { data: { type: 'user_otp', attributes: { mobile_number: Number(mobileNumber) } } },
  });
  const otpGuid = res?.data?.id;
  if (!otpGuid) throw new ApiError('Did not receive an OTP reference. Please retry.', 0, res);
  return { otpGuid, otpExpireSec: Number(res?.data?.attributes?.otp_expire_sec) || undefined };
}

/** Verify the login OTP; returns the user session tokens. */
export async function login(params: {
  mobileNumber: string;
  otpGuid: string;
  otp: string;
  deviceId: string;
}): Promise<AuthSession> {
  const res = await ck<any>('/login', { contract: ['login', Schemas.AuthTokensResponse],
    method: 'POST',
    auth: 'aws',
    query: { device: CK.device },
    body: {
      data: {
        type: 'auth',
        attributes: {
          mobile_number: Number(params.mobileNumber),
          otp_guid: params.otpGuid,
          otp: Number(params.otp),
          device_info: buildDeviceInfo(params.deviceId),
        },
      },
    },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Login failed. Please check the OTP and try again.', 0, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token };
}

// ── Signup (OTP) ─────────────────────────────────────────────────────────

/** Request a signup OTP; returns the otp_guid needed to complete signup. */
export async function signupOtp(mobileNumber: string): Promise<LoginOtpResult> {
  const res = await ck<any>('/signupotp', { contract: ['signupotp', Schemas.OtpRequestResponse],
    method: 'POST',
    auth: 'aws',
    body: { data: { type: 'user_otp', attributes: { mobile_number: Number(mobileNumber) } } },
  });
  const otpGuid = res?.data?.id;
  if (!otpGuid) throw new ApiError('Did not receive an OTP reference. Please retry.', 0, res);
  return { otpGuid, otpExpireSec: Number(res?.data?.attributes?.otp_expire_sec) || undefined };
}

/** Complete signup with OTP; returns the user session tokens. */
export async function signup(params: {
  fullname: string;
  email: string;
  password: string;
  mobileNumber: string;
  otpGuid: string;
  otp: string;
  deviceId: string;
  referralUser?: string | null;
}): Promise<AuthSession> {
  const ip = await getPublicIp();
  const res = await ck<any>('/signupV1', { contract: ['signupV1', Schemas.AuthTokensResponse],
    method: 'POST',
    auth: 'aws',
    query: { device: CK.device },
    body: {
      data: {
        type: 'auth',
        attributes: {
          fullname: params.fullname,
          email: params.email,
          password: params.password,
          mobile_number: Number(params.mobileNumber),
          otp_guid: params.otpGuid,
          otp: Number(params.otp),
          referral_user: params.referralUser ?? null,
          // Required by /signupV1 (login doesn't need it). Top-level only —
          // device_info has a strict schema that rejects unknown keys ("the
          // device info must be a valid data").
          ip_address: ip,
          device_info: buildDeviceInfo(params.deviceId),
        },
      },
    },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Signup failed. Please try again.', 0, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token };
}

// ── Session maintenance ──────────────────────────────────────────────────

/**
 * Exchange a refresh token for a fresh access token. Returns the rotated
 * refresh token too when CashKaro issues one (keep it, or the next refresh fails).
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  const res = await ck<any>('/refreshtoken', {
    method: 'POST',
    auth: 'aws',
    query: { device: CK.device },
    body: { data: { type: 'auth', attributes: { refresh_token: refreshToken } } },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Session expired. Please log in again.', 401, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token || undefined };
}


/** Fetch the logged-in user's earnings summary (confirmed/pending/cashback/rewards). */
export async function getEarnings(userToken: string): Promise<any> {
  return ck('/users/earnings', { contract: ['users/earnings', Schemas.EarningsResponse], auth: { userToken }, query: { device: CK.device } });
}

/** Server-side order-list filters (CashKaro `/users/orders` `filter[*]` params).
 *  All optional; comma-join multi-selects. Dates are `yyyy-MM-dd`. */
export interface OrdersApiFilters {
  /** Comma-joined cashback_status values, e.g. "pending,confirmed". */
  status?: string;
  /** Comma-joined cashback types, e.g. "cashback,rewards". */
  cashbacktype?: string;
  fromdate?: string;
  todate?: string;
}

/**
 * Fetch the logged-in user's orders ("My Order Details" list).
 * JSON:API `data[]` of `myorder` rows; mapped by ordersMapper.
 * Optional server-side filters map to `filter[...]` query params.
 */
export async function getOrders(
  userToken: string,
  filters: OrdersApiFilters = {},
  pageSize = 20
): Promise<any> {
  const query: Record<string, string | number> = {
    device: CK.device,
    'page[size]': pageSize,
  };
  if (filters.status) query['filter[status]'] = filters.status;
  if (filters.cashbacktype) query['filter[cashbacktype]'] = filters.cashbacktype;
  if (filters.fromdate) query['filter[fromdate]'] = filters.fromdate;
  if (filters.todate) query['filter[todate]'] = filters.todate;
  return ck('/users/orders', { contract: ['users/orders', Schemas.OrdersResponse], auth: { userToken }, query });
}

/** Fetch a single order's detail (amount, dates, status, timeline). */
export async function getOrderDetail(userToken: string, orderId: string): Promise<any> {
  return ck(`/users/orders/${encodeURIComponent(orderId)}`, { contract: ['users/orders/:id', Schemas.OrderDetailResponse],
    auth: { userToken },
    query: { device: CK.device },
  });
}

/** Fetch the logged-in user's profile. */
export async function getProfile(userToken: string): Promise<UserProfile> {
  const res = await ck<any>('/users/profile', { contract: ['users/profile', Schemas.ProfileResponse],
    auth: { userToken },
    query: { device: CK.device },
  });
  // `data` is an array of one `user` row (same shape as /users/earnings).
  const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
  const attrs = row?.attributes ?? {};
  return {
    id: row?.id,
    fullname: attrs.fullname,
    email: attrs.email,
    mobileNumber: attrs.mobile_number,
    ...attrs,
  };
}

// ── Offers (stores / cashback) ─────────────────────────────────────────────
// All use the aws-token (pre-login). JSON:API envelopes returned raw; the
// offers mapper unwraps data/attributes.


/**
 * Stores within a category. Accepts a category PATH — usually nested
 * "parent/sub" (e.g. "home-categories-exclusive/home-kitchen-offers"), the
 * same shape the website uses; a single segment also works. Slashes are
 * preserved (only the segments are encoded).
 */
export async function getCategoryOffers(categoryPath: string): Promise<any> {
  const path = categoryPath.split('/').map(encodeURIComponent).join('/');
  return ck(`/offers/category/${path}`, { contract: ['offers/category', Schemas.OffersByCategoryResponse],
    auth: 'aws',
    // Default page size is 10 — request a large page so the grid shows the
    // full category (e.g. fashion has 39 stores, not 10).
    query: { device: CK.device, 'page[size]': 100 },
  });
}

/**
 * Category tree for a PARENT offer category (e.g. "miniapp"). Returns the
 * parent's `included` block with `categories.relationships.sub_categories`,
 * which drives the Offers strip dynamically (label + slug per sub-category).
 * page[size]=1 because only the included categories are needed here, not the
 * parent's full store list. See offerCategories.buildOfferCategoriesFromApi.
 */
export async function getOfferCategoryTree(parentSlug: string): Promise<any> {
  return ck(`/offers/category/${encodeURIComponent(parentSlug)}`, {
    auth: 'aws',
    query: { device: CK.device, 'page[size]': 1, include: 'categories' },
  });
}

/** Full store/brand page for an offer (e.g. "flipkart"). */
export async function getOfferStore(storeSlug: string): Promise<any> {
  return ck(`/offers/${encodeURIComponent(storeSlug)}`, { contract: ['offers/:slug', Schemas.MerchantOfferResponse],
    auth: 'aws',
    query: { device: CK.device, include: 'coupons,secondary_cashback,related_offers' },
  });
}

// ── Credit-card stores (rate source) ───────────────────────────────────────
// BankKaro is the card catalog, but the user-facing reward (e.g. SBI Cashback =
// ₹1200) must come from CashKaro's store record, NOT BankKaro's `commission`.
// CashKaro exposes the card stores inside the `home-categories-exclusive`
// category (the offers API has no by-store-id lookup); we page it once and
// index it by store id (+ name fallback) in cardRates.ts. Keyed by `ck_store_id`
// from each BankKaro card — see INTEGRATION.md "CashKaro rate + tracking".
const CARD_RATE_CATEGORY = 'home-categories-exclusive';

/**
 * All stores in the card-rate category. Pages through (page size 100) until a
 * short page, so the full set is returned (≈288 stores / 3 pages on staging).
 * Returns the flat `data[]` of offer rows; cardRates.ts builds the index.
 */
export async function getCardRateStores(): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await ck<any>(`/offers/category/${CARD_RATE_CATEGORY}`, { contract: ['offers/category (card rates)', Schemas.OffersByCategoryResponse],
      auth: 'aws',
      query: { device: CK.device, 'page[size]': 100, 'page[number]': page },
    });
    const rows: any[] = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    if (rows.length < 100) break; // last page
  }
  return all;
}

/**
 * The CashKaro click-out URL for a credit card, built from BankKaro's
 * `ck_store_id`. Same `…/visitretailer/app/<id>?id=` redirect the offers
 * `cashback_url` uses — the empty `id=` slot is the user id, filled at click
 * time via `withTrackingUser` (see openUrl.ts). Routes the click through
 * CashKaro for attribution instead of BankKaro's `network_url`.
 * Returns undefined when the store id or tracking host is missing.
 */
export function cardTrackingUrl(ckStoreId?: number | string | null): string | undefined {
  const id = ckStoreId == null ? '' : String(ckStoreId).trim();
  if (!id || id === '0' || !CK.trackingHost) return undefined;
  return `https://${CK.trackingHost}/visitretailer/app/${encodeURIComponent(id)}?id=`;
}

/** Invalidate the session server-side. */
export async function logout(params: { userToken: string; deviceId: string }): Promise<void> {
  await ck('/users/logout', {
    method: 'POST',
    auth: { userToken: params.userToken },
    query: { device: CK.device },
    body: {
      // fcm_id must be non-empty: staging rejects '' with 422 "The fcm id field
      // is required" (verified 2026-11-03), which silently skipped logout. Same
      // fallback as buildDeviceInfo: the per-install deviceId.
      data: { type: 'user', attributes: { fcm_id: params.deviceId, device_unique_id: params.deviceId } },
    },
  });
}
