/**
 * client.ts — shared HTTP core for both backends.
 *
 * One small fetch wrapper that both the CashKaro and BankKaro modules build
 * on. Responsibilities: build the URL (+ query), attach headers, JSON-encode
 * the body, enforce a timeout, parse the JSON response, and normalize errors
 * into a single `ApiError` shape so screens/hooks handle failures uniformly.
 *
 * It is deliberately backend-agnostic — base URL and auth headers are passed
 * in by the caller (see cashkaro.ts / bankkaro.ts).
 */

export class ApiError extends Error {
  /** HTTP status (0 = network/timeout, before any response). */
  status: number;
  /** Parsed response body, if any (useful for field-level error display). */
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Plain object → JSON-encoded; string → sent as-is. */
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  /** Abort after this many ms (default 20s). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 20_000;

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
): string {
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

/**
 * Pull a human-readable message out of a parsed response body. Handles the
 * JSON:API `errors[]` / `meta.message` shapes CashKaro returns, the
 * `{message}` BankKaro returns, and falls back to a generic line.
 */
function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, any>;
    if (Array.isArray(b.errors) && b.errors.length) {
      const e = b.errors[0];
      return e?.detail || e?.title || e?.message || `Request failed (${status})`;
    }
    if (b.meta?.message) return String(b.meta.message);
    if (b.message) return String(b.message);
    if (b.error) return String(b.error);
  }
  return `Request failed (${status})`;
}

/**
 * Perform an HTTP request and return the parsed JSON body. Throws ApiError on
 * non-2xx responses, network failures, or timeout.
 */
export async function httpRequest<T = any>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, query, timeoutMs = DEFAULT_TIMEOUT } = options;

  if (!baseUrl) {
    throw new ApiError('Missing base URL for this environment (check env.ts).', 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let bodyToSend: string | FormData | undefined;
  if (body !== undefined) {
    if (typeof body === 'string') {
      bodyToSend = body;
    } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
      // Multipart (file uploads) — pass through untouched so the runtime sets
      // the multipart boundary Content-Type itself. Callers must NOT set one.
      bodyToSend = body;
    } else {
      bodyToSend = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(baseUrl, path, query), {
      method,
      headers,
      body: bodyToSend,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out. Check your connection and try again.', 0);
    }
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }
  clearTimeout(timer);

  // Parse body (may be empty, e.g. 204).
  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text; // non-JSON (e.g. a PDF/HTML error page)
    }
  }

  if (!response.ok) {
    throw new ApiError(messageFromBody(parsed, response.status), response.status, parsed);
  }

  return parsed as T;
}

/**
 * Build a `Basic <base64(user:pass)>` Authorization value.
 * Uses an inline base64 encoder so we don't depend on btoa/Buffer being
 * present in the Hermes runtime.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function basicAuthHeader(user: string, pass: string): string {
  const input = `${user}:${pass}`;
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const c1 = input.charCodeAt(i);
    const c2 = input.charCodeAt(i + 1);
    const c3 = input.charCodeAt(i + 2);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    output += B64[e1] + B64[e2] + B64[e3] + B64[e4];
  }
  return `Basic ${output}`;
}
