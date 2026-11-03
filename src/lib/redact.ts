/**
 * redact.ts — strip secrets and personal data from text before it is logged
 * or sent to Crashlytics / GA4.
 *
 * Covers what our API traffic can carry: JWTs (app, user and partner tokens),
 * Bearer / Basic headers, Indian mobile numbers (with or without +91), email
 * addresses, and OTPs in key=value or "otp": 123456 form. Masked mobiles like
 * "98XXXX5510" are already safe and are left alone.
 */
const SECRET_RULES: Array<[RegExp, string]> = [
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[jwt]'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]'],
  [/("?(?:otp|password|api[_-]?key|x-api-key|refresh_token|access_token|token)"?\s*[:=]\s*"?)[^"&\s,}]+/gi, '$1[redacted]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
];
const MOBILE_RULE: [RegExp, string] = [/(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/g, '[mobile]'];

function apply(text: string, rules: Array<[RegExp, string]>): string {
  let out = text;
  for (const [re, sub] of rules) out = out.replace(re, sub);
  return out;
}

/** Full scrub: secrets, emails and mobile numbers. For logs and error text. */
export function redact(text: string): string {
  return apply(text, [...SECRET_RULES, MOBILE_RULE]);
}

/**
 * Secrets and emails only. For structured values (analytics params) where a
 * 10-digit order or card id must survive and would look like a mobile.
 */
export function redactSecrets(text: string): string {
  return apply(text, SECRET_RULES);
}

/** Param/field names that must never be sent anywhere. */
export const SENSITIVE_KEY = /(^|_)(mobile|phone|otp|email|upi|upi_id|token|password|pan|aadhaar|account_number|ifsc)($|_)/i;

/** Same as redact, for an Error: returns a new Error with a scrubbed message. */
export function redactError(error: unknown): Error {
  const src = error instanceof Error ? error : new Error(String(error));
  const err = new Error(redact(src.message));
  err.name = src.name;
  if (src.stack) err.stack = redact(src.stack);
  return err;
}
