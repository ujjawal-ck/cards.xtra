/**
 * BankKaro CardGenius (/bk/cardgenius/*) fixtures + the CK card-rate stores.
 *
 * Shapes follow the mappers, not zod (BK has no contract):
 *  - cards: src/api/cardMapper.ts BkCard. A card is kept only with status:true
 *    AND a reward (CK rate by ck_store_id, or `commission`). Numeric fee text
 *    keeps `crossSell` defined (cross-sell rail, CardsYouCanGet).
 *  - ids + card_alias of the first four cards equal rows in the
 *    uat.calculate_* fixtures, so tool league rows join an app card.
 *  - card art: bundled assets (no CDN request).
 * Reward amounts are display data only.
 */
import calcTrimmed from '../../src/api/__fixtures__/uat.calculate_trimmed.json';
import calcLeague from '../../src/api/__fixtures__/uat.calculate_league_trimmed.json';
import calcWaiverLounge from '../../src/api/__fixtures__/uat.calculate_waiver_lounge_trimmed.json';
import type { BkCard } from '../../src/api/cardMapper';
import type { CalculateSpends } from '../../src/api/types';
import type { ApiRequest } from '../harness/apiMock';
import { reply } from '../harness/apiMock';
import { assetUri, images } from './assets';
import { clone } from './scrub';

const T = {
  fuel: { id: 1, name: 'Fuel' },
  shopping: { id: 2, name: 'Shopping' },
  lounge: { id: 4, name: 'Airport Lounge' },
  food: { id: 5, name: 'Food Ordering' },
  dining: { id: 6, name: 'Dining' },
  grocery: { id: 7, name: 'Grocery' },
  travel: { id: 12, name: 'Travel' },
  bills: { id: 14, name: 'Utility Bills' },
  upi: { id: 15, name: 'UPI' },
};

const usp = (header: string, description: string, tag_id = 0) => ({ header, description, tag_id });

function card(c: Partial<BkCard> & Pick<BkCard, 'id' | 'name' | 'card_alias' | 'bank_id'>): BkCard {
  return {
    status: true,
    card_type: 'Visa',
    commission: '1000',
    bk_commission: '1200',
    joining_fee_text: '499',
    annual_fee_text: '499',
    annual_fee_waiver: 'Annual fee waived on spends of ₹1,00,000 in a year',
    joining_fee_comment: 'Not Applicable',
    age_criteria: '21-60',
    age_self_emp: '21-65',
    income: '25000',
    income_salaried: '3',
    income_self_emp: '4',
    crif: '750',
    new_to_credit: false,
    existing_customer: true,
    invite_only: false,
    priority: '10',
    network_url: 'https://storybook.invalid/apply/{user_id}?click={click_id}',
    tags: [],
    product_usps: [],
    ...c,
  };
}

const CARDS: BkCard[] = [
  card({
    id: 80, name: 'HDFC Regalia Gold Credit Card', card_alias: 'hdfc-regalia-gold', bank_id: 6, card_type: 'Mastercard',
    image: assetUri(images.cards.hdfcRegaliaGold), ck_store_id: 24701, commission: '2500', joining_fee_text: '2500', annual_fee_text: '2500',
    income_salaried: '12', income_self_emp: '15', income: '100000', priority: '2',
    tags: [T.travel, T.lounge, T.dining],
    product_usps: [
      usp('12 complimentary', 'domestic lounge visits a year', 4),
      usp('5X reward points', 'on Myntra, Nykaa and Marks & Spencer', 2),
      usp('Up to 15% off', 'at partner restaurants via Swiggy Dineout', 6),
      usp('1% fuel surcharge', 'waiver at all fuel stations', 1),
    ],
  }),
  card({
    id: 27, name: 'SBI Cashback Credit Card', card_alias: 'sbi-cashback-credit-card', bank_id: 3,
    image: assetUri(images.cards.sbiCashback), ck_store_id: 24756, commission: '1400', joining_fee_text: '999', annual_fee_text: '999',
    annual_fee_waiver: 'Annual fee waived on spends of ₹2,00,000 in a year', priority: '1',
    tags: [T.shopping, T.food, T.grocery],
    product_usps: [
      usp('Get 5% Cashback on', 'all online spends, capped at ₹5,000 a month', 2),
      usp('Get 1% Cashback on', 'offline spends', 0),
      usp('1% fuel surcharge', 'waiver up to ₹100 a month', 1),
    ],
  }),
  card({
    id: 50, name: 'HSBC Live+ Credit Card', card_alias: 'hsbc-live-plus-credit-card', bank_id: 12, card_type: 'Visa',
    image: assetUri(images.cards.hsbcCashback), ck_store_id: 24760, commission: '1500', joining_fee_text: '999', annual_fee_text: '999', priority: '3',
    tags: [T.dining, T.food, T.grocery],
    product_usps: [
      usp('10% cashback on', 'dining, food delivery and grocery', 6),
      usp('1.5% cashback on', 'all other eligible spends', 0),
      usp('4 complimentary', 'domestic lounge visits a year', 4),
    ],
  }),
  card({
    id: 173, name: 'Axis Bank Magnus for Burgundy Credit Card', card_alias: 'magnus-burgundy-credit-card', bank_id: 1, card_type: 'Visa',
    image: assetUri(images.cards.axisMagnus), ck_store_id: undefined, commission: '3000', joining_fee_text: '30000', annual_fee_text: '30000',
    invite_only: true, income_salaried: '30', income_self_emp: '30', income: '250000', priority: '20',
    tags: [T.travel, T.lounge],
    product_usps: [usp('Unlimited lounge', 'access for you and guests', 4), usp('35 EDGE Miles', 'per ₹200 on travel', 12)],
  }),
  card({
    id: 1101, name: 'Swiggy HDFC Bank Credit Card', card_alias: 'swiggy-hdfc-bank-credit-card', bank_id: 6, card_type: 'Mastercard',
    image: assetUri(images.cards.hdfcSwiggy), ck_store_id: 24702, commission: '1200', joining_fee_text: '500', annual_fee_text: '500', priority: '4',
    tags: [T.food, T.shopping],
    product_usps: [usp('10% cashback on', 'Swiggy food, Instamart and Dineout', 5), usp('5% cashback on', 'online spends at top brands', 2)],
  }),
  card({
    id: 1102, name: 'ICICI Bank Coral Credit Card', card_alias: 'icici-coral-credit-card', bank_id: 14, card_type: 'Visa',
    image: assetUri(images.cards.iciciCoral), ck_store_id: 24703, commission: '900', joining_fee_text: '500', annual_fee_text: '500', priority: '6',
    tags: [T.dining, T.lounge],
    product_usps: [usp('25% off', 'on movie tickets via BookMyShow', 0), usp('1 complimentary', 'lounge visit a quarter', 4)],
  }),
  card({
    id: 1103, name: 'SBI SimplyCLICK Credit Card', card_alias: 'sbi-simplyclick-credit-card', bank_id: 3,
    image: assetUri(images.cards.sbiSimplyclick), ck_store_id: 24704, commission: '800', joining_fee_text: '499', annual_fee_text: '499', priority: '7',
    tags: [T.shopping],
    product_usps: [usp('10X reward points', 'on partner online brands', 2), usp('₹500 gift card', 'on joining', 0)],
  }),
  card({
    id: 1104, name: 'Flipkart Axis Bank Credit Card', card_alias: 'flipkart-axis-bank-credit-card', bank_id: 1, card_type: 'Mastercard',
    image: assetUri(images.cards.axisFlipkart), ck_store_id: 24705, commission: '1100', joining_fee_text: '500', annual_fee_text: '500', priority: '5',
    tags: [T.shopping, T.travel],
    product_usps: [usp('5% cashback on', 'Flipkart and Cleartrip', 2), usp('4% cashback on', 'preferred partners like Swiggy and Uber', 5)],
  }),
  card({
    id: 1105, name: 'Scapia Federal Bank Credit Card', card_alias: 'scapia-federal-bank-credit-card', bank_id: 17,
    image: assetUri(images.cards.federalScapia), ck_store_id: 24706, commission: '700', joining_fee_text: '0', annual_fee_text: '0',
    annual_fee_waiver: 'Not Applicable', new_to_credit: true, income_salaried: '2', income: '20000', priority: '8',
    tags: [T.travel, T.lounge],
    product_usps: [usp('10% Scapia coins', 'on all spends', 12), usp('Zero forex', 'markup on international spends', 12)],
  }),
  card({
    id: 1106, name: 'ICICI Bank HPCL Super Saver Credit Card', card_alias: 'icici-hpcl-super-saver-credit-card', bank_id: 14,
    image: assetUri(images.cards.iciciHpclSuperSaver), ck_store_id: undefined, commission: '600', joining_fee_text: '500', annual_fee_text: '500', priority: '9',
    tags: [T.fuel, T.bills],
    product_usps: [usp('5% cashback on', 'HPCL fuel spends', 1), usp('5% cashback on', 'electricity and mobile bills', 14)],
  }),
  // Dropped by useCards (status:false): proves the filter, never shown.
  card({ id: 1199, name: 'Discontinued Test Card', card_alias: 'discontinued-test-card', bank_id: 3, status: false }),
];

/** GET /cardgenius/cards. */
export const cardsFixture = {
  /** 10 active cards + 1 inactive. Default. */
  default: { status: true, message: 'success', data: CARDS },
  /** Only the cards that join the calculate fixtures (ids 80, 27, 50, 173). */
  calculateJoin: { status: true, message: 'success', data: CARDS.filter((c) => [80, 27, 50, 173].includes(c.id)) },
  empty: { status: true, message: 'success', data: [] as BkCard[] },
};

/** The raw cards, to build custom bodies. */
export const BK_CARDS = CARDS;

/** GET /cardgenius/init-bundle. Only `data.bank_data` is read (bank names; logos optional). */
export const initBundleFixture = {
  default: {
    status: true,
    data: {
      bank_data: [
        { id: 1, name: 'Axis Bank' },
        { id: 3, name: 'SBI Card' },
        { id: 6, name: 'HDFC Bank' },
        { id: 12, name: 'HSBC Bank' },
        { id: 14, name: 'ICICI Bank' },
        { id: 17, name: 'Federal Bank' },
      ],
      tag_data: Object.values(T),
    },
  },
};

/**
 * GET /offers/category/home-categories-exclusive (CK card-rate stores; paged
 * until a page has < 100 rows, so one page here). Row id = BK ck_store_id;
 * cashback.payment_type 'currency' = ₹. secondary_cashback_count > 0 = "Upto".
 */
export const cardRateStoresFixture = {
  default: {
    meta: { total_records: 7, page_number: 1, page_size: '100' },
    data: [
      [24701, 'HDFC Regalia Gold Credit Card', '2000', 0],
      [24756, 'SBI Cashback Credit Card', '1200', 0],
      [24760, 'HSBC Live+ Credit Card', '1500', 1],
      [24702, 'Swiggy HDFC Bank Credit Card', '1000', 0],
      [24703, 'ICICI Bank Coral Credit Card', '750', 0],
      [24704, 'SBI SimplyCLICK Credit Card', '700', 0],
      [24705, 'Flipkart Axis Bank Credit Card', '1100', 1],
    ].map(([id, name, amount, secondary]) => ({
      type: 'offer',
      id,
      attributes: {
        name,
        unique_identifier: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        cashback_type: 'Rewards',
        cashback: { payment_type: 'currency', amount, currency: 'INR' },
        secondary_cashback_count: secondary,
        cashback_url: `https://storybook.invalid/visitretailer/app/${id}?id=`,
        image_url: '',
      },
    })),
  },
  empty: { meta: { total_records: 0 }, data: [] },
};

// ── Card detail (benefits tabs) ──────────────────────────────────────────────

const li = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

/** GET /cardgenius/cards/:alias body for one card. mapCardBenefits reads data[0].product_benefits. */
export function cardDetailBody(alias: string) {
  const c = CARDS.find((x) => x.card_alias === alias);
  const usps = (c?.product_usps ?? []).map((u) => `${u.header} ${u.description}`.trim());
  return {
    status: true,
    data: [
      {
        id: c?.id ?? 0,
        name: c?.name ?? alias,
        card_alias: alias,
        product_benefits: [
          { benefit_type: 'all', html_text: li(usps.length ? usps : ['Reward points on every spend']) },
          { benefit_type: 'welcome', html_text: li(['Welcome gift voucher on paying the joining fee', 'Bonus reward points on first spend within 30 days']) },
          { benefit_type: 'milestone', html_text: li(['Bonus voucher on spends of ₹1,50,000 in a quarter']) },
          { benefit_type: 'lounge', html_text: li(['Complimentary domestic lounge access every quarter']) },
          { benefit_type: 'dining', html_text: li(['Up to 15% off at partner restaurants']) },
          { benefit_type: 'fuel', html_text: li(['1% fuel surcharge waiver on transactions between ₹400 and ₹5,000']) },
          { benefit_type: 'insurance', html_text: li(['This card does not offer any benefits in this category']) },
        ],
      },
    ],
  };
}

export const cardDetailFixture = {
  /** Responder: builds the body for the alias in the path. Default for api.ok(). */
  byAlias: (req: ApiRequest) => cardDetailBody(decodeURIComponent(req.path.split('/').pop() ?? '')),
  /** A card with no benefits: the "no benefits" body. */
  empty: { status: true, data: [{ product_benefits: [] }] },
};

// ── Eligibility ──────────────────────────────────────────────────────────────

const ACTIVE_ALIASES = CARDS.filter((c) => c.status).map((c) => c.card_alias as string);
const elig = (eligible: (alias: string) => boolean) => ({
  status: true,
  data: ACTIVE_ALIASES.map((a, i) => ({ card_alias: a, product_id: i % 3 === 0 ? null : 1000 + i, eligible: eligible(a) })),
});

/**
 * POST /cardgenius/eligiblity (sic). The API only says eligible true/false per
 * card_alias. The app's verdict (classifyCardEligibility in src/api/eligibility.ts):
 *   eligible   = alias in the eligible set
 *   maybe      = rejected AND monthly income in [80%, 100%) of the card's bar
 *   ineligible = rejected otherwise
 * Bar by annual fee: ≥ ₹2,500 → ₹1,00,000/mo; ≥ ₹500 → ₹50,000/mo; else ₹25,000/mo.
 * Example with `partial`: SBI Cashback (₹999 fee, bar ₹50,000) is rejected, so
 * income ₹45,000 → maybe, income ₹30,000 or ₹60,000 → ineligible.
 */
export const eligibilityFixture = {
  /** Every card eligible → EligibleSheet. */
  allEligible: elig(() => true),
  /** Entry cards eligible; SBI Cashback, Regalia Gold and Magnus rejected → maybe or ineligible by income. */
  partial: elig((a) => !['sbi-cashback-credit-card', 'hdfc-regalia-gold', 'magnus-burgundy-credit-card'].includes(a)),
  /** No card eligible → IneligibleSheet / CardsYouCanGet. */
  noneEligible: elig(() => false),
  /** 422 bad pincode. */
  invalidPincode: reply.code(422, '422', 'Please enter a valid pincode.'),
};

/** Inputs that produce each verdict for SBI Cashback with `eligibilityFixture.partial`. */
export const ELIGIBILITY_INPUTS = {
  eligibleCard: 'hsbc-live-plus-credit-card',
  maybe: { pincode: '560001', incomeMonthly: 45000, selfEmployed: false, card: 'sbi-cashback-credit-card' },
  ineligible: { pincode: '560001', incomeMonthly: 30000, selfEmployed: false, card: 'sbi-cashback-credit-card' },
} as const;

// ── Calculate (card tools) ───────────────────────────────────────────────────

/** POST /cardgenius/calculate. The app ignores the body match: any spends get the same rows. */
export const calculateFixture = {
  /** uat.calculate_league_trimmed.json: 9 rows (incl. hsbc-live-plus, hdfc-regalia-gold). Default. */
  league: clone(calcLeague),
  /** uat.calculate_trimmed.json: 5 rows (incl. sbi-cashback, magnus-burgundy). */
  trimmed: clone(calcTrimmed),
  /** uat.calculate_waiver_lounge_trimmed.json: 6 rows with fee-waiver and lounge data. */
  waiverLounge: clone(calcWaiverLounge),
  empty: { status: true, message: 'success', data: { success: true, message: 'success', savings: [] } },
};

const SPEND_ZERO: CalculateSpends = {
  amazon_spends: 0, flipkart_spends: 0, other_online_spends: 0, grocery_spends_online: 0, online_food_ordering: 0,
  other_offline_spends: 0, offline_grocery: 0, dining_or_going_out: 0, fuel: 0, mobile_phone_bills: 0,
  electricity_bills: 0, water_bills: 0, rent: 0, school_fees: 0, insurance_health_annual: 0,
  insurance_car_or_bike_annual: 0, life_insurance: 0, flights_annual: 0, hotels_annual: 0,
  domestic_lounge_usage_quarterly: 0, international_lounge_usage_quarterly: 0,
};

/** A full CalculateSpends (all 21 keys) from a partial one; missing keys are 0. */
export function spends(partial: Partial<CalculateSpends> = {}): CalculateSpends {
  return { ...SPEND_ZERO, ...partial };
}

/** Monthly spend profiles for tool stories. */
export const spendsFixture = {
  typical: spends({ amazon_spends: 8000, flipkart_spends: 4000, online_food_ordering: 3000, offline_grocery: 6000, fuel: 3000, mobile_phone_bills: 800, electricity_bills: 2500 }),
  online: spends({ amazon_spends: 15000, flipkart_spends: 10000, other_online_spends: 5000 }),
  traveller: spends({ flights_annual: 120000, hotels_annual: 80000, domestic_lounge_usage_quarterly: 3, international_lounge_usage_quarterly: 1, dining_or_going_out: 6000 }),
  none: spends(),
};
