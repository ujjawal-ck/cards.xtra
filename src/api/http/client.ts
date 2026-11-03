/**
 * client.ts — the one HTTP transport for CashKaro and BankKaro.
 *
 * Responsibilities (and nothing else — auth lives in tokenManager.ts):
 *   - build the URL + query string
 *   - encode JSON / pass FormData through
 *   - per-call timeout merged with the caller's AbortSignal
 *   - retry transient failures (network, timeout, 429, 5xx) with exponential
 *     backoff + jitter — only for idempotent calls (GET/HEAD, or a write the
 *     caller explicitly marks idempotent)
 *   - tag every call with an x-request-id
 *   - normalise every failure into ApiError (see errors.ts)
 *   - report each completed call to an optional observer (logging/metrics)
 */
import { ApiError, messageFromBody } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: HttpMethod;
  /** Plain object → JSON; string / FormData → sent as-is. */
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  /** Per-attempt deadline (default 15s). */
  timeoutMs?: number;
  /** Caller cancellation (React Query passes one to every queryFn). */
  signal?: AbortSignal;
  /** Max extra attempts for transient failures (default: 2 for idempotent, 0 otherwise). */
  retries?: number;
  /** Mark a write safe to retry (it carries an idempotency key or is naturally idempotent). */
  idempotent?: boolean;
}

/** What the observer receives once per attempt. Never includes bodies or tokens. */
export interface HttpEvent {
  requestId: string;
  method: HttpMethod;
  /** Host + path, query values stripped. */
  endpoint: string;
  status: number;
  durationMs: number;
  attempt: number;
  error?: ApiError;
}

export const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const BACKOFF_BASE_MS = 400;
const BACKOFF_MAX_MS = 4_000;

let observer: ((e: HttpEvent) => void) | null = null;
/** Install a single observer (logger / Crashlytics breadcrumbs). */
export function setHttpObserver(fn: ((e: HttpEvent) => void) | null): void {
  observer = fn;
}

// Test seams: swap the clock / sleep / random without touching globals.
export const __testing = {
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  random: () => Math.random(),
};

export function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const base = baseUrl.replace(/\/+$/, '');
  const rel = path.replace(/^\/+/, '');
  let url = `${base}/${rel}`;
  if (query) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    if (parts.length) url += `${url.includes('?') ? '&' : '?'}${parts.join('&')}`;
  }
  return url;
}

/** `GET host/path` with the query string removed (safe to log). */
export function endpointLabel(method: string, url: string): string {
  return `${method} ${url.split('?')[0].replace(/^https?:\/\//, '')}`;
}

/** RFC4122 v4 id; uses crypto.randomUUID when the runtime has it. */
export function requestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (__testing.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Delay before retry `attempt` (1-based): full jitter, capped; honours Retry-After. */
export function backoffMs(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const secs = Number(retryAfterHeader);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, BACKOFF_MAX_MS * 4);
  }
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
  return Math.round(ceiling / 2 + (__testing.random() * ceiling) / 2);
}

function encodeBody(body: unknown): string | FormData | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body;
  return JSON.stringify(body);
}

/** One attempt: fetch + timeout + parse. Throws ApiError, never anything else. */
async function attemptOnce(
  url: string,
  init: { method: HttpMethod; headers: Record<string, string>; body?: string | FormData },
  timeoutMs: number,
  signal: AbortSignal | undefined,
  meta: { requestId: string; endpoint: string },
): Promise<{ data: unknown; status: number; retryAfter: string | null }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onCallerAbort);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    const aborted = (err as { name?: string })?.name === 'AbortError' || controller.signal.aborted;
    const kind = timedOut ? 'timeout' : aborted ? 'aborted' : 'network';
    const message =
      kind === 'timeout'
        ? 'Request timed out. Check your connection and try again.'
        : kind === 'aborted'
          ? 'Request cancelled.'
          : 'Network error. Check your connection and try again.';
    throw new ApiError(message, 0, undefined, { kind, cause: err, ...meta });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }

  const text = await response.text().catch(() => '');
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text; // non-JSON body (HTML error page, file download)
    }
  }
  const retryAfter = response.headers?.get?.('retry-after') ?? null;
  if (!response.ok) {
    const err = new ApiError(messageFromBody(parsed, response.status), response.status, parsed, {
      kind: 'http',
      ...meta,
    });
    (err as { retryAfter?: string | null }).retryAfter = retryAfter;
    throw err;
  }
  return { data: parsed, status: response.status, retryAfter };
}

/**
 * Perform a request and return the parsed body. Throws ApiError on any
 * failure. Transient failures are retried for idempotent calls.
 */
export async function httpRequest<T = unknown>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
  const id = requestId();
  const url = buildUrl(baseUrl || '', path, query);
  const endpoint = endpointLabel(method, url);

  if (!baseUrl) {
    throw new ApiError('This build is missing an API address. Please update the app.', 0, undefined, {
      kind: 'config',
      requestId: id,
      endpoint,
    });
  }

  const idempotent = options.idempotent ?? (method === 'GET' || method === 'HEAD');
  const maxRetries = idempotent ? (options.retries ?? DEFAULT_RETRIES) : 0;
  const headers = { ...options.headers, 'x-request-id': id };
  const encoded = encodeBody(body);

  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    try {
      const res = await attemptOnce(url, { method, headers, body: encoded }, timeoutMs, signal, {
        requestId: id,
        endpoint,
      });
      observer?.({ requestId: id, method, endpoint, status: res.status, durationMs: Date.now() - started, attempt });
      return res.data as T;
    } catch (e) {
      const err = e as ApiError;
      observer?.({ requestId: id, method, endpoint, status: err.status, durationMs: Date.now() - started, attempt, error: err });
      const canRetry = attempt <= maxRetries && err.isTransient && err.kind !== 'aborted';
      if (!canRetry) throw err;
      await __testing.sleep(backoffMs(attempt, (err as { retryAfter?: string | null }).retryAfter));
      if (signal?.aborted) throw err;
    }
  }
}

/** `Basic <base64(user:pass)>`, UTF-8 safe. */
export function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${base64Encode(`${user}:${pass}`)}`;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 → base64 without relying on btoa/Buffer (not on every Hermes build). */
export function base64Encode(input: string): string {
  const bytes = utf8Bytes(input);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    out += B64[b1 >> 2];
    out += B64[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    out += b2 === undefined ? '=' : B64[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    out += b3 === undefined ? '=' : B64[b3 & 63];
  }
  return out;
}

/** base64 / base64url → UTF-8 string (used to read JWT payloads). */
export function base64Decode(input: string): string {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : -1));
    bytes.push((n[0] << 2) | (n[1] >> 4));
    if (n[2] >= 0) bytes.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (n[3] >= 0) bytes.push(((n[2] & 3) << 6) | n[3]);
  }
  return utf8Decode(bytes);
}

function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c: number;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(c);
  }
  return out;
}
