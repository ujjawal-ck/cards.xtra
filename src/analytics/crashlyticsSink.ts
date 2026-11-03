/**
 * crashlyticsSink.ts — Firebase Crashlytics, attached as an analytics sink.
 *
 * NATIVE module: dev/store builds only, never Expo Go. Required lazily from
 * App.js behind the same Expo Go guard as the GA4 sink.
 *
 * Why a sink: every analytics event becomes a Crashlytics breadcrumb, and the
 * opaque user id follows login/logout, so each crash report shows what the
 * user did right before it, with no extra calls at screen level.
 * Unhandled JS exceptions and native crashes are captured by the library
 * itself once it is installed.
 */
import crashlytics from '@react-native-firebase/crashlytics';
import { analytics, type AnalyticsSink } from './analytics';
import { redact, redactError } from '../lib/redact';

const crashlyticsSink: AnalyticsSink = {
  track(name, params) {
    // Breadcrumb only: event name + item id when present. No other params,
    // so nothing user-entered lands in crash logs.
    const item = params.item_id != null ? ` item=${params.item_id}` : '';
    crashlytics().log(`${name}${item}`);
  },
  identify(userId) {
    crashlytics().setUserId(userId ?? '');
  },
};

/** Breadcrumb line (already free of PII; redacted again to be safe). */
export function breadcrumb(line: string): void {
  try {
    crashlytics().log(redact(line));
  } catch {
    // ignore
  }
}

/** Attach Crashlytics. Call once at startup (native builds only). */
export function registerCrashlyticsSink(): void {
  analytics.registerSink(crashlyticsSink);
}

/** Report a handled error (e.g. a failed API call we recovered from). */
export function recordError(error: unknown, context?: string): void {
  try {
    // Server messages can echo a mobile number or token: scrub before upload.
    const err = redactError(error);
    if (context) crashlytics().log(redact(context));
    crashlytics().recordError(err);
  } catch {
    // never let crash reporting crash the app
  }
}
