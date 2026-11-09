/**
 * bankkaro.ts — BankKaro "CardGenius" catalog API (Phase 2 / Home).
 *
 * Independent of CashKaro: its own host and its own auth. A partner JWT is
 * minted once via POST /partner/token (using the partner api-key) and then
 * sent as the `partner-token` header on every cardgenius call. The JWT is
 * cached in memory here.
 *
 * Endpoints map onto the Home UI:
 *   initBundle      → banks / networks / tags / filter metadata (bootstrap)
 *   getCards        → full card list   |  filterCards → filtered/sorted list
 *   getPopularCards → Home carousel
 *   getCardDetail   → CardDetailSheet
 *   checkEligibility→ eligibility toggle
 *   calculate       → rewards calculator
 *
 * NOTE: response shapes aren't fully typed yet — they'll be pinned down in
 * Phase 2 against live responses, then the `any` returns get real types.
 */
import { BK } from '../config/env';
import { httpRequest, ApiError } from './client';
import type { CardListFilters, EligibilityPayload } from './types';

let partnerToken: string | null = null;
// Shared in-flight mint, so parallel calls (Home fires several at once) don't
// each request a new JWT.
let minting: Promise<string> | null = null;

async function mintPartnerToken(): Promise<string> {
  const res = await httpRequest<any>(BK.baseUrl, '/token', {
    method: 'POST',
    headers: { 'partner-token': BK.partnerApiKey, 'Content-Type': 'application/json' },
    body: { 'x-api-key': BK.partnerApiKey },
  });
  const value = res?.data?.jwttoken;
  if (!value) throw new ApiError('Could not authenticate with BankKaro.', 0, res);
  return value;
}

async function getPartnerToken(): Promise<string> {
  if (partnerToken) return partnerToken;
  if (!minting) {
    minting = mintPartnerToken()
      .then((value) => {
        partnerToken = value;
        return value;
      })
      .finally(() => {
        minting = null;
      });
  }
  return minting;
}

/** Force the next call to re-mint the partner JWT. */
export function resetPartnerToken(): void {
  partnerToken = null;
}

async function bk<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = opts;
  const send = async () => {
    const headers: Record<string, string> = { 'partner-token': await getPartnerToken() };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return httpRequest<T>(BK.baseUrl, path, { method, body, headers });
  };
  try {
    return await send();
  } catch (e) {
    // The partner JWT expires server-side but was cached forever, so every
    // call 401'd until the app restarted. On an auth rejection, mint a fresh
    // JWT and retry exactly once.
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      resetPartnerToken();
      return send();
    }
    throw e;
  }
}

/** Bootstrap data: banks, networks, tags, filter options. */
export function initBundle(): Promise<any> {
  return bk('/cardgenius/init-bundle');
}

/** Cards shown in the Home carousel. */
export function getPopularCards(): Promise<any> {
  return bk('/cardgenius/popular-cards');
}

/** Full card list (unfiltered). */
export function getCards(): Promise<any> {
  return bk('/cardgenius/cards');
}

/** Filtered / sorted card list. */
export function filterCards(filters: CardListFilters): Promise<any> {
  return bk('/cardgenius/cards', { method: 'POST', body: filters });
}

/** Single card detail by alias/slug (e.g. "icici-platinum-chip-credit-card"). */
export function getCardDetail(alias: string): Promise<any> {
  return bk(`/cardgenius/cards/${encodeURIComponent(alias)}`);
}

/** Eligibility check for a given pincode / income / employment. */
export function checkEligibility(payload: EligibilityPayload): Promise<any> {
  return bk('/cardgenius/eligiblity', { method: 'POST', body: payload });
}

/** Rewards calculator across a spend breakdown. */
export function calculate(spends: Record<string, number>): Promise<any> {
  return bk('/cardgenius/calculate', { method: 'POST', body: spends });
}
