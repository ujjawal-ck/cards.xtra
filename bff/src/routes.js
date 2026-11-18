/**
 * Allowlist of upstream calls the BFF forwards. Anything else gets a 404.
 * Paths are relative to the upstream base (CK `.../v1`, BK `.../partner`).
 * Each entry: [method, regex, name]. `name` is the route template for logs.
 */
// One canonical path segment (see canonicalPath): encodeURIComponent output,
// so only unreserved characters and %XX escapes. Never `?`, `#`, `/` or `\`.
const SEG = "(?:[A-Za-z0-9._~!'()*-]|%[0-9A-F]{2})+";

/** CashKaro mini apps API (ckminapps.com/v1). `/token` is never exposed. */
export const CK_ROUTES = [
  // Login and signup
  ['POST', /^\/loginotp$/, 'loginotp'],
  ['POST', /^\/login$/, 'login'],
  ['POST', /^\/signupotp$/, 'signupotp'],
  ['POST', /^\/signupV1$/, 'signupV1'],
  ['POST', /^\/refreshtoken$/, 'refreshtoken'],
  ['POST', /^\/users\/logout$/, 'users/logout'],
  // Account
  ['GET', /^\/users\/earnings$/, 'users/earnings'],
  ['GET', /^\/users\/orders$/, 'users/orders'],
  ['GET', new RegExp(`^/users/orders/${SEG}$`), 'users/orders/:id'],
  ['GET', /^\/users\/profile$/, 'users/profile'],
  // Offers catalog
  ['GET', /^\/offers\/categories$/, 'offers/categories'],
  ['GET', new RegExp(`^/offers/category/${SEG}(/${SEG})*$`), 'offers/category/*'],
  ['GET', new RegExp(`^/offers/${SEG}$`), 'offers/:slug'],
  // Withdrawal
  ['GET', /^\/payment\/payment$/, 'payment/payment'],
  ['POST', /^\/users\/sendotp$/, 'users/sendotp'],
  ['POST', /^\/users\/verify$/, 'users/verify'],
  ['POST', /^\/payment\/paymentV1$/, 'payment/paymentV1'],
  // Missing cashback
  ['GET', /^\/users\/missingcashback\/retailers$/, 'mc/retailers'],
  ['GET', new RegExp(`^/users/missingcashback/exitclickdates/${SEG}$`), 'mc/exitclickdates/:id'],
  ['GET', /^\/users\/missingcashback\/queue$/, 'mc/queue'],
  ['GET', new RegExp(`^/users/missingcashback/queue/${SEG}$`), 'mc/queue/:id'],
  ['POST', /^\/users\/missingcashback\/validate$/, 'mc/validate'],
  ['POST', /^\/users\/missingcashback\/queue$/, 'mc/queue (submit)'],
  ['PUT', new RegExp(`^/users/missingcashback/queue/${SEG}$`), 'mc/queue/:id (update)'],
  ['POST', new RegExp(`^/users/tickets/${SEG}/${SEG}/${SEG}$`), 'users/tickets'],
];

/** BankKaro partner API (CardGenius). `/token` is never exposed. */
export const BK_ROUTES = [
  ['GET', /^\/cardgenius\/init-bundle$/, 'cardgenius/init-bundle'],
  ['GET', /^\/cardgenius\/cards$/, 'cardgenius/cards'],
  ['GET', new RegExp(`^/cardgenius/cards/${SEG}$`), 'cardgenius/cards/:alias'],
  ['POST', /^\/cardgenius\/eligiblity$/, 'cardgenius/eligiblity'],
];

/** OTP-sending routes: rate limited per client IP. */
export const OTP_ROUTES = new Set(['loginotp', 'signupotp', 'users/sendotp']);

/**
 * Canonical form of an incoming path: each segment decoded once and
 * re-encoded with encodeURIComponent. Returns null for a dot segment (raw or
 * encoded) or a malformed escape, so a path can never climb out of the base
 * or smuggle a query, fragment or extra segment upstream.
 */
export function canonicalPath(path) {
  const out = [];
  for (const seg of path.split('/')) {
    let d;
    try {
      d = decodeURIComponent(seg);
    } catch {
      return null;
    }
    if (d === '.' || d === '..') return null;
    // A slash inside one segment (from %2F / %252F) could become a separator
    // upstream and, with a dot segment, climb out of the base. No real id,
    // slug or date (YYYY-MM-DD) contains one.
    if (/[\/\\]/.test(d)) return null;
    out.push(encodeURIComponent(d));
  }
  return out.join('/');
}

/** Find the allowlisted route for a method + canonical path, or null. */
export function matchRoute(routes, method, path) {
  const canon = canonicalPath(path);
  if (canon === null || canon !== path) return null;
  for (const [m, re, name] of routes) {
    if (m === method && re.test(path)) return name;
  }
  return null;
}
