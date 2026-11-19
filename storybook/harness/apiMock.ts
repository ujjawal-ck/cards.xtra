/**
 * apiMock — every story runs with NO real network.
 *
 * main.ts sets the app's BFF base URL to https://storybook.invalid, and this
 * file replaces globalThis.fetch. Each request to that host is matched against
 * a route table (method + path + optional query). The first route that matches
 * answers. When no route matches, the `mode` decides:
 *   ok / empty → console.error('[storybook] no fixture for …') + network error
 *   loading    → the request never resolves
 *   error      → HTTP 500 (JSON:API error body)
 *   offline    → network error, and react-query's onlineManager is offline
 * Explicit routes always win over the mode, so a story can say "everything
 * offline except the profile".
 *
 * Requests to other hosts are blocked (static assets on the Storybook origin,
 * data: and blob: URLs pass through).
 */
import { onlineManager } from '@tanstack/react-query';

export type ApiMode = 'ok' | 'loading' | 'error' | 'offline' | 'empty';

export const STORYBOOK_API_HOST = 'https://storybook.invalid';

/** What a route sees about the request. */
export interface ApiRequest {
  method: string;
  url: string;
  /** Pathname only, e.g. "/ck/users/orders". */
  path: string;
  /** Decoded query, e.g. query.get('filter[status]'). */
  query: URLSearchParams;
  /** Parsed JSON body (string if not JSON, FormData as is, undefined for GET). */
  body: unknown;
}

const REPLY = Symbol.for('storybook.api.reply');

/** A full answer: HTTP status + JSON body, or a hang / network failure. */
export interface Reply {
  readonly [REPLY]: true;
  status: number;
  body?: unknown;
  delayMs?: number;
  /** Never resolve (loading state). */
  hang?: boolean;
  /** Throw like fetch does when the network is down. */
  network?: boolean;
}

/** A function answer. `call` is 0 for the first matching call of this route in this story. */
export type Responder = (req: ApiRequest, call: number) => unknown;

/**
 * An answer is one of: a `reply.*` value, a Responder function, or any other
 * value, which is sent as a JSON body with HTTP 200.
 */
export type Answer = unknown;

export function isReply(x: unknown): x is Reply {
  return !!x && typeof x === 'object' && (x as Record<symbol, unknown>)[REPLY] === true;
}

const mk = (r: Omit<Reply, typeof REPLY>): Reply => ({ [REPLY]: true, ...r }) as Reply;

/** Builders for answers. */
export const reply = {
  /** 200 (or `status`) with this JSON body. */
  ok: (body: unknown, status = 200): Reply => mk({ status, body }),
  /** HTTP error. The default body is a JSON:API `errors[]` item, so ApiError.hasCode() works. */
  error: (status = 500, body?: unknown): Reply =>
    mk({ status, body: body ?? { errors: [{ status: String(status), title: 'Something went wrong', detail: 'Something went wrong' }] } }),
  /** HTTP error with a JSON:API error code, e.g. reply.code(400, '5003', 'Payment threshold not reached.', { cashout_limit: 250 }). */
  code: (status: number, code: string, title: string, meta?: Record<string, unknown>): Reply =>
    mk({ status, body: { errors: [{ status: String(status), code, title, detail: title, ...(meta ? { meta } : {}) }] } }),
  /** Never resolves: the caller stays in its loading state. */
  hang: (): Reply => mk({ status: 0, hang: true }),
  /** Fails like a dropped connection. */
  network: (): Reply => mk({ status: 0, network: true }),
  /** Answer after `ms` milliseconds. */
  delay: (ms: number, answer: Answer): Responder => (req, call) => {
    const r = resolveAnswer(answer, req, call);
    return mk({ ...r, delayMs: ms });
  },
  /**
   * Different answers for consecutive calls; the last one repeats.
   * Example: reply.sequence(reply.error(500), body) = fail once, then succeed.
   */
  sequence: (...answers: Answer[]): Responder => (req, call) =>
    resolveAnswer(answers[Math.min(call, answers.length - 1)], req, call),
  /** First call fails with `first`, every later call gets `then`. */
  once: (first: Answer, then: Answer): Responder => reply.sequence(first, then),
};

/** Turn any Answer into a Reply. */
export function resolveAnswer(answer: Answer, req: ApiRequest, call: number): Reply {
  let a = answer;
  for (let i = 0; i < 4 && typeof a === 'function'; i++) a = (a as Responder)(req, call);
  if (isReply(a)) return a;
  return mk({ status: 200, body: a ?? {} });
}

export interface ApiRoute {
  /**
   * string: substring of the full URL (kept for the old spike stories).
   * RegExp: tested against the pathname, e.g. /^\/ck\/users\/orders$/.
   * function: any predicate on the request.
   */
  match: string | RegExp | ((req: ApiRequest) => boolean);
  /** GET, POST, PUT … Any method when absent. */
  method?: string;
  /** Every listed query param must equal this value (decoded). */
  query?: Record<string, string>;
  /** The answer. When absent, `body` / `status` / `delayMs` are used. */
  answer?: Answer;
  body?: unknown;
  status?: number;
  delayMs?: number;
  /** Answer only the first N matching calls; later calls fall through to the next route. */
  times?: number;
  /** Label for the console log. */
  name?: string;
}

export interface ApiParams {
  mode?: ApiMode;
  routes?: ApiRoute[];
  /** react-query onlineManager state. Default: false only for mode 'offline'. */
  online?: boolean;
  /** Log every answered request to the console (default true). */
  log?: boolean;
}

const realFetch: typeof fetch = globalThis.fetch.bind(globalThis);

function routeMatches(r: ApiRoute, req: ApiRequest): boolean {
  if (r.method && r.method.toUpperCase() !== req.method) return false;
  if (r.query) {
    for (const [k, v] of Object.entries(r.query)) if (req.query.get(k) !== v) return false;
  }
  if (typeof r.match === 'string') return req.url.includes(r.match);
  if (r.match instanceof RegExp) return r.match.test(req.path);
  return r.match(req);
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function abortError(): Error {
  const e = new Error('The operation was aborted.');
  e.name = 'AbortError';
  return e;
}

/** Wait `ms`, or reject when the caller aborts (the app's timeout uses the signal). */
function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(abortError());
    });
  });
}

/** Never resolves unless the caller aborts. */
function hangUntilAbort(signal?: AbortSignal | null): Promise<Response> {
  return new Promise((_, reject) => {
    signal?.addEventListener('abort', () => reject(abortError()));
  });
}

let installId = 0;

/** Replace fetch for the current story. Call once per story mount (the harness does it). */
export function installApiMock({ mode = 'ok', routes = [], online, log = true }: ApiParams = {}): void {
  const myInstall = ++installId;
  onlineManager.setOnline(online ?? mode !== 'offline');
  const calls = new Map<ApiRoute, number>();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(STORYBOOK_API_HOST)) {
      const sameOrigin = typeof location !== 'undefined' && url.startsWith(location.origin);
      if (sameOrigin || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
        return realFetch(input as RequestInfo, init);
      }
      // Remote images (e.g. expo-image prefetch of CDN card art): answer empty, do not leave the browser.
      if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)) return new Response(null, { status: 204 });
      console.error(`[storybook] blocked network call to ${url}`);
      throw new TypeError(`[storybook] blocked network call to ${url}`);
    }

    const parsed = new URL(url);
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const req: ApiRequest = { method, url, path: parsed.pathname, query: parsed.searchParams, body: parseBody(init?.body) };
    const signal = init?.signal;

    let route: ApiRoute | undefined;
    for (const r of routes) {
      if (!routeMatches(r, req)) continue;
      const used = calls.get(r) ?? 0;
      if (r.times != null && used >= r.times) continue;
      route = r;
      break;
    }

    let answer: Reply;
    if (route) {
      const call = calls.get(route) ?? 0;
      calls.set(route, call + 1);
      const raw = route.answer !== undefined ? route.answer : route.body !== undefined || route.status !== undefined
        ? mkLegacy(route) : {};
      answer = resolveAnswer(raw, req, call);
      if (route.answer === undefined && route.delayMs) answer = { ...answer, delayMs: route.delayMs };
    } else if (mode === 'loading') {
      answer = reply.hang();
    } else if (mode === 'error') {
      answer = reply.error(500);
    } else if (mode === 'offline') {
      answer = reply.network();
    } else {
      console.error(`[storybook] no fixture for ${method} ${parsed.pathname}${parsed.search}`);
      throw new TypeError(`[storybook] no fixture for ${method} ${url}`);
    }

    // A newer story replaced the mock: answer nothing, so stale calls cannot fill the new cache.
    if (myInstall !== installId) return hangUntilAbort(signal);

    const label = `${method} ${parsed.pathname}`;
    if (answer.delayMs) {
      await wait(answer.delayMs, signal);
      if (myInstall !== installId) return hangUntilAbort(signal);
    }
    if (answer.hang) {
      if (log) console.info(`[storybook] api ${label} → (hang)`);
      return hangUntilAbort(signal);
    }
    if (answer.network) {
      if (log) console.info(`[storybook] api ${label} → (network error)`);
      throw new TypeError('Network request failed');
    }
    if (log) console.info(`[storybook] api ${label} → ${answer.status}${route?.name ? ` (${route.name})` : ''}`);
    return json(answer.body, answer.status);
  }) as typeof fetch;
}

function mkLegacy(r: ApiRoute): Reply {
  return mk({ status: r.status ?? 200, body: r.body ?? {} });
}
