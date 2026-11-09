/**
 * Display masks for personal details shown on screen (Profile masthead):
 * Figma 4448:23847 — "ma****an@gmail.com · 83********24".
 */
import { normalizeIndianMobile } from './phone';

/** "manikandan@gmail.com" → "ma****an@gmail.com". Short local parts keep
 *  only their first character visible. */
export function maskEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 4) return `${local.slice(0, 1)}****${domain}`;
  return `${local.slice(0, 2)}****${local.slice(-2)}${domain}`;
}

/** "919876543210" / "9876543210" → "98********10" (national number). */
export function maskMobileShort(raw?: string | number): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const digits = normalizeIndianMobile(String(raw));
  if (digits.length < 6) return undefined;
  return `${digits.slice(0, 2)}********${digits.slice(-2)}`;
}
