/**
 * openUrl — open an external link (apply / cashback click-out) in the
 * device browser. Trims whitespace, no-ops on empty, swallows failures
 * (e.g. unsupported scheme) so a bad/missing link never crashes a CTA.
 */
import { Linking } from 'react-native';

export function openUrl(url?: string | null): void {
  const clean = (url ?? '').trim();
  if (!clean) return;
  Linking.openURL(clean).catch(() => undefined);
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
