/**
 * monitor.ts — turns every HTTP attempt into logs and metrics.
 *
 * Installed once via setHttpObserver (App.js). Per call it:
 *   - dev: prints one console line (method, endpoint group, status, ms, id)
 *   - release: leaves a Crashlytics breadcrumb, and for a failed final
 *     attempt fires a GA4 `api_error` event and, for server/network failures,
 *     a Crashlytics non-fatal.
 *
 * Nothing user-specific leaves the device: endpoints are reduced to a route
 * template (ids and slugs become :id / :slug), query values were already
 * stripped by the client, and error text goes through redact().
 */
import type { HttpEvent } from './client';
import { redact } from '../../lib/redact';

export interface MonitorSinks {
  /** Dev console. */
  log?: (line: string) => void;
  /** Crashlytics breadcrumb. */
  breadcrumb?: (line: string) => void;
  /** GA4 api_error. */
  trackApiError?: (params: ApiErrorParams) => void;
  /** Crashlytics non-fatal. */
  recordError?: (error: Error, context: string) => void;
}

export interface ApiErrorParams {
  endpoint_group: string;
  method: string;
  status: number;
  error_kind: string;
  error_code: string;
  attempt: number;
  duration_ms: number;
}

/** Path segments after these words are identifiers, not routes. */
const PARAM_AFTER: Record<string, string> = {
  category: ':slug',
  offers: ':slug',
  dynamicpage: ':slug',
  cards: ':alias',
  orders: ':id',
  exitclickdates: ':id',
  queue: ':id',
  details: ':id',
};
const KNOWN_ROUTES = new Set(['category', 'cards', 'eligiblity', 'init-bundle']);

/**
 * "GET ckminapps.com/v1/users/orders/123?x" → "users/orders/:id".
 * Keeps the group stable and low-cardinality for GA4 reporting.
 */
export function endpointGroup(endpoint: string): string {
  const path = endpoint.replace(/^[A-Z]+\s+/, '').split('?')[0];
  const segs = path.split('/').slice(1); // drop host
  while (segs.length && /^(v\d+|partner)$/i.test(segs[0])) segs.shift();
  const out: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const prev = segs[i - 1]?.toLowerCase();
    if (/^\d+$/.test(seg) || /^[0-9a-f-]{16,}$/i.test(seg)) out.push(':id');
    else if (prev && PARAM_AFTER[prev] && !KNOWN_ROUTES.has(seg.toLowerCase())) out.push(PARAM_AFTER[prev]);
    else out.push(seg);
  }
  return out.join('/').slice(0, 100) || '(root)';
}

/** Failures worth a Crashlytics non-fatal: the server or the network broke, not the user. */
function isSystemFailure(e: HttpEvent): boolean {
  const kind = e.error?.kind;
  return kind === 'network' || kind === 'timeout' || kind === 'config' || (kind === 'http' && e.status >= 500);
}

export function createHttpMonitor(sinks: MonitorSinks): (e: HttpEvent) => void {
  return (e) => {
    const group = endpointGroup(e.endpoint);
    const outcome = e.error ? `${e.status || e.error.kind}${e.error.code ? ` code=${e.error.code}` : ''}` : String(e.status);
    const retry = e.willRetry ? ' (retrying)' : '';
    const line = `[api] ${e.method} ${group} ${outcome} ${e.durationMs}ms #${e.requestId.slice(0, 8)}${e.attempt > 1 ? ` try=${e.attempt}` : ''}${retry}`;
    sinks.log?.(line);
    sinks.breadcrumb?.(line);

    // Only the final outcome of a failed call is an error; aborted = user navigated away.
    if (!e.error || e.willRetry || e.error.kind === 'aborted') return;
    sinks.trackApiError?.({
      endpoint_group: group,
      method: e.method,
      status: e.status,
      error_kind: e.error.kind,
      error_code: e.error.code ?? '',
      attempt: e.attempt,
      duration_ms: e.durationMs,
    });
    if (isSystemFailure(e)) {
      const err = new Error(redact(`API ${e.error.kind} ${e.status || ''} ${e.method} ${group}`.replace(/\s+/g, ' ')));
      err.name = 'ApiFailure';
      sinks.recordError?.(err, `request ${e.requestId}`);
    }
  };
}
