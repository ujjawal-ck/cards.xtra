/**
 * endpoints — every BFF call the app makes, keyed by a short name.
 * Paths come from src/api/cashkaro.ts, payments.ts, missingCashback.ts and
 * bankkaro.ts (CK = /ck, BK = /bk on https://storybook.invalid).
 *
 * ORDER MATTERS: routesFor() keeps this order, so a specific route (the
 * miniapp tree, the card-rate category) sits before a general one
 * (any /offers/category/<path>).
 */
import type { Answer, ApiRoute } from './apiMock';

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: RegExp;
  query?: Record<string, string>;
}

const exact = (p: string) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

export const ENDPOINTS = {
  // ── CK auth (LoginSheetProvider, AuthContext) ──
  loginOtp: { method: 'POST', path: exact('/ck/loginotp') },
  login: { method: 'POST', path: exact('/ck/login') },
  signupOtp: { method: 'POST', path: exact('/ck/signupotp') },
  signup: { method: 'POST', path: exact('/ck/signupV1') },
  refreshToken: { method: 'POST', path: exact('/ck/refreshtoken') },
  logout: { method: 'POST', path: exact('/ck/users/logout') },
  // ── CK user ──
  profile: { method: 'GET', path: exact('/ck/users/profile') },
  earnings: { method: 'GET', path: exact('/ck/users/earnings') },
  orders: { method: 'GET', path: exact('/ck/users/orders') },
  orderDetail: { method: 'GET', path: /^\/ck\/users\/orders\/[^/]+$/ },
  // ── CK payments (withdraw) ──
  paymentInfo: { method: 'GET', path: exact('/ck/payment/payment') },
  payment: { method: 'POST', path: exact('/ck/payment/paymentV1') },
  sendOtp: { method: 'POST', path: exact('/ck/users/sendotp') },
  verifyOtp: { method: 'POST', path: exact('/ck/users/verify') },
  // ── CK offers (guest) ──
  offerCategories: { method: 'GET', path: exact('/ck/offers/categories') },
  offerCategoryTree: { method: 'GET', path: exact('/ck/offers/category/miniapp'), query: { include: 'categories' } },
  cardRateStores: { method: 'GET', path: exact('/ck/offers/category/home-categories-exclusive') },
  categoryOffers: { method: 'GET', path: /^\/ck\/offers\/category\/.+$/ },
  offerStore: { method: 'GET', path: /^\/ck\/offers\/(?!category$|categories$)[^/]+$/ },
  // ── CK missing cashback ──
  mcRetailers: { method: 'GET', path: exact('/ck/users/missingcashback/retailers') },
  mcExitDates: { method: 'GET', path: /^\/ck\/users\/missingcashback\/exitclickdates\/[^/]+$/ },
  mcQueue: { method: 'GET', path: exact('/ck/users/missingcashback/queue') },
  mcSubmit: { method: 'POST', path: exact('/ck/users/missingcashback/queue') },
  mcUpdate: { method: 'PUT', path: /^\/ck\/users\/missingcashback\/queue\/[^/]+$/ },
  mcValidate: { method: 'POST', path: exact('/ck/users/missingcashback/validate') },
  mcTicket: { method: 'POST', path: /^\/ck\/users\/tickets\/.+$/ },
  // ── BK CardGenius ──
  cards: { method: 'GET', path: exact('/bk/cardgenius/cards') },
  cardDetail: { method: 'GET', path: /^\/bk\/cardgenius\/cards\/[^/]+$/ },
  initBundle: { method: 'GET', path: exact('/bk/cardgenius/init-bundle') },
  eligibility: { method: 'POST', path: exact('/bk/cardgenius/eligiblity') },
  calculate: { method: 'POST', path: exact('/bk/cardgenius/calculate') },
} satisfies Record<string, EndpointDef>;

export type EndpointKey = keyof typeof ENDPOINTS;

/** One answer per endpoint. Leave a key out to fall back to the api mode. */
export type EndpointAnswers = Partial<Record<EndpointKey, Answer>>;

export const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointKey[];

/** Route table for these answers, in ENDPOINTS order. */
export function routesFor(answers: EndpointAnswers): ApiRoute[] {
  const out: ApiRoute[] = [];
  for (const key of ENDPOINT_KEYS) {
    if (!(key in answers) || answers[key] === undefined) continue;
    const def: EndpointDef = ENDPOINTS[key];
    out.push({ name: key, method: def.method, match: def.path, query: def.query, answer: answers[key] });
  }
  return out;
}

/** The route for one endpoint (to prepend to another table). */
export function endpointRoute(key: EndpointKey, answer: Answer, times?: number): ApiRoute {
  const def: EndpointDef = ENDPOINTS[key];
  return { name: key, method: def.method, match: def.path, query: def.query, answer, times };
}
