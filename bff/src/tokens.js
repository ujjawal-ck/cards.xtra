/**
 * Server-held partner tokens. Each running copy of the function keeps its own
 * cache in memory. A token is minted single-flight and reused until shortly
 * before its JWT `exp` (or a fallback TTL when the token is not a JWT).
 */
const SKEW_MS = 2 * 60 * 1000;

function jwtExpiryMs(token) {
  const part = String(token).split('.')[1];
  if (!part) return null;
  try {
    const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function createCachedToken(mint, fallbackTtlMs, now = () => Date.now()) {
  let value = null;
  let expiresAt = 0;
  let inFlight = null;
  return {
    async get() {
      if (value && now() < expiresAt - SKEW_MS) return value;
      if (!inFlight) {
        inFlight = (async () => {
          try {
            const v = await mint();
            value = v;
            expiresAt = jwtExpiryMs(v) ?? now() + fallbackTtlMs;
            return v;
          } finally {
            inFlight = null;
          }
        })();
      }
      return inFlight;
    },
    invalidate() {
      value = null;
      expiresAt = 0;
    },
  };
}

export class UpstreamAuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** CashKaro site token: GET /token with the mini apps x-api-key. */
export function ckSiteToken(config, fetchImpl) {
  return createCachedToken(async () => {
    const headers = {
      Accept: 'application/vnd.api+json',
      'x-chkr-app-version': config.ckAppVersion,
      'x-api-key': config.ckApiKey,
    };
    if (config.ckBasicUser) {
      const raw = `${config.ckBasicUser}:${config.ckBasicPass}`;
      headers.Authorization = `Basic ${Buffer.from(raw).toString('base64')}`;
    }
    const res = await fetchImpl(`${config.ckBaseUrl}/token`, { method: 'GET', headers });
    const body = await res.json().catch(() => null);
    const token = body?.data?.attributes?.token;
    if (!res.ok || !token) throw new UpstreamAuthError('CashKaro token mint failed', res.status);
    return token;
  }, 25 * 60 * 1000);
}

/** BankKaro partner JWT: POST /token with the partner key in the body. */
export function bkPartnerToken(config, fetchImpl) {
  return createCachedToken(async () => {
    const res = await fetchImpl(`${config.bkBaseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'x-api-key': config.bkPartnerKey }),
    });
    const body = await res.json().catch(() => null);
    const token = body?.data?.jwttoken;
    if (!res.ok || !token) throw new UpstreamAuthError('BankKaro token mint failed', res.status);
    return token;
  }, 50 * 60 * 1000);
}
