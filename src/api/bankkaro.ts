/**
 * bankkaro.ts — BankKaro "CardGenius" catalog API (Phase 2 / Home).
 *
 * Calls go through the cards.xtra BFF (`EXPO_PUBLIC_API_BASE_URL/bk`). The BFF
 * holds the partner key, mints the partner JWT and adds the `partner-token`
 * header. The app sends no BankKaro credential.
 *
 * Endpoints map onto the Home UI:
 *   initBundle      → banks / networks / tags / filter metadata (bootstrap)
 *   getCards        → full card list
 *   getCardDetail   → CardDetailSheet
 *   checkEligibility→ eligibility toggle
 *   calculateSavings→ POST /cardgenius/calculate (spend profile → per-card savings)
 */
import { BK } from '../config/env';
import { httpRequest } from './http/client';
import type { CalculateSpends, EligibilityPayload } from './types';

async function bk<T = any>(
  path: string,
  opts: {
    method?: 'GET' | 'POST';
    body?: unknown;
    signal?: AbortSignal;
    idempotent?: boolean;
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<T> {
  const { method = 'GET', body, signal, idempotent, timeoutMs, retries } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return httpRequest<T>(BK.baseUrl, path, { method, body, headers, signal, idempotent, timeoutMs, retries });
}

/** Bootstrap data: banks, networks, tags, filter options. */
export function initBundle(): Promise<any> {
  return bk('/cardgenius/init-bundle');
}


/** Full card list (unfiltered). */
export function getCards(): Promise<any> {
  return bk('/cardgenius/cards');
}


/** Single card detail by alias/slug (e.g. "icici-platinum-chip-credit-card"). */
export function getCardDetail(alias: string): Promise<any> {
  return bk(`/cardgenius/cards/${encodeURIComponent(alias)}`);
}

/** Eligibility check for a given pincode / income / employment. */
export function checkEligibility(payload: EligibilityPayload): Promise<any> {
  return bk('/cardgenius/eligiblity', { method: 'POST', body: payload, idempotent: true });
}


/** Every key 0 = no spend. Start from this and set the categories the user gave. */
export const EMPTY_CALCULATE_SPENDS: CalculateSpends = {
  amazon_spends: 0,
  flipkart_spends: 0,
  other_online_spends: 0,
  grocery_spends_online: 0,
  online_food_ordering: 0,
  other_offline_spends: 0,
  offline_grocery: 0,
  dining_or_going_out: 0,
  fuel: 0,
  mobile_phone_bills: 0,
  electricity_bills: 0,
  water_bills: 0,
  rent: 0,
  school_fees: 0,
  insurance_health_annual: 0,
  insurance_car_or_bike_annual: 0,
  life_insurance: 0,
  flights_annual: 0,
  hotels_annual: 0,
  domestic_lounge_usage_quarterly: 0,
  international_lounge_usage_quarterly: 0,
};

/** Per-card savings for a spend profile. Read-only computation, so safe to retry.
 *  UAT can take up to 30 s and the BFF waits 45 s, so the default 15 s would
 *  abort a slow call and send it again. One long attempt, one retry. */
export function calculateSavings(spends: CalculateSpends, signal?: AbortSignal): Promise<any> {
  return bk('/cardgenius/calculate', {
    method: 'POST',
    body: spends,
    signal,
    idempotent: true,
    timeoutMs: 45_000,
    retries: 1,
  });
}
