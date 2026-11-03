/**
 * ga4Sink.ts — Firebase Analytics (GA4) backend.
 *
 * NATIVE module: this only works in an EAS dev/prod build, NEVER in Expo Go.
 * It is required lazily from App.js behind a `Constants.executionEnvironment`
 * guard, so it is never even imported under Expo Go (which would crash —
 * the RNFirebase native module doesn't exist there). Do not import this file
 * unconditionally anywhere.
 *
 * Two Firebase-specific rules are handled here so the rest of the app stays
 * backend-agnostic:
 *   1. Reserved event names — Firebase rejects `logEvent('screen_view'|'app_open'
 *      ...)`. `screen_view` is routed to the dedicated `logScreenView`; `app_open`
 *      is dropped (Firebase auto-collects it).
 *   2. Param value types — Firebase `logEvent` accepts string|number only, not
 *      booleans. Booleans are coerced to 'true'/'false' strings.
 */
import analyticsFb from '@react-native-firebase/analytics';
import { analytics, type AnalyticsSink } from './analytics';

/** Firebase logEvent takes string|number only — coerce booleans to strings. */
function toFirebaseParams(
  params: Record<string, string | number | boolean>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = typeof value === 'boolean' ? (value ? 'true' : 'false') : value;
  }
  return out;
}

const firebaseSink: AnalyticsSink = {
  track(name, params) {
    // Reserved names can't go through logEvent.
    if (name === 'screen_view') {
      analyticsFb().logScreenView({
        screen_name: String(params.screen_name ?? ''),
        screen_class: String(params.screen_class ?? params.screen_name ?? ''),
      });
      return;
    }
    if (name === 'app_open') return; // Firebase collects app_open automatically.
    analyticsFb().logEvent(name, toFirebaseParams(params));
  },
  identify(userId) {
    analyticsFb().setUserId(userId);
  },
  setUserProperties(props) {
    // RNFirebase wants Record<string, string | null>.
    const stringified: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(props)) {
      stringified[key] = value == null ? null : String(value);
    }
    analyticsFb().setUserProperties(stringified);
  },
};

/** Attach the Firebase sink to the analytics engine. Call once at startup. */
export function registerGa4Sink(): void {
  analytics.registerSink(firebaseSink);
}
