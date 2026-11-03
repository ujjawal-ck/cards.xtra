/**
 * analytics.ts — the app's analytics engine.
 *
 * Every screen/component calls `analytics.track(Events.X, {...})`. This module
 * fans each event out to a list of "sinks" (backends). Today the only sink is
 * the dev console; when GA goes live we add a Firebase/GA4 sink via
 * `analytics.registerSink(...)` and NOTHING in the screens changes. That single
 * indirection is the whole point — instrument once, swap the backend later.
 *
 * GA4 HYGIENE is enforced HERE, not at call sites, so screens stay readable:
 *   - event + param names → sanitised to snake_case, ≤40 chars
 *   - string param values → clamped to 100 chars
 *   - undefined / null params → dropped
 *   - >25 params → extra params dropped (GA4 hard limit)
 *   - user-property values → clamped to 36 chars (GA4 limit)
 *
 * PRIVACY (hard rule for this app): never pass PII — phone, email, name, UPI
 * id, full address — as a param, user id, or user property. Pass opaque ids,
 * counts, booleans, and enums only. The sanitiser cannot detect a leaked phone
 * number; that discipline lives at the call site. When in doubt, send a flag
 * (`has_value: true`) or a length, never the value.
 */
import { STAGE } from '../config/env';
import { Events, type EventName, type EventParams, type ParamValue } from './events';

/** A sink is any analytics backend. Add GA/Firebase/Segment by implementing this. */
export interface AnalyticsSink {
  /** Receive one event. Params are already sanitised + super-props merged. */
  track(name: string, params: Record<string, string | number | boolean>): void;
  /** Associate subsequent events with a user. `userId` is opaque (never PII). */
  identify?(userId: string | null): void;
  /** Set durable user-scoped properties (GA4 user properties). */
  setUserProperties?(props: Record<string, string>): void;
}

// ── GA4 limits ───────────────────────────────────────────────
const MAX_NAME_LEN = 40;
const MAX_PARAM_VALUE_LEN = 100;
const MAX_PARAMS = 25;
const MAX_USER_PROP_LEN = 36;

/** snake_case-safe key: lowercase, non-alphanumerics → "_", clamp to 40. */
function sanitiseKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+/, '')
    .slice(0, MAX_NAME_LEN);
}

/** Coerce a param to a GA4-safe scalar; returns undefined to drop it. */
function cleanValue(value: ParamValue): string | number | boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  const str = String(value);
  return str.length > MAX_PARAM_VALUE_LEN ? str.slice(0, MAX_PARAM_VALUE_LEN) : str;
}

/** Build the final param object GA4 will accept (sanitised, merged, capped). */
function buildParams(
  params: EventParams | undefined,
  superProps: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = { ...superProps };
  if (params) {
    for (const [rawKey, rawValue] of Object.entries(params)) {
      const value = cleanValue(rawValue);
      if (value === undefined) continue;
      out[sanitiseKey(rawKey)] = value;
    }
  }
  // Enforce GA4's 25-param cap deterministically (super-props win, then insertion order).
  const entries = Object.entries(out);
  if (entries.length <= MAX_PARAMS) return out;
  return Object.fromEntries(entries.slice(0, MAX_PARAMS));
}

// ── the dev-console sink (always on outside prod) ─────────────
const consoleSink: AnalyticsSink = {
  track(name, params) {
    if (STAGE !== 'prod') {
      // eslint-disable-next-line no-console
      console.log(`📊 ${name}`, params);
    }
  },
  identify(userId) {
    if (STAGE !== 'prod') {
      // eslint-disable-next-line no-console
      console.log('📊 identify', userId ?? '(anonymous)');
    }
  },
  setUserProperties(props) {
    if (STAGE !== 'prod') {
      // eslint-disable-next-line no-console
      console.log('📊 user_properties', props);
    }
  },
};

// ── engine state ──────────────────────────────────────────────
const sinks: AnalyticsSink[] = [consoleSink];
let superProps: Record<string, string | number | boolean> = {};
let currentUserId: string | null = null;

export const analytics = {
  /**
   * Register an additional backend (e.g. the GA4/Firebase sink). Called once
   * at startup. Replays the current identity into the new sink so it's in sync.
   */
  registerSink(sink: AnalyticsSink): void {
    sinks.push(sink);
    if (currentUserId !== null) sink.identify?.(currentUserId);
  },

  /** Params attached to EVERY event (e.g. app_version, platform, stage). */
  setSuperProps(props: EventParams): void {
    superProps = { ...superProps, ...(buildParams(props, {})) };
  },

  /** Fire an event. `name` must come from the Events map. */
  track(name: EventName, params?: EventParams): void {
    const payload = buildParams(params, superProps);
    for (const sink of sinks) {
      try {
        sink.track(name, payload);
      } catch {
        // a misbehaving sink must never break the app
      }
    }
  },

  /**
   * Associate the session with a user. Pass the backend's opaque user id ONLY —
   * never a phone/email/name. Pass null to clear (logout).
   */
  identify(userId: string | null): void {
    currentUserId = userId;
    for (const sink of sinks) {
      try {
        sink.identify?.(userId);
      } catch {
        /* ignore */
      }
    }
  },

  /** Set durable, user-scoped properties (GA4 user properties). No PII. */
  setUserProperties(props: Record<string, ParamValue>): void {
    const clean: Record<string, string> = {};
    for (const [rawKey, rawValue] of Object.entries(props)) {
      const value = cleanValue(rawValue);
      if (value === undefined) continue;
      clean[sanitiseKey(rawKey)] = String(value).slice(0, MAX_USER_PROP_LEN);
    }
    for (const sink of sinks) {
      try {
        sink.setUserProperties?.(clean);
      } catch {
        /* ignore */
      }
    }
  },

  /** Clear identity + user properties on logout (keeps super-props/sinks). */
  reset(): void {
    this.identify(null);
  },
};

export { Events };
export type { EventName, EventParams };
