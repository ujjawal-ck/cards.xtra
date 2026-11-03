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
import { httpRequest } from './http/client';
import { ApiError } from './http/errors';
import { createCachedToken, withCachedToken } from './http/tokenManager';
import type { CardListFilters, EligibilityPayload } from './types';

// Partner JWT (POST /token). Cached until shortly before its exp, minted
// single-flight, re-minted once when a call returns 401/403. Previously it was
// cached forever, so every card call failed after the JWT expired.
const PARTNER_TOKEN_FALLBACK_TTL = 50 * 60 * 1000;
const partnerToken = createCachedToken(async () => {
  const res = await httpRequest<any>(BK.baseUrl, '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { 'x-api-key': BK.partnerApiKey },
  });
  const value = res?.data?.jwttoken;
  if (!value) throw new ApiError('Could not authenticate with BankKaro.', 0, res);
  return value as string;
}, PARTNER_TOKEN_FALLBACK_TTL);

/** Force the next call to re-mint the partner JWT. */
export function resetPartnerToken(): void {
  partnerToken.invalidate();
}

async function bk<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal; idempotent?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, signal, idempotent } = opts;
  return withCachedToken(partnerToken, (token) => {
    const headers: Record<string, string> = { 'partner-token': token };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return httpRequest<T>(BK.baseUrl, path, { method, body, headers, signal, idempotent });
  });
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
  return bk('/cardgenius/cards', { method: 'POST', body: filters, idempotent: true });
}

/** Single card detail by alias/slug (e.g. "icici-platinum-chip-credit-card"). */
export function getCardDetail(alias: string): Promise<any> {
  return bk(`/cardgenius/cards/${encodeURIComponent(alias)}`);
}

/** Eligibility check for a given pincode / income / employment. */
export function checkEligibility(payload: EligibilityPayload): Promise<any> {
  return bk('/cardgenius/eligiblity', { method: 'POST', body: payload, idempotent: true });
}

/** Rewards calculator across a spend breakdown. */
export function calculate(spends: Record<string, number>): Promise<any> {
  return bk('/cardgenius/calculate', { method: 'POST', body: spends });
}
