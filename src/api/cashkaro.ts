/**
 * cashkaro.ts — CashKaro auth/user API (JSON:API).
 *
 * All calls go through the cards.xtra BFF (`EXPO_PUBLIC_API_BASE_URL/ck`). The
 * app holds no CashKaro key. Two kinds of call:
 *   1. guest ('aws') — sent with no Authorization; the BFF adds its own site
 *      token (GET /token with the mini apps key) and the x-api-key.
 *   2. user session — access_token + refresh_token returned by /login or
 *      /signupV1. Persisted via tokenStore; sent as Bearer and passed through
 *      by the BFF unchanged.
 *
 * Every request carries the shared CK headers (Accept/app-version);
 * writes add the vnd.api+json Content-Type. Responses are unwrapped from the
 * `{ data: { attributes } }` envelope before returning.
 */
import { Platform } from 'react-native';
import { CK } from '../config/env';
import { httpRequest } from './http/client';
import { otpValue } from './client';
import { ApiError } from './http/errors';
import { withUserToken } from './http/tokenManager';
import { reportHandled } from './http/report';
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
  /** Max extra attempts for transient failures (client default: 2 for a GET). */
  retries?: number;
  /** Response contract: [endpoint name, zod schema]. Mismatches are reported, never thrown. */
  contract?: [string, ZodTypeAny];
}

export async function ck<T = any>(path: string, opts: CkOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth, signal, timeoutMs, idempotent, retries, contract } = opts;
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
      retries,
      headers: bearer ? { ...headers, Authorization: `Bearer ${bearer}` } : headers,
    });
  // 'aws' (guest) calls go out without Authorization: the BFF adds its token.
  const res =
    auth === 'aws'
      ? await send()
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

// ── Who signed in: user id and segment (/login, /signupV1, /refreshtoken) ──

/** The segment fields of an auth response (`01_auth.md`). A field the
 *  response leaves out is undefined, so a refresh keeps the stored value. */
export interface UserSegment {
  /** `segment_id[]`, as strings. An empty list is a value (no segments). */
  ids?: string[];
  /** `new_user_segment_expiry_time_sec`: how long 888888888 lasts after joining. */
  newUserExpirySec?: number;
  /** `user_joined_at` (ISO date). */
  joinedAt?: string;
}

/** The user id and segment that /login, /signupV1 and /refreshtoken return. */
export interface AuthIdentity {
  /** `data.id`: the CashKaro user id, the `id=` slot of a click-out. */
  userId?: string;
  segment: UserSegment;
}

/** Read the user id and the segment fields of an auth response. */
function parseAuthIdentity(res: any): AuthIdentity {
  const rawId = res?.data?.id;
  const attrs = res?.data?.attributes ?? {};
  const segment: UserSegment = {};
  if (Array.isArray(attrs.segment_id)) {
    segment.ids = attrs.segment_id.map((s: unknown) => String(s ?? '').trim()).filter(Boolean);
  }
  const expiry = attrs.new_user_segment_expiry_time_sec;
  if (expiry !== null && expiry !== undefined && expiry !== '' && Number.isFinite(Number(expiry))) {
    segment.newUserExpirySec = Number(expiry);
  }
  if (typeof attrs.user_joined_at === 'string' && attrs.user_joined_at.trim()) {
    segment.joinedAt = attrs.user_joined_at.trim();
  }
  const userId = rawId === null || rawId === undefined ? '' : String(rawId).trim();
  return { userId: userId || undefined, segment };
}

/** The new-user segment (`01_auth.md`, segment_id). */
export const NEW_USER_SEGMENT_ID = '888888888';

/**
 * The `filter[segmentid]` value: the segment ids joined with commas (the
 * `openapi-mini.json` example is "1629794856,1629794721"). 888888888 is the
 * new-user segment: it expires `new_user_segment_expiry_time_sec` after
 * `user_joined_at`, so it is dropped after that. If either field is missing
 * or not readable, the ids are sent as given. No ids → undefined (no param).
 */
export function segmentFilterValue(segment: UserSegment | null | undefined, nowMs: number): string | undefined {
  const ids = segment?.ids ?? [];
  const joinedMs = segment?.joinedAt ? Date.parse(segment.joinedAt) : NaN;
  const expirySec = segment?.newUserExpirySec;
  const newUserExpired =
    Number.isFinite(joinedMs) && typeof expirySec === 'number' && Number.isFinite(expirySec)
      ? nowMs >= joinedMs + expirySec * 1000
      : false;
  const active = ids.filter((id) => !(id === NEW_USER_SEGMENT_ID && newUserExpired));
  const unique = [...new Set(active)];
  return unique.length ? unique.join(',') : undefined;
}

/** Where the offers calls read the signed-in user's segment. AuthContext sets
 *  it; unset, or a null result, means a guest and no segment is sent. */
let segmentSource: (() => UserSegment | null) | null = null;

export function configureSegmentSource(source: (() => UserSegment | null) | null): void {
  segmentSource = source;
}

/** `{ 'filter[segmentid]': ... }` when a segment is known, else `{}`. */
function segmentQuery(): Record<string, string> {
  let segment: UserSegment | null = null;
  try {
    segment = segmentSource ? segmentSource() : null;
  } catch {
    segment = null;
  }
  const value = segmentFilterValue(segment, Date.now());
  return value ? { 'filter[segmentid]': value } : {};
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

/** Verify the login OTP; returns the session tokens, the user id and the segment. */
export async function login(params: {
  mobileNumber: string;
  otpGuid: string;
  otp: string;
  deviceId: string;
}): Promise<AuthSession & AuthIdentity> {
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
          otp: otpValue(params.otp),
          device_info: buildDeviceInfo(params.deviceId),
        },
      },
    },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Login failed. Please check the OTP and try again.', 0, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token, ...parseAuthIdentity(res) };
}

// ── Signup (OTP) ─────────────────────────────────────────────────────────

/** Request a signup OTP; returns the otp_guid needed to complete signup. */
export async function signupOtp(mobileNumber: string): Promise<LoginOtpResult> {
  const res = await ck<any>('/signupotp', { contract: ['signupotp', Schemas.OtpRequestResponse],
    method: 'POST',
    auth: 'aws',
    // ?device=App, as the API doc specifies and /loginotp, /login and
    // /signupV1 already send. Without it the OTP was issued for another device
    // type than /signupV1 verifies against, and signup failed with 7002
    // ("Wrong OTP") even for the right code.
    query: { device: CK.device },
    body: { data: { type: 'user_otp', attributes: { mobile_number: Number(mobileNumber) } } },
  });
  const otpGuid = res?.data?.id;
  if (!otpGuid) throw new ApiError('Did not receive an OTP reference. Please retry.', 0, res);
  return { otpGuid, otpExpireSec: Number(res?.data?.attributes?.otp_expire_sec) || undefined };
}

/** Complete signup with OTP; returns the session tokens, the user id and the segment. */
export async function signup(params: {
  fullname: string;
  email: string;
  password: string;
  mobileNumber: string;
  otpGuid: string;
  otp: string;
  deviceId: string;
  referralUser?: string | null;
}): Promise<AuthSession & AuthIdentity> {
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
          otp: otpValue(params.otp),
          referral_user: params.referralUser ?? null,
          // ip_address (required by /signupV1) is set by the BFF from the
          // caller's real IP; the app cannot know its public IP.
          device_info: buildDeviceInfo(params.deviceId),
        },
      },
    },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Signup failed. Please try again.', 0, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token, ...parseAuthIdentity(res) };
}

// ── Session maintenance ──────────────────────────────────────────────────

/**
 * Exchange a refresh token for a fresh access token. Returns the rotated
 * refresh token too when CashKaro issues one (keep it, or the next refresh fails),
 * and the user id and segment fields the response carries (AuthContext keeps them).
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string } & AuthIdentity> {
  const res = await ck<any>('/refreshtoken', {
    method: 'POST',
    auth: 'aws',
    query: { device: CK.device },
    body: { data: { type: 'auth', attributes: { refresh_token: refreshToken } } },
  });
  const attrs = res?.data?.attributes;
  if (!attrs?.access_token) throw new ApiError('Session expired. Please log in again.', 401, res);
  return { accessToken: attrs.access_token, refreshToken: attrs.refresh_token || undefined, ...parseAuthIdentity(res) };
}


/** Fetch the logged-in user's earnings summary (confirmed/pending/cashback/rewards). */
export async function getEarnings(userToken: string, signal?: AbortSignal): Promise<any> {
  return ck('/users/earnings', { contract: ['users/earnings', Schemas.EarningsResponse], auth: { userToken }, query: { device: CK.device }, signal });
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
  paging: { page?: number; size?: number } | number = {},
  signal?: AbortSignal,
): Promise<any> {
  const { page = 1, size = 20 } = typeof paging === 'number' ? { size: paging } : paging;
  const query: Record<string, string | number> = {
    device: CK.device,
    'page[number]': page,
    'page[size]': size,
  };
  if (filters.status) query['filter[status]'] = filters.status;
  if (filters.cashbacktype) query['filter[cashbacktype]'] = filters.cashbacktype;
  if (filters.fromdate) query['filter[fromdate]'] = filters.fromdate;
  if (filters.todate) query['filter[todate]'] = filters.todate;
  return ck('/users/orders', { contract: ['users/orders', Schemas.OrdersResponse], auth: { userToken }, query, signal });
}

/** Fetch a single order's detail (amount, dates, status, timeline). */
export async function getOrderDetail(userToken: string, orderId: string, signal?: AbortSignal): Promise<any> {
  return ck(`/users/orders/${encodeURIComponent(orderId)}`, { contract: ['users/orders/:id', Schemas.OrderDetailResponse],
    auth: { userToken },
    signal,
    query: { device: CK.device },
  });
}

/** Fetch the logged-in user's profile. */
export async function getProfile(userToken: string, signal?: AbortSignal): Promise<UserProfile> {
  const res = await ck<any>('/users/profile', { contract: ['users/profile', Schemas.ProfileResponse],
    auth: { userToken },
    signal,
    query: { device: CK.device },
  });
  // `data` is an array of one `user` row (same shape as /users/earnings).
  const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
  const attrs = row?.attributes ?? {};
  // Attributes first: an attribute named `id` must never replace the row id
  // (the CashKaro user id that click-outs carry).
  return {
    ...attrs,
    id: row?.id,
    fullname: attrs.fullname,
    email: attrs.email,
    mobileNumber: attrs.mobile_number,
  };
}

// ── Offers (stores / cashback) ─────────────────────────────────────────────
// All use the aws-token (pre-login). JSON:API envelopes returned raw; the
// offers mapper unwraps data/attributes. /offers/category/* and /offers/{slug}
// add `filter[segmentid]` for a signed-in user with a known segment (a
// segmented store is returned only for its segment); a guest sends none.

/** All offer categories (33; filter to real top-level ones in the mapper).
 *  Fallback for the Offers strip when the miniapp category tree is empty. */
export async function getOfferCategories(): Promise<any> {
  return ck('/offers/categories', { auth: 'aws', query: { device: CK.device } });
}

/** Rows per category page. The API default is 10; production honours at least 2000 (2026-11-24). */
export const CATEGORY_PAGE_SIZE = 500;
/** Most pages one category call reads: 10000 rows at 500 a page, 2000 if the server caps a page at 100. */
export const CATEGORY_MAX_PAGES = 20;

/**
 * A card-rate list (`partialOk: false`) that ends below the server's
 * `meta.total_records`. Carries the rows that did load (deduped by id) and the
 * total, so the caller can choose: last good rows, else these short rows (a
 * short list hides some cards, a throw hides all). Never saved as last good.
 */
export class CardRateShortListError extends Error {
  readonly rows: any[];
  readonly total: number;
  constructor(rows: any[], rawCount: number, total: number) {
    super(`Offers category ended at ${rawCount} of ${total} rows`);
    this.name = 'CardRateShortListError';
    this.rows = rows;
    this.total = total;
  }
}

/**
 * Read every page of `/offers/category/<path>` (contract C8). Pages are read
 * one after another with page size 500. The loop stops:
 *   - when `meta.total_records` is known: at the total, counted in RAW rows
 *     (before the dedupe), so a duplicate store id never makes the list look
 *     short. A short page does NOT stop it: the server may cap the page size
 *     below 500, and it caps every page the same, so the page numbers stay
 *     consistent;
 *   - when the total is unknown: at a short page;
 *   - always: at an empty page, a page that adds no new row (a server that
 *     ignores `page[number]`), or 20 pages.
 * `links.next` is not used to stop: production sets it on the last page too.
 * Rows are deduped by row `id`. The same `query` goes on every page.
 * Page 1 failure throws. A later page failure (or a later page with no `data`
 * list) throws too, unless `partialOk`: then the rows of the pages read so far
 * are returned (and the error is reported). Without `partialOk`, a list whose
 * raw rows end below a known total throws CardRateShortListError. A page that
 * adds no new row does not count toward the raw rows (a server that ignores
 * `page[number]` repeats page 1).
 * Returns page 1's envelope with `data` replaced by all the rows. A page 1 body
 * with no `data` list is returned as is, so the mapper can tell an empty
 * category from a broken body.
 */
async function getCategoryPages(
  encodedPath: string,
  opts: { query: Record<string, string | number>; contract: [string, ZodTypeAny]; partialOk: boolean },
): Promise<any> {
  let first: any;
  let total = NaN; // meta.total_records of page 1; NaN when unknown
  const rows: any[] = [];
  let rawCount = 0; // rows of the pages that added a new row, before the dedupe
  const seen = new Set<string>();
  for (let page = 1; page <= CATEGORY_MAX_PAGES; page++) {
    let res: any;
    try {
      res = await ck<any>(`/offers/category/${encodedPath}`, {
        contract: opts.contract,
        auth: 'aws',
        query: { ...opts.query, 'page[size]': CATEGORY_PAGE_SIZE, 'page[number]': page },
      });
      if (page > 1 && !Array.isArray(res?.data)) {
        throw new ApiError('Offers category page had no data list', 0, res);
      }
    } catch (e) {
      if (page === 1 || !opts.partialOk) throw e;
      reportHandled(e, `ck category page ${page} (${encodedPath}): showing the pages read`);
      break;
    }
    if (page === 1) {
      first = res;
      if (!Array.isArray(res?.data)) return res;
      const raw = res?.meta?.total_records;
      if (raw !== null && raw !== undefined && raw !== '') total = Number(raw);
    }
    const pageRows: any[] = res.data;
    const before = rows.length;
    for (const row of pageRows) {
      const id = row?.id == null ? '' : String(row.id);
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      rows.push(row);
    }
    if (pageRows.length === 0 || rows.length === before) break; // empty, or nothing new
    rawCount += pageRows.length;
    if (Number.isFinite(total)) {
      if (rawCount >= total) break;
    } else if (pageRows.length < CATEGORY_PAGE_SIZE) {
      break;
    }
  }
  // The loop can end below a known total (an empty page, a page with no new
  // row, the cap). Without `partialOk` that short list is no good list: a
  // short card-rate list would hide cards. The caller decides (useCards).
  if (!opts.partialOk && Number.isFinite(total) && rawCount < total) {
    throw new CardRateShortListError(rows, rawCount, total);
  }
  return { ...first, data: rows };
}

/**
 * Stores within a category. Accepts a category PATH — usually nested
 * "parent/sub" (e.g. "home-categories-exclusive/home-kitchen-offers"), the
 * same shape the website uses; a single segment also works. Slashes are
 * preserved (only the segments are encoded).
 * Reads every page (getCategoryPages; "More" has 1573 stores, 4 pages). A
 * later page failure keeps the pages read (Q6). Returns one
 * `{ data, meta, links }` envelope, as one page did.
 */
export async function getCategoryOffers(categoryPath: string): Promise<any> {
  const path = categoryPath.split('/').map(encodeURIComponent).join('/');
  return getCategoryPages(path, {
    contract: ['offers/category', Schemas.OffersByCategoryResponse],
    // The segment is read once, so every page of one call sends the same value.
    query: { device: CK.device, ...segmentQuery() },
    partialOk: true,
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
    query: { device: CK.device, 'page[size]': 1, include: 'categories', ...segmentQuery() },
  });
}

/** Full store/brand page for an offer (e.g. "flipkart"). */
export async function getOfferStore(storeSlug: string): Promise<any> {
  return ck(`/offers/${encodeURIComponent(storeSlug)}`, { contract: ['offers/:slug', Schemas.MerchantOfferResponse],
    auth: 'aws',
    query: { device: CK.device, include: 'coupons,secondary_cashback,related_offers', ...segmentQuery() },
  });
}

// ── Credit-card stores (rate source) ───────────────────────────────────────
// BankKaro is the card catalog, but the user-facing reward (e.g. SBI Cashback =
// ₹1200) must come from CashKaro's store record, NOT BankKaro's `commission`.
// CashKaro exposes the card stores inside the `home-categories-exclusive`
// category (the offers API has no by-store-id lookup); we page it once and
// index it by store id (+ name fallback) in cardRates.ts. Keyed by `ck_store_id`
// from each BankKaro card — see docs/archive/INTEGRATION.md "CashKaro rate + tracking".
const CARD_RATE_CATEGORY = 'home-categories-exclusive';

/**
 * All stores in the card-rate category. Reads every page with the shared
 * paging helper (page size 500; 289 rows = 1 page in production, 2026-11-24).
 * Any page failure throws: a partial list would hide cards, so the caller
 * keeps its last good rows instead (contract C8). A list that ends below the
 * total throws CardRateShortListError, which carries the rows that loaded.
 * Returns the flat `data[]` of offer rows, deduped by id; cardRates.ts builds the index.
 */
export async function getCardRateStores(): Promise<any[]> {
  // No `filter[segmentid]` here: it is not known whether the filter restricts
  // the card stores returned (user decision 2026-11-23). Offers category and
  // store calls keep it.
  const res = await getCategoryPages(CARD_RATE_CATEGORY, {
    contract: ['offers/category (card rates)', Schemas.OffersByCategoryResponse],
    query: { device: CK.device },
    partialOk: false,
  });
  return Array.isArray(res?.data) ? res.data : [];
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
