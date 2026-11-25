/**
 * CashKaro (/ck) fixtures: raw API bodies, shaped like the responses the app's
 * mappers read (src/api/cashkaro.ts, payments.ts, *Mapper.ts) and the zod
 * contracts in src/api/schemas. Every raw JSON from src/api/__fixtures__ is
 * cloned and scrubbed (no personal data).
 */
import docEarnings from '../../src/api/__fixtures__/doc.earnings.json';
import stagingEarnings from '../../src/api/__fixtures__/staging.earnings.json';
import stagingProfile from '../../src/api/__fixtures__/staging.profile.json';
import docOrders from '../../src/api/__fixtures__/doc.orders.json';
import stagingOrders from '../../src/api/__fixtures__/staging.orders.json';
import docOrderDetail from '../../src/api/__fixtures__/doc.order_detail.json';
import docPaymentInfo from '../../src/api/__fixtures__/doc.payment_info.json';
import docPaymentInfo1 from '../../src/api/__fixtures__/doc.payment_info_1.json';
import docPaymentInfo2 from '../../src/api/__fixtures__/doc.payment_info_2.json';
import stagingPaymentInfo from '../../src/api/__fixtures__/staging.payment_info.json';
import docPaymentV1 from '../../src/api/__fixtures__/doc.payment_v1.json';
import docSendOtp from '../../src/api/__fixtures__/doc.sendotp.json';
import stagingOfferStore from '../../src/api/__fixtures__/staging.offer_store.json';
import stagingOffersCategory from '../../src/api/__fixtures__/staging.offers_category.json';
import stagingOffersHomeExclusive from '../../src/api/__fixtures__/staging.offers_home_exclusive.json';
import stagingOffersMiniappTree from '../../src/api/__fixtures__/staging.offers_miniapp_tree.json';
import { reply } from '../harness/apiMock';
import { FAKE, clone, scrub } from './scrub';

const ASSET = 'https://asset9.ckassets.com/resources/image/stores';

// ── Profile ──────────────────────────────────────────────────────────────────

/** GET /users/profile. staging.profile.json with fake name/email/mobile. */
export const profileFixture = {
  default: (() => {
    const p = scrub(stagingProfile);
    Object.assign(p.data[0].attributes, { fullname: FAKE.name, email: FAKE.email, mobile_number: FAKE.phone });
    return p;
  })(),
  /** Profile with empty name/email/mobile (fields render empty). */
  blank: { data: [{ type: 'user', id: 23717052, attributes: { fullname: '', email: '', mobile_number: '' } }] },
};

// ── Earnings ─────────────────────────────────────────────────────────────────

function earningsBody(a: Record<string, string>, threshold = '250.00') {
  return {
    data: [
      {
        type: 'user',
        id: 23717052,
        attributes: {
          firstname: FAKE.name,
          email: FAKE.email,
          currency: 'INR',
          has_expired_earnings: false,
          payment_threshold: threshold,
          total_referral_earned: '0.00', pending_referrals: '0.00', confirmed_referrals: '0.00', paid_referrals: '0.00',
          ...a,
        },
      },
    ],
  };
}

/** GET /users/earnings. Amounts are decimal strings, as CK sends them. */
export const earningsFixture = {
  /** A regular user: both buckets above the ₹250 threshold. Default for api.ok(). */
  typical: earningsBody({
    total_earned: '4860.00', total_cashback_earned: '3910.00', total_cashback_earned_v1: '3910.00',
    confirmed_cashback: '1240.00', pending_cashback: '2150.00', paid_cashback: '520.00',
    total_rewards_earned: '950.00', confirmed_rewards: '350.00', pending_rewards: '250.00', paid_rewards: '350.00',
  }),
  /** doc.earnings.json: a power user (₹14.5 lakh earned). */
  rich: scrub(docEarnings),
  /** staging.earnings.json: everything ₹0 (new user). */
  zero: scrub(stagingEarnings),
  /** Confirmed cashback only, no rewards. */
  cashbackOnly: earningsBody({
    total_earned: '1840.00', total_cashback_earned: '1840.00', confirmed_cashback: '1240.00', pending_cashback: '600.00',
    paid_cashback: '0.00', total_rewards_earned: '0.00', confirmed_rewards: '0.00', pending_rewards: '0.00', paid_rewards: '0.00',
  }),
  /** Confirmed rewards only (WithdrawScreen shows the "Rewards" section). */
  rewardsOnly: earningsBody({
    total_earned: '900.00', total_cashback_earned: '0.00', confirmed_cashback: '0.00', pending_cashback: '0.00',
    paid_cashback: '0.00', total_rewards_earned: '900.00', confirmed_rewards: '650.00', pending_rewards: '250.00', paid_rewards: '0.00',
  }),
  /** Confirmed ₹120 + pending, below the ₹250 withdraw minimum. */
  belowThreshold: earningsBody({
    total_earned: '560.00', total_cashback_earned: '560.00', confirmed_cashback: '120.00', pending_cashback: '440.00',
    paid_cashback: '0.00', total_rewards_earned: '0.00', confirmed_rewards: '0.00', pending_rewards: '0.00', paid_rewards: '0.00',
  }),
  /** Only pending earnings: nothing confirmed yet. */
  pendingOnly: earningsBody({
    total_earned: '780.00', total_cashback_earned: '780.00', confirmed_cashback: '0.00', pending_cashback: '780.00',
    paid_cashback: '0.00', total_rewards_earned: '0.00', confirmed_rewards: '0.00', pending_rewards: '0.00', paid_rewards: '0.00',
  }),
};

// ── Orders ───────────────────────────────────────────────────────────────────

interface OrderRow {
  id: number;
  store: string;
  logo: string;
  amount: string;
  status: 'Pending' | 'Requested' | 'Confirmed' | 'Paid' | 'Cancelled';
  type?: 'Cashback' | 'Rewards' | 'Bonus';
  date: string;
  delayed?: boolean;
  orderAmount?: string;
}

function orderAttrs(r: OrderRow, n: number) {
  return {
    merchant_name: r.store,
    merchant_image_url: r.logo,
    bonus_type: null,
    cashback_type: r.type ?? 'Cashback',
    order_id: FAKE.orderId(n),
    cashback_amount: r.amount,
    cashback_status: r.status,
    referral_name: null,
    currency: 'INR',
    comments: null,
    transaction_date: `${r.date}T10:30:00Z`,
    pending_date: `${r.date}T10:45:00Z`,
    expected_confirmation_date: '2026-12-28T00:00:00Z',
    is_delayed: r.delayed ? 'yes' : 'no',
    order_amount: r.orderAmount ?? '2499.00',
  };
}

const ORDER_ROWS: OrderRow[] = [
  { id: 24600001, store: 'Amazon', logo: `${ASSET}/amazon-1655287768.png`, amount: '184.50', status: 'Pending', date: '2026-11-12', orderAmount: '3690.00' },
  { id: 24600002, store: 'Flipkart', logo: `${ASSET}/flipkart-1640149920.png`, amount: '96.00', status: 'Pending', date: '2026-11-08', delayed: true, orderAmount: '1920.00' },
  { id: 24600003, store: 'Ajio', logo: `${ASSET}/ajio-coupons-1-1640149348.png`, amount: '312.00', status: 'Confirmed', date: '2026-10-21', orderAmount: '2600.00' },
  { id: 24600004, store: 'Amazon', logo: `${ASSET}/amazon-1655287768.png`, amount: '250.00', status: 'Paid', type: 'Rewards', date: '2026-09-30', orderAmount: '5000.00' },
  { id: 24600005, store: 'Flipkart', logo: `${ASSET}/flipkart-1640149920.png`, amount: '58.00', status: 'Cancelled', date: '2026-09-14', orderAmount: '1160.00' },
  { id: 24600006, store: 'Ajio', logo: `${ASSET}/ajio-coupons-1-1640149348.png`, amount: '140.00', status: 'Requested', date: '2026-09-02', orderAmount: '1750.00' },
];

function ordersBody(rows: OrderRow[], total = rows.length) {
  return {
    meta: { total_records: total, page_number: '1', page_size: '20' },
    data: rows.map((r, i) => ({ type: 'myorder', id: r.id, attributes: orderAttrs(r, i + 1) })),
  };
}

/** GET /users/orders (list; page size 20). */
export const ordersFixture = {
  /** 6 rows, one per status (pending, delayed, confirmed, paid, cancelled, requested). Default. */
  typical: ordersBody(ORDER_ROWS),
  /** doc.orders.json (3 pending rows, bonus types). */
  doc: scrub(docOrders),
  /** staging.orders.json: no orders (empty state). */
  empty: clone(stagingOrders),
  /** Only pending rows. */
  pending: ordersBody(ORDER_ROWS.filter((r) => r.status === 'Pending')),
};

/** GET /users/orders/:id. */
export const orderDetailFixture = {
  /** doc.order_detail.json (cancelled referral) with a fake order id and referral name. */
  doc: (() => {
    const d = scrub(docOrderDetail);
    d.data.attributes.order_id = FAKE.orderId(9001);
    return d;
  })(),
  /** A pending Amazon order. */
  pending: {
    data: {
      type: 'orderdetails',
      id: '24600001',
      attributes: { ...orderAttrs(ORDER_ROWS[0], 1), merchant_name: 'Amazon', raisequery: 'yes' },
    },
  },
  confirmed: {
    data: {
      type: 'orderdetails',
      id: '24600003',
      attributes: { ...orderAttrs(ORDER_ROWS[2], 3), confirm_date: '2026-11-15T00:00:00Z', raisequery: 'no' },
    },
  },
  paid: {
    data: {
      type: 'orderdetails',
      id: '24600004',
      attributes: { ...orderAttrs(ORDER_ROWS[3], 4), confirm_date: '2026-10-20T00:00:00Z', paid_date: '2026-10-28T00:00:00Z', raisequery: 'no' },
    },
  },
};

// ── Payments (withdraw) ──────────────────────────────────────────────────────

/**
 * GET /payment/payment. `default` is HTTP 200; the others are reply values
 * with HTTP 400 + error code, which usePaymentInfo turns into flags.
 */
export const paymentInfoFixture = {
  /** doc.payment_info.json: methods Amazon 12, Flipkart 13, IMPS 18, UPI 20; threshold ₹100. */
  default: scrub(docPaymentInfo),
  /** 400 / 5003 below threshold, cashout_limit ₹250 (staging.payment_info.json). */
  belowThreshold: reply.error(400, clone(stagingPaymentInfo)),
  /** 400 / 5003 below threshold, cashout_limit ₹100 (doc.payment_info_1.json). */
  belowThreshold100: reply.error(400, clone(docPaymentInfo1)),
  /** 400 / 5002 a payment is already in process (₹20 requested; doc.payment_info_2.json). */
  inProcess: reply.error(400, clone(docPaymentInfo2)),
};

/** POST /users/sendotp (payment OTP). Note the singular `attribute` key. */
export const sendOtpFixture = {
  default: (() => {
    const d = scrub(docSendOtp);
    d.data.attribute.sent_to_mobile = FAKE.phone;
    return d;
  })(),
  /** 429 rate limit (too many OTP requests). */
  rateLimited: reply.code(429, '7005', 'Too many OTP requests. Please try again after some time.'),
};

/** POST /users/verify. Success = 200 with no `error` and no `data.errors`. */
export const verifyOtpFixture = {
  default: { data: { type: 'user_otp', id: 19, attributes: { verified: true } }, meta: { message: 'OTP verified' } },
  /** 200 with an error item: the app shows "Enter a valid OTP". */
  wrong: { data: { errors: [{ code: '7002', title: 'Wrong OTP', detail: 'Please enter a valid OTP' }] } },
  /** 429 too many attempts. */
  rateLimited: reply.code(429, '7005', 'Too many attempts. Please try again after some time.'),
};

/** POST /payment/paymentV1 (UPI / Amazon / Flipkart). */
export const paymentFixture = {
  /** doc.payment_v1.json: accepted. */
  default: clone(docPaymentV1),
  upi: {
    data: { type: 'payment', id: 520103 },
    meta: { status: 'accepted', message: 'We have initiated your UPI payment of ₹1,240. It will reach your account shortly.', payment_reference_number: 'CKPAY0001' },
  },
  /** 400 already pending (5002). */
  alreadyPending: reply.code(400, '5002', 'A payment request from you is already pending.', { requested_earnings: '1240.00' }),
};

// ── Auth (LoginSheetProvider) ────────────────────────────────────────────────

const OTP_GUID = 'sb0otp0guid0000000000000000000001';

/** POST /loginotp, /signupotp → otp guid in data.id. POST /login, /signupV1 → tokens. */
export const authFixture = {
  otpSent: { data: { type: 'user_otp', id: OTP_GUID, attributes: { otp_expire_sec: 180 } }, meta: { message: `OTP sent to ${FAKE.phone}` } },
  /** /loginotp for a number not registered with CashKaro (code 2010) → the app switches to signup. */
  notRegistered: reply.code(400, '2010', 'User not registered'),
  /** 429: too many OTP requests. */
  otpRateLimited: reply.code(429, '7005', 'Too many OTP requests. Please try again after some time.'),
  tokens: {
    data: { type: 'auth', id: 23717052, attributes: { access_token: 'storybook-access-token-2', refresh_token: 'storybook-refresh-token-2' } },
  },
  /** /login or /signupV1 with a wrong code (7002). */
  wrongOtp: reply.code(400, '7002', 'Wrong OTP. Please check and try again.'),
  /** /refreshtoken success. */
  refreshed: { data: { type: 'auth', attributes: { access_token: 'storybook-access-token-3', refresh_token: 'storybook-refresh-token-3' } } },
  /** /users/logout. */
  logout: { meta: { message: 'Logged out' } },
};

// ── Offers (guest) ───────────────────────────────────────────────────────────

const SUB_CATEGORIES = [
  ['fashion-offers-ma', 'Fashion'],
  ['beauty-personal-care-offers-ma', 'Beauty'],
  ['electronics-offers-ma', 'Electronics'],
  ['food-and-grocery-ma', 'Food & Grocery'],
  ['travel-offers-ma', 'Travel'],
  ['home-kitchen-offers-ma', 'Home & Kitchen'],
] as const;

/**
 * GET /offers/category/miniapp?include=categories (the Offers strip).
 * buildOfferCategoriesFromApi reads included[].categories.relationships.sub_categories.data[].
 */
export const offerCategoryTreeFixture = {
  default: {
    data: [clone(stagingOffersCategory.data[0])],
    included: [
      {
        type: 'categories',
        id: 900,
        categories: {
          attributes: { name: 'CK MINI APP', unique_identifier: 'miniapp' },
          relationships: {
            sub_categories: {
              data: SUB_CATEGORIES.map(([slug, name], i) => ({ type: 'category', id: 901 + i, attributes: { name, unique_identifier: slug } })),
            },
          },
        },
      },
    ],
  },
  /** Parent with no sub-categories: the strip shows only "All". */
  noSubCategories: { data: [], included: [] },
  /** staging.offers_miniapp_tree.json: 400 "Invalid Category" (prod today) → the app falls back to /offers/categories. */
  invalidCategory: reply.error(400, clone(stagingOffersMiniappTree)),
};

/** GET /offers/categories (top-level fallback when the miniapp tree is a 400). */
export const offerCategoriesFixture = {
  default: {
    data: [
      ['highest-cashback-stores', 'Highest Cashback Stores'],
      ['voucher-deals', 'Voucher Deals'],
      ['health-beauty', 'Health & Beauty'],
      ['electronics-category', 'Electronics'],
      ['more-category-offers', 'More Categories'],
      ['home-categories-exclusive', 'Home Categories Exclusive'],
    ].map(([slug, name], i) => ({ type: 'category', id: 700 + i, attributes: { name, unique_identifier: slug, parent_id: 0 } })),
  },
};

/** GET /offers/category/<path>?page[size]=100 (Offers grid; any path). */
export const categoryOffersFixture = {
  /** staging.offers_category.json: AJIO, Amazon Fashion, Shopsy, Tata CLiQ, Zop. */
  default: clone(stagingOffersCategory),
  empty: { meta: { total_records: 0, page_number: 1, page_size: '100' }, data: [] },
  /** staging.offers_home_exclusive.json: Dot & Key IDFC, Nykaa Fashion. */
  homeExclusive: clone(stagingOffersHomeExclusive),
};

/** GET /offers/:slug (store page). staging.offer_store.json is AJIO (slug ajio-coupons) and answers any slug. */
export const offerStoreFixture = {
  default: clone(stagingOfferStore),
  notFound: reply.code(404, '10004', 'Store not found'),
};
