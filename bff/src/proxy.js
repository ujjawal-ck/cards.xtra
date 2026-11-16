/**
 * cards.xtra BFF: a thin pass-through in front of CashKaro mini apps and
 * BankKaro. The app holds no partner key. This server adds them.
 *
 *   /ck/<path>  -> CK_BASE_URL/<path>   (x-api-key added)
 *   /bk/<path>  -> BK_BASE_URL/<path>   (partner-token added)
 *   /health     -> config check, no values
 *
 * CashKaro auth rule (decision 2026-11-17, option A):
 *   - The app sends `Authorization` -> it is the user token. Forward it as-is.
 *     A 401 goes back to the app, which refreshes and retries.
 *   - No `Authorization` -> add the server's site token. On 401/403, re-mint
 *     once and retry.
 *
 * Never log request or response bodies: they hold OTPs, tokens, UPI ids and
 * eligibility details.
 */
import { BK_ROUTES, CK_ROUTES, OTP_ROUTES, canonicalPath, matchRoute } from './routes.js';
import { UpstreamAuthError, bkPartnerToken, ckSiteToken } from './tokens.js';
import { createRateLimiter } from './ratelimit.js';

const MAX_BODY_BYTES = 4_400_000; // Vercel rejects bodies over 4.5 MB.
// maxDuration is 60 s. A user call is one attempt (payouts can take ~30 s).
// A guest call may run twice (re-mint + retry), so each attempt gets less.
const USER_TIMEOUT_MS = 55_000;
const GUEST_TIMEOUT_MS = 25_000;

/**
 * Headers the app may send that are passed to CashKaro. x-chkr-app-version is
 * NOT forwarded: ckminapps.com accepts one version only, so the server sets it.
 */
const CK_FORWARD = [
  'accept',
  'content-type',
  'authorization',
  'x-chkr-app-platform',
  'x-chkr-app',
  'x-user-agent',
];
const BK_FORWARD = ['accept', 'content-type'];

export function readConfig(env = process.env) {
  return {
    ckBaseUrl: (env.CK_BASE_URL || 'https://ckminapps.com/v1').replace(/\/+$/, ''),
    ckApiKey: env.CK_API_KEY || '',
    ckAppVersion: env.CK_APP_VERSION || '4.9',
    ckBasicUser: env.CK_BASIC_USER || '',
    ckBasicPass: env.CK_BASIC_PASS || '',
    bkBaseUrl: (env.BK_BASE_URL || '').replace(/\/+$/, ''),
    bkPartnerKey: env.BK_PARTNER_KEY || '',
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** JSON:API error body, the shape the app's error parser reads. */
function apiError(status, code, detail) {
  return jsonResponse(status, { errors: [{ status: String(status), code, title: detail, detail }] });
}

export function clientIpOf(request, fallback = '') {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || fallback;
}

function pickHeaders(request, names) {
  const out = {};
  for (const n of names) {
    const v = request.headers.get(n);
    if (v) out[n] = v;
  }
  return out;
}

/** Digits only, last 10: one key per Indian mobile number however it is written. */
export function normaliseMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * True when a CashKaro 401 is about the bearer token (expired or malformed),
 * not a business error such as a wrong OTP. Only then is a guest call retried,
 * so an OTP or login POST is never sent twice for another reason.
 */
async function isTokenFailure(res) {
  if (res.status !== 401) return false;
  const text = await res.text().catch(() => '');
  return /jwt|token|unauthori[sz]ed/i.test(text);
}

function parseJson(buf) {
  try {
    return JSON.parse(Buffer.from(buf).toString('utf8'));
  } catch {
    return null;
  }
}

export function createApp({ config = readConfig(), fetchImpl = fetch, log = console.log, now } = {}) {
  const siteToken = ckSiteToken(config, fetchImpl);
  const partnerToken = bkPartnerToken(config, fetchImpl);
  // Per IP is loose (many users can share one carrier NAT address); per
  // mobile number is the real guard against SMS flooding.
  const otpPerIp = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000, now });
  const otpPerMobile = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000, now });

  async function callUpstream(url, init, timeoutMs) {
    return fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  }

  /** Forward to CashKaro with the auth rule above. */
  async function forwardCk(request, path, search, route, body, ip) {
    const headers = pickHeaders(request, CK_FORWARD);
    headers['x-api-key'] = config.ckApiKey;
    headers['x-chkr-app-version'] = config.ckAppVersion;
    if (!headers.accept) headers.accept = 'application/vnd.api+json';

    let payload = body;
    if (route === 'signupV1' && body) {
      // /signupV1 requires the user's IP. The server knows it; the app does not.
      const json = parseJson(body);
      if (json?.data?.attributes) {
        json.data.attributes.ip_address = ip;
        payload = Buffer.from(JSON.stringify(json));
      }
    }

    const url = `${config.ckBaseUrl}${path}${search}`;
    const userAuth = Boolean(headers.authorization);
    const send = async (bearer, timeoutMs) =>
      callUpstream(
        url,
        {
          method: request.method,
          headers: bearer ? { ...headers, authorization: `Bearer ${bearer}` } : headers,
          body: payload,
        },
        timeoutMs,
      );

    if (userAuth) return send(null, USER_TIMEOUT_MS);
    const token = await siteToken.get();
    const res = await send(token, GUEST_TIMEOUT_MS);
    if (res.status !== 401) return res;
    // Clone: isTokenFailure reads the body, and the original may be returned.
    if (!(await isTokenFailure(res.clone()))) return res;
    await res.body?.cancel();
    siteToken.invalidate(token);
    return send(await siteToken.get(), GUEST_TIMEOUT_MS);
  }

  /** Forward to BankKaro with the partner JWT. */
  async function forwardBk(request, path, search, body) {
    const headers = pickHeaders(request, BK_FORWARD);
    const url = `${config.bkBaseUrl}${path}${search}`;
    const send = async (token) =>
      callUpstream(
        url,
        { method: request.method, headers: { ...headers, 'partner-token': token }, body },
        GUEST_TIMEOUT_MS,
      );
    const token = await partnerToken.get();
    const res = await send(token);
    if (res.status !== 401 && res.status !== 403) return res;
    // BankKaro calls are catalog reads and the eligibility check: safe to repeat.
    await res.body?.cancel();
    partnerToken.invalidate(token);
    return send(await partnerToken.get());
  }

  return async function handle(request, { fallbackIp = '' } = {}) {
    const started = Date.now();
    const url = new URL(request.url);
    const fullPath = url.searchParams.get('__path') ?? url.pathname;
    url.searchParams.delete('__path');
    const search = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
    const method = request.method.toUpperCase();
    let upstream = '-';
    let route = '-';
    let status = 500;

    try {
      if (fullPath === '/health' && method === 'GET') {
        status = 200;
        return jsonResponse(200, {
          ok: true,
          ck: Boolean(config.ckApiKey),
          bk: Boolean(config.bkPartnerKey && config.bkBaseUrl),
          region: process.env.VERCEL_REGION || 'local',
        });
      }

      const m = fullPath.match(/^\/(ck|bk)(\/.*)$/);
      if (!m) {
        status = 404;
        return apiError(404, 'NOT_FOUND', 'Not found.');
      }
      upstream = m[1];
      const path = canonicalPath(m[2]);
      if (path === null) {
        status = 404;
        return apiError(404, 'NOT_FOUND', 'Not found.');
      }
      route = matchRoute(upstream === 'ck' ? CK_ROUTES : BK_ROUTES, method, path) ?? '-';
      if (route === '-') {
        status = 404;
        return apiError(404, 'NOT_FOUND', 'Not found.');
      }
      if (upstream === 'ck' && !config.ckApiKey) {
        status = 503;
        return apiError(503, 'NOT_CONFIGURED', 'CashKaro is not configured on the server.');
      }
      if (upstream === 'bk' && !(config.bkPartnerKey && config.bkBaseUrl)) {
        status = 503;
        return apiError(503, 'NOT_CONFIGURED', 'BankKaro is not configured on the server.');
      }

      let body;
      if (method !== 'GET' && method !== 'HEAD') {
        const declared = Number(request.headers.get('content-length') || 0);
        if (declared > MAX_BODY_BYTES) {
          status = 413;
          return apiError(413, 'PAYLOAD_TOO_LARGE', 'Files are too large. Please upload smaller files.');
        }
        const buf = await request.arrayBuffer();
        if (buf.byteLength > MAX_BODY_BYTES) {
          status = 413;
          return apiError(413, 'PAYLOAD_TOO_LARGE', 'Files are too large. Please upload smaller files.');
        }
        body = buf.byteLength ? Buffer.from(buf) : undefined;
      }

      const ip = clientIpOf(request, fallbackIp);
      if (upstream === 'ck' && OTP_ROUTES.has(route)) {
        const mobile = body ? normaliseMobile(parseJson(body)?.data?.attributes?.mobile_number) : null;
        const ipOk = otpPerIp(`ip:${ip || 'unknown'}`);
        const mobileOk = mobile ? otpPerMobile(`m:${mobile}`) : true;
        if (!ipOk || !mobileOk) {
          status = 429;
          const res = apiError(429, 'RATE_LIMITED', 'Too many OTP requests. Please try again in a few minutes.');
          res.headers.set('retry-after', '600');
          return res;
        }
      }

      const res =
        upstream === 'ck'
          ? await forwardCk(request, path, search, route, body, ip)
          : await forwardBk(request, path, search, body);
      status = res.status;
      // Node fetch already decoded the body, so only the content type is kept.
      // Streamed: Vercel's 4.5 MB response cap does not apply to streams, and
      // the BankKaro card list is already ~3.3 MB.
      const outHeaders = {
        'content-type': res.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      };
      // The app's retry backoff honours Retry-After on 429/503.
      const retryAfter = res.headers.get('retry-after');
      if (retryAfter) outHeaders['retry-after'] = retryAfter;
      return new Response(res.body, { status: res.status, headers: outHeaders });
    } catch (e) {
      if (e instanceof UpstreamAuthError) {
        status = 502;
        return apiError(502, 'UPSTREAM_AUTH', 'Service is unavailable. Please try again.');
      }
      if (e?.name === 'TimeoutError') {
        status = 504;
        return apiError(504, 'UPSTREAM_TIMEOUT', 'The request took too long. Please try again.');
      }
      status = 502;
      return apiError(502, 'UPSTREAM_ERROR', 'Service is unavailable. Please try again.');
    } finally {
      log(JSON.stringify({ m: method, up: upstream, route, status, ms: Date.now() - started }));
    }
  };
}
