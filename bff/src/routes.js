/**
 * Allowlist of upstream calls the BFF forwards. Anything else gets a 404.
 * Paths are relative to the upstream base (CK `.../v1`, BK `.../partner`).
 * Each entry: [method, regex, name]. `name` is the route template for logs.
 */
const SEG = '[^/]+';

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
 * Find the allowlisted route for a method + path, or null. Rejects dot
 * segments (raw or percent-encoded) so a path can never climb out of the base.
 */
export function matchRoute(routes, method, path) {
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.split('/').some((s) => s === '.' || s === '..')) return null;
  for (const [m, re, name] of routes) {
    if (m === method && re.test(path)) return name;
  }
  return null;
}
