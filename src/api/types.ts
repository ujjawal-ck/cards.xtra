/**
 * types.ts — request/response shapes for the API modules.
 *
 * Kept intentionally light: only the fields the app actually reads are
 * typed. JSON:API envelopes are unwrapped by the api modules, so screens
 * see flat objects, not `{ data: { attributes } }`.
 */

// ── CashKaro (auth) ──────────────────────────────────────────────────────

export interface LoginOtpResult {
  /** Used as otp_guid when verifying the OTP. */
  otpGuid: string;
  /** Seconds the OTP stays valid (when the API returns it). */
  otpExpireSec?: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id?: string;
  fullname?: string;
  email?: string;
  mobileNumber?: string;
  [key: string]: unknown;
}

// ── BankKaro (CardGenius catalog) ────────────────────────────────────────

export interface EligibilityPayload {
  pincode: string;
  inhandIncome: string;
  empStatus: string; // e.g. "salaried"
}

export interface CardListFilters {
  slug?: string;
  banks_ids?: (string | number)[];
  card_networks?: string[];
  annualFees?: string;
  credit_score?: string;
  sort_by?: string;
  free_cards?: string;
  eligiblityPayload?: EligibilityPayload;
  cardGeniusPayload?: Record<string, unknown>;
}
