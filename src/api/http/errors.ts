/**
 * errors.ts — the single error type every API call throws.
 *
 * CashKaro returns JSON:API errors: `{ errors: [{ status, code, title, detail,
 * source: { pointer | parameter }, meta }] }`. BankKaro / AWS gateways return
 * `{ message }`. Both are normalised here so callers branch on `kind`,
 * `status` and `code` — never on message text.
 */

/** Where the failure happened. */
export type ApiErrorKind =
  | 'http' // server answered with a non-2xx status
  | 'network' // no response (DNS, offline, TLS, connection reset)
  | 'timeout' // our own deadline fired
  | 'aborted' // the caller cancelled (e.g. React Query unmount)
  | 'config'; // the app is misconfigured (missing base URL / key)

/** One entry of a JSON:API `errors[]` array. */
export interface ApiErrorItem {
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  /** `source.pointer` (body field) or `source.parameter` (query/path). */
  source?: string;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status; 0 when there was no response. */
  readonly status: number;
  /** First CashKaro error code (e.g. "5003"), if any. */
  readonly code?: string;
  /** Every parsed JSON:API error item. */
  readonly errors: ApiErrorItem[];
  /** Raw parsed body (kept for field-level UI and legacy callers). */
  readonly payload: unknown;
  /** x-request-id we sent — quote it in bug reports / Crashlytics. */
  readonly requestId?: string;
  /** `METHOD /path` of the failing call, without query values. */
  readonly endpoint?: string;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
    extra: {
      kind?: ApiErrorKind;
      requestId?: string;
      endpoint?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.kind = extra.kind ?? (status > 0 ? 'http' : 'network');
    this.requestId = extra.requestId;
    this.endpoint = extra.endpoint;
    this.errors = parseErrorItems(payload);
    this.code = this.errors.find((e) => e.code)?.code;
    if (extra.cause !== undefined) (this as { cause?: unknown }).cause = extra.cause;
  }

  /** True for 401 (and 403 used by some CK gateways for bad tokens). */
  get isAuth(): boolean {
    return this.kind === 'http' && (this.status === 401 || this.status === 403);
  }

  /** True when retrying later could succeed (no response, 429, 5xx gateway). */
  get isTransient(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') return true;
    return this.kind === 'http' && (this.status === 429 || this.status >= 500);
  }

  /** Does any error item carry this CashKaro code? */
  hasCode(code: string | number): boolean {
    const c = String(code);
    return this.errors.some((e) => e.code === c);
  }

  /** `meta` of the first item that has one (e.g. 5003 → cashout_limit). */
  get meta(): Record<string, unknown> | undefined {
    return this.errors.find((e) => e.meta)?.meta;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Shorthand used across hooks: `if (hasErrorCode(e, 5003))`. */
export function hasErrorCode(e: unknown, code: string | number): boolean {
  return isApiError(e) && e.hasCode(code);
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
}

/** Parse JSON:API `errors[]` (array or the odd `{errors:{code,title}}` object). */
export function parseErrorItems(body: unknown): ApiErrorItem[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as Record<string, unknown>).errors;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  return list
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => {
      const src = e.source as Record<string, unknown> | undefined;
      const detail = Array.isArray(e.detail) ? e.detail.join(' ') : asString(e.detail);
      return {
        status: asString(e.status),
        code: asString(e.code),
        title: asString(e.title),
        detail,
        source: asString(src?.pointer) ?? asString(src?.parameter),
        meta: (e.meta && typeof e.meta === 'object' ? e.meta : undefined) as
          | Record<string, unknown>
          | undefined,
      };
    });
}

/** Human-readable message for an error body (shown to users as a fallback). */
export function messageFromBody(body: unknown, status: number): string {
  const items = parseErrorItems(body);
  const first = items[0];
  if (first) return first.detail || first.title || `Request failed (${status})`;
  if (body && typeof body === 'object') {
    const b = body as Record<string, any>;
    if (b.meta?.message) return String(b.meta.message);
    if (b.message) return String(b.message);
    if (b.error) return String(b.error);
  }
  return `Request failed (${status})`;
}
