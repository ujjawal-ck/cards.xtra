/**
 * Normalize whatever lands in a mobile-number field (typing, paste, Android
 * autofill) to at most 10 national digits.
 *
 * Fields used to set `maxLength={10}` and strip non-digits afterwards, so the
 * 10-character cap was applied to the RAW text first: a pasted
 * "+91 98765 43210" was cut to "+91 98765 " and became "9198765" — the wrong
 * number. Fields now allow PHONE_INPUT_MAX_LENGTH raw characters and pass the
 * text through here, which drops formatting and a leading +91 / 0 / 091.
 */

/** Raw characters a phone field accepts, enough for "+91 98765 43210". */
export const PHONE_INPUT_MAX_LENGTH = 16;

export function normalizeIndianMobile(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 10) {
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}
