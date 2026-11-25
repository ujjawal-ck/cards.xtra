/**
 * openUrl — open an external link (apply / cashback click-out, help links) in
 * the device browser or mail / phone app.
 *
 *   • Trims whitespace. Empty, malformed or unsupported-scheme links are
 *     refused (never passed to Linking), so a stray `intent:` / `javascript:` /
 *     custom-scheme link from the server cannot launch anything.
 *   • Allowed: web links (`https:`, and `http:` because no source proves every
 *     partner tracking link is https; refusing one would break Apply);
 *     `mailto:` and `tel:` unless `httpsOnly` (click-outs pass httpsOnly).
 *   • A refused or failed open shows a short message and resolves false.
 *     A failed `mailto:` shows the address so the user can copy it.
 *   • Resolves true only when the OS accepted the link.
 */
import { Alert, Linking } from 'react-native';

export const OPEN_LINK_FAILED_TITLE = 'Couldn’t open this link';
export const OPEN_LINK_FAILED_MESSAGE = 'Couldn’t open this link. Please try again.';

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

export function urlScheme(url?: string | null): string | null {
  const m = SCHEME.exec((url ?? '').trim());
  return m ? m[1].toLowerCase() : null;
}

/** True for an absolute `https:` link with a host. */
export function isHttpsUrl(url?: string | null): boolean {
  const clean = (url ?? '').trim();
  return urlScheme(clean) === 'https' && /^https:\/\/[^/\s?#]+/i.test(clean);
}

/** True for an absolute `http:` or `https:` link with a host. */
export function isWebUrl(url?: string | null): boolean {
  const clean = (url ?? '').trim();
  const scheme = urlScheme(clean);
  return (scheme === 'https' || scheme === 'http') && /^https?:\/\/[^/\s?#]+/i.test(clean);
}

export function showOpenLinkError(detail?: string): void {
  Alert.alert(OPEN_LINK_FAILED_TITLE, detail ?? OPEN_LINK_FAILED_MESSAGE);
}

export async function openUrl(
  url?: string | null,
  opts?: { httpsOnly?: boolean }
): Promise<boolean> {
  const clean = (url ?? '').trim();
  const scheme = urlScheme(clean);
  const allowed =
    isWebUrl(clean) || (!opts?.httpsOnly && (scheme === 'mailto' || scheme === 'tel'));
  if (!allowed) {
    showOpenLinkError();
    return false;
  }
  try {
    await Linking.openURL(clean);
    return true;
  } catch {
    if (scheme === 'mailto') {
      const address = clean.replace(/^mailto:/i, '').split('?')[0];
      showOpenLinkError(`${OPEN_LINK_FAILED_MESSAGE} You can write to us at ${address}.`);
    } else {
      showOpenLinkError();
    }
    return false;
  }
}

/**
 * Single-flight guard: while one async run is in progress, further calls are
 * ignored (return undefined). Used so a double tap opens a click-out once.
 */
export function createSingleFlight() {
  let busy = false;
  return {
    isBusy: () => busy,
    async run<T>(fn: () => Promise<T>, onChange?: (busy: boolean) => void): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      onChange?.(true);
      try {
        return await fn();
      } finally {
        busy = false;
        onChange?.(false);
      }
    },
  };
}

/**
 * Attribute a CashKaro store click-out to the logged-in user.
 *
 * The store `cashback_url` (cktracking …/visitretailer/app/<store>?id=) comes
 * back from the offers API with an EMPTY `id=` slot — that slot is the user's
 * id, and CashKaro only records an "exit click" against the user when it's
 * filled. Verified live (2026-06-04): the API never fills it (cashback_url
 * isn't even returned under the user token), so we inject the profile id here.
 *
 * Without this, exit clicks aren't attributed and the store never appears in
 * the Missing Cashback retailers / exit-click-dates list. No-ops (returns the
 * url unchanged) when signed out.
 */
export function withTrackingUser(url?: string | null, userId?: string | number | null): string {
  const clean = (url ?? '').trim();
  if (!clean || userId === undefined || userId === null || userId === '') return clean;
  const uid = encodeURIComponent(String(userId));
  // Replace an existing (possibly empty) id= value, else append the param.
  if (/[?&]id=/.test(clean)) return clean.replace(/([?&]id=)[^&]*/, `$1${uid}`);
  return `${clean}${clean.includes('?') ? '&' : '?'}id=${uid}`;
}
