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

/** Body of POST /cardgenius/calculate. All 21 keys required; 0 = no spend. Monthly unless the name says annual or quarterly. */
export interface CalculateSpends {
  amazon_spends: number;
  flipkart_spends: number;
  other_online_spends: number;
  grocery_spends_online: number;
  online_food_ordering: number;
  other_offline_spends: number;
  offline_grocery: number;
  dining_or_going_out: number;
  fuel: number;
  mobile_phone_bills: number;
  electricity_bills: number;
  water_bills: number;
  rent: number;
  school_fees: number;
  insurance_health_annual: number;
  insurance_car_or_bike_annual: number;
  life_insurance: number;
  flights_annual: number;
  hotels_annual: number;
  domestic_lounge_usage_quarterly: number;
  international_lounge_usage_quarterly: number;
}
