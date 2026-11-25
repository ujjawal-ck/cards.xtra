/**
 * Fixtures + API presets for harness stories.
 *
 *   api.ok()                         every endpoint answered with the default fixture
 *   api.ok({ earnings: earningsFixture.zero })     override one endpoint (body)
 *   api.ok({ earnings: reply.error(500) })         override one endpoint (status)
 *   api.loading() / api.error() / api.offline()    every call hangs / 500 / network down
 *   api.empty()                      lists empty: orders, offers, claims, cards; earnings ₹0
 * Every builder takes the same overrides object, which wins over the preset.
 */
import type { ApiParams, ApiRoute } from '../harness/apiMock';
import { reply } from '../harness/apiMock';
import { routesFor, type EndpointAnswers } from '../harness/endpoints';
import {
  profileFixture, earningsFixture, ordersFixture, orderDetailFixture, paymentInfoFixture, sendOtpFixture,
  verifyOtpFixture, paymentFixture, authFixture, offerCategoryTreeFixture, offerCategoriesFixture,
  categoryOffersFixture, offerStoreFixture,
} from './ck';
import {
  mcRetailersFixture, mcExitDatesFixture, mcQueueFixture, mcSubmitFixture, mcValidateFixture, mcTicketFixture,
} from './mc';
import {
  cardsFixture, initBundleFixture, cardRateStoresFixture, cardDetailFixture, eligibilityFixture, calculateFixture,
} from './bk';

export * from './ck';
export * from './mc';
export * from './bk';
export { FAKE, scrub, clone } from './scrub';
export { assetUri } from './assets';
export { reply } from '../harness/apiMock';
export type { EndpointAnswers, EndpointKey } from '../harness/endpoints';

/** The answer api.ok() gives each endpoint. */
export const DEFAULT_ANSWERS: Required<EndpointAnswers> = {
  loginOtp: authFixture.otpSent,
  login: authFixture.tokens,
  signupOtp: authFixture.otpSent,
  signup: authFixture.tokens,
  refreshToken: authFixture.refreshed,
  logout: authFixture.logout,
  profile: profileFixture.default,
  earnings: earningsFixture.typical,
  orders: ordersFixture.typical,
  orderDetail: orderDetailFixture.pending,
  paymentInfo: paymentInfoFixture.default,
  payment: paymentFixture.default,
  sendOtp: sendOtpFixture.default,
  verifyOtp: verifyOtpFixture.default,
  offerCategories: offerCategoriesFixture.default,
  offerCategoryTree: offerCategoryTreeFixture.default,
  cardRateStores: cardRateStoresFixture.default,
  categoryOffers: categoryOffersFixture.default,
  offerStore: offerStoreFixture.default,
  mcRetailers: mcRetailersFixture.default,
  mcExitDates: mcExitDatesFixture.default,
  mcQueue: mcQueueFixture.byStatus,
  mcSubmit: mcSubmitFixture.pending,
  mcUpdate: mcSubmitFixture.resolved,
  mcValidate: mcValidateFixture.valid,
  mcTicket: mcTicketFixture.default,
  cards: cardsFixture.default,
  cardDetail: cardDetailFixture.byAlias,
  initBundle: initBundleFixture.default,
  eligibility: eligibilityFixture.partial,
  calculate: calculateFixture.league,
};

/** Overrides for api.empty(): every list empty, earnings ₹0, payout below threshold. */
export const EMPTY_ANSWERS: EndpointAnswers = {
  earnings: earningsFixture.zero,
  paymentInfo: paymentInfoFixture.belowThreshold,
  orders: ordersFixture.empty,
  offerCategoryTree: offerCategoryTreeFixture.noSubCategories,
  categoryOffers: categoryOffersFixture.empty,
  mcRetailers: mcRetailersFixture.empty,
  mcQueue: mcQueueFixture.empty,
  mcExitDates: mcExitDatesFixture.empty,
  cards: cardsFixture.empty,
  calculate: calculateFixture.empty,
};

export interface ApiExtra {
  /** Raw routes checked BEFORE the endpoint table (custom matchers). */
  routes?: ApiRoute[];
  /** Log every answered call (default true). */
  log?: boolean;
}

const build = (mode: ApiParams['mode'], answers: EndpointAnswers, extra: ApiExtra = {}): ApiParams => ({
  mode,
  routes: [...(extra.routes ?? []), ...routesFor(answers)],
  log: extra.log,
});

export const api = {
  /** Every endpoint answered with DEFAULT_ANSWERS; `overrides` win. */
  ok: (overrides: EndpointAnswers = {}, extra?: ApiExtra): ApiParams =>
    build('ok', { ...DEFAULT_ANSWERS, ...overrides }, extra),
  /** Lists empty, earnings ₹0, no cards. `overrides` win. */
  empty: (overrides: EndpointAnswers = {}, extra?: ApiExtra): ApiParams =>
    build('empty', { ...DEFAULT_ANSWERS, ...EMPTY_ANSWERS, ...overrides }, extra),
  /** Every call never resolves (skeletons), except the endpoints in `overrides`. */
  loading: (overrides: EndpointAnswers = {}, extra?: ApiExtra): ApiParams => build('loading', overrides, extra),
  /**
   * Every call answers HTTP 500, except the endpoints in `overrides`.
   * GET calls retry twice with backoff first, so the error state shows after ~1-2 s.
   */
  error: (overrides: EndpointAnswers = {}, extra?: ApiExtra): ApiParams => build('error', overrides, extra),
  /** onlineManager offline + every call fails like a dropped network, except `overrides`. */
  offline: (overrides: EndpointAnswers = {}, extra?: ApiExtra): ApiParams => build('offline', overrides, extra),
  /** No defaults: only these answers; anything else logs "[storybook] no fixture" and fails. */
  only: (answers: EndpointAnswers, extra?: ApiExtra): ApiParams => build('ok', answers, extra),
  /** Shorthand answers for overrides. */
  reply,
};
