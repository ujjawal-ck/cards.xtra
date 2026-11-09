/**
 * schemas — runtime contracts for the CashKaro / BankKaro responses the app
 * reads.
 *
 * Deliberately lenient: unknown fields pass through, most fields are
 * optional, and amounts accept "123.40" or 123.4. A schema only fails when the
 * response stops matching what our mappers depend on (missing `data`, an
 * attribute that changed type, an array that became an object). That's the
 * signal we want in Crashlytics — not noise from every new field CK adds.
 *
 * Shapes come from the CK Mini Apps doc examples and live staging/prod
 * responses (see src/api/__fixtures__).
 */
import { z } from 'zod';

/** "22991.60" | 22991.6 | null — CK sends money as decimal strings. */
const amount = z.union([z.string(), z.number()]).nullish();
const id = z.union([z.string(), z.number()]);
const str = z.string().nullish();

/** A JSON:API resource with typed attributes. */
const resource = <A extends z.ZodTypeAny>(attributes: A) =>
  z.object({ type: z.string().optional(), id: id.nullish(), attributes }).passthrough();

// ── Users ───────────────────────────────────────────────────────────────────

const earningsAttrs = z
  .object({
    total_earned: amount,
    total_cashback_earned: amount,
    total_rewards_earned: amount,
    confirmed_cashback: amount,
    pending_cashback: amount,
    paid_cashback: amount,
    payment_threshold: amount,
    currency: str,
  })
  .passthrough();

/** GET /users/earnings — `data` is an array of one `user` row. */
export const EarningsResponse = z
  .object({ data: z.array(resource(earningsAttrs)).min(1) })
  .passthrough();

/** GET /users/profile — same envelope; `id` is the attribution user id. */
export const ProfileResponse = z
  .object({
    data: z
      .array(
        resource(
          z.object({ fullname: str, email: str, mobile_number: z.union([z.string(), z.number()]).nullish() }).passthrough(),
        ).extend({ id }),
      )
      .min(1),
  })
  .passthrough();

const orderAttrs = z
  .object({
    order_id: str,
    cashback_amount: amount,
    cashback_status: str,
    cashback_type: str,
    merchant_image_url: str,
    bonus_type: str,
    comments: str,
    currency: str,
  })
  .passthrough();

/** GET /users/orders */
export const OrdersResponse = z
  .object({
    data: z.array(resource(orderAttrs)),
    meta: z.object({ total_records: z.number().optional() }).passthrough().optional(),
  })
  .passthrough();

/** GET /users/orders/:cashbackid */
export const OrderDetailResponse = z
  .object({
    data: resource(
      orderAttrs.extend({
        order_amount: amount,
        merchant_name: str,
        transaction_date: str,
        expected_confirmation_date: str,
      }),
    ),
  })
  .passthrough();

// ── Offers ──────────────────────────────────────────────────────────────────

const offerAttrs = z
  .object({
    name: z.string(),
    unique_identifier: z.string(),
    cashback_url: str,
    image_url: str,
    cashback_type: str,
    cashback: z
      .object({ payment_type: str, amount: amount, currency: str, details: str })
      .passthrough()
      .nullish(),
  })
  .passthrough();

/** GET /offers/category/:slug */
export const OffersByCategoryResponse = z
  .object({
    data: z.array(resource(offerAttrs)),
    meta: z.object({ total_records: z.number().optional() }).passthrough().optional(),
  })
  .passthrough();

/** GET /offers/:slug */
export const MerchantOfferResponse = z.object({ data: resource(offerAttrs) }).passthrough();

// ── Payments ────────────────────────────────────────────────────────────────

const paymentMethod = z
  .object({
    id,
    attributes: z.object({ payment_name: z.string(), payment_user_info: z.record(z.unknown()).nullish() }).passthrough(),
  })
  .passthrough();

/** GET /payment/payment (200). Below-threshold / pending come back as 400s. */
export const PaymentInfoResponse = z
  .object({
    data: resource(
      z
        .object({
          total_earnings: amount,
          cashback_earnings: amount,
          rewards_earnings: amount,
          payment_threshold: amount,
          currency_code: str,
        })
        .passthrough(),
    ),
    relationships: z
      .object({ payment_methods: z.object({ data: z.array(paymentMethod) }).passthrough().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** POST /users/sendotp — note the singular `attribute` key in CK's response. */
export const SendOtpResponse = z
  .object({
    data: z
      .object({
        attribute: z.object({ otp_guid: z.string(), sent_to_mobile: str }).passthrough().optional(),
        attributes: z.object({ otp_guid: z.string(), sent_to_mobile: str }).passthrough().optional(),
      })
      .passthrough()
      .refine((d) => !!(d.attribute?.otp_guid || d.attributes?.otp_guid), 'otp_guid missing'),
  })
  .passthrough();

/** POST /payment/paymentV1 */
export const PaymentRequestResponse = z
  .object({
    data: z.object({ type: z.string().optional(), id: id.nullish() }).passthrough(),
    meta: z.object({ status: str, message: str, payment_reference_number: str }).passthrough(),
  })
  .passthrough();

// ── Missing cashback ────────────────────────────────────────────────────────

/** GET /users/missingcashback/retailers */
export const McRetailersResponse = z
  .object({
    data: z.array(
      resource(z.object({ report_merchant_name: z.string(), group: str, tracking_speed: str, image_url: str }).passthrough()).extend({ id }),
    ),
  })
  .passthrough();

/** GET /users/missingcashback/exitclickdates/:storeid */
export const McExitDatesResponse = z
  .object({
    data: z.array(resource(z.object({ exitclick_date: z.string(), month: str }).passthrough())),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();

/** GET /users/missingcashback/queue */
export const McQueueResponse = z
  .object({
    data: z.array(
      resource(
        z
          .object({
            status: str,
            details: str,
            order_id: str,
            order_amount: amount,
            click_date: str,
            report_storename: str,
            cashback_id: id.nullish(),
            ticket_id: id.nullish(),
            cashbackvalue: amount,
            comments: str,
            groupid: str,
          })
          .passthrough(),
      ),
    ),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();

// ── Auth ────────────────────────────────────────────────────────────────────

/** POST /login, /signupV1 */
export const AuthTokensResponse = z
  .object({
    data: resource(z.object({ access_token: z.string(), refresh_token: z.string() }).passthrough()),
  })
  .passthrough();

/** POST /loginotp, /signupotp — the otp guid is `data.id`. */
export const OtpRequestResponse = z
  .object({ data: z.object({ id: z.string() }).passthrough() })
  .passthrough();
