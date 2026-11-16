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
 */
import { BK } from '../config/env';
import { httpRequest } from './http/client';
import type { EligibilityPayload } from './types';

async function bk<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal; idempotent?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, signal, idempotent } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return httpRequest<T>(BK.baseUrl, path, { method, body, headers, signal, idempotent });
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

