/**
 * report.ts — record an error we deliberately recovered from.
 *
 * Some failures are handled by degrading (a card list without bank logos,
 * an empty tab). That's right for the user, but silent: nobody would know the
 * bank directory has been failing for a week. `reportHandled` keeps the
 * graceful fallback AND sends a Crashlytics non-fatal (wired in App.js).
 */
type Reporter = (error: unknown, context: string) => void;

let reporter: Reporter = (error, context) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[handled] ${context}:`, (error as Error)?.message ?? error);
  }
};

export function setHandledErrorReporter(fn: Reporter): void {
  reporter = fn;
}

export function reportHandled(error: unknown, context: string): void {
  // A cancelled request isn't a failure worth reporting.
  if ((error as { kind?: string })?.kind === 'aborted') return;
  try {
    reporter(error, context);
  } catch {
    // never let reporting break the fallback
  }
}

/** `promise.catch(fallbackTo(value, 'context'))` — degrade, but report. */
export function fallbackTo<T>(value: T, context: string) {
  return (error: unknown): T => {
    reportHandled(error, context);
    return value;
  };
}
