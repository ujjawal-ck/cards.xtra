# API reference

Every backend call the app makes, with the request it sends, the response fields it reads, how errors are handled, and which screens use it. 33 endpoints: 29 on CashKaro (CK), 6 on BankKaro (BK), 1 external. For the order of calls per user journey see the "API flow" section of the build-status page; for tokens and secrets see `auth-and-secrets.md`.

No secret values appear here; keys are referred to by their `.env` names.

## Shared behaviour

**HTTP client** (`src/api/client.ts`)
- Joins base + path, drops undefined query values, encodes the rest.
- Body: strings as-is, `FormData` untouched (multipart), everything else JSON.
- 20 s timeout (`AbortController`). The client never retries.
- Every failure becomes `ApiError { message, status, payload }`: network error or timeout → status 0; non-2xx → real status with the parsed body. Message comes from `errors[0].detail|title|message`, then `meta.message`, `message`, `error`.
- A 200 response that carries an error in its body is not treated as an error, except `/users/verify` (checked with `verifyHasError`).

**React Query** (`src/query/queryClient.ts`): retry once (never on 401/403), staleTime 5 min, gcTime 30 min, refetch on focus; screen hooks also refetch when the screen regains focus (`useRefetchOnFocus`). Mutations don't retry.

**CashKaro** (`src/config/env.ts`, `ck()` in `src/api/cashkaro.ts`)
- Base: prod `https://ckminapps.com/v1` (`appVersion` 4.9), staging `https://ckapistaging.lmssecure.com/v1` (4.6, host no longer resolves). Selected by `EXPO_PUBLIC_STAGE`.
- Headers on every call: `Accept: application/vnd.api+json`, `x-chkr-app-version`, `x-api-key: EXPO_PUBLIC_CK_API_KEY`; JSON bodies add `Content-Type: application/vnd.api+json`.
- Auth modes: **app token** (`Authorization: Bearer <token from GET /token>`, cached 30 min) or **user token** (`Bearer <access_token>`).
- Most calls send `?device=App` (exceptions noted).
- User-token 401/403 → `POST /refreshtoken` once (shared in-flight), retry once; if the refresh itself is rejected, sign out.

**BankKaro** (`bk()` in `src/api/bankkaro.ts`)
- Base `https://platform.bankkaro.com/partner`. Header `partner-token: <JWT>`; JSON bodies add `Content-Type: application/json`.
- JWT minted once and cached; on 401/403 re-mint and retry once.

---

## CashKaro: auth

| # | Call | Request | Response read | Used by / notes |
|---|---|---|---|---|
| 1 | `GET /token` | CK headers + optional `Authorization: Basic (EXPO_PUBLIC_CK_BASIC_USER:PASS)`; no `device` | `data.attributes.token` → app token | Before any app-token call. No 401 retry (`resetAwsToken` unused). |
| 2 | `POST /loginotp?device=App` (app token) | `{data:{type:"user_otp",attributes:{mobile_number:<number>}}}` | `data.id` → `otp_guid`; `data.attributes.otp_expire_sec` (not shown) | Onboarding login sheet: Get OTP, Resend. "not regist…" error → signup. |
| 3 | `POST /signupotp` (app token, **no** `device`) | Same as #2 | Same as #2 | Fallback for new numbers; Resend in signup mode. |
| 4 | `POST /login?device=App` (app token) | `{data:{type:"auth",attributes:{mobile_number,otp_guid,otp:"digits",device_info}}}` | `data.attributes.access_token`, `refresh_token` | Verify (existing user). `device_info` fields: see `auth-and-secrets.md`. |
| 5 | `POST /signupV1?device=App` (app token) | `{data:{type:"auth",attributes:{fullname,email,password,mobile_number,otp_guid,otp,referral_user:null,ip_address,device_info}}}` | Same as #4 | Verify (new user). Name/email typed by the user; password generated; IP from #33. |
| 6 | `POST /refreshtoken?device=App` (app token) | `{data:{type:"auth",attributes:{refresh_token}}}` | `data.attributes.access_token` only (a rotated refresh token is ignored) | `AuthContext.refreshSession` on any user-token 401/403. |
| 7 | `POST /users/logout?device=App` (user) | `{data:{type:"user",attributes:{fcm_id:"",device_unique_id}}}` | Ignored; errors swallowed | Profile → Logout. |

There is **no delete-account API**: the Delete Account OTP screen is a demo that accepts any 4-digit code.

## CashKaro: profile and earnings

| # | Call | Response read | Hook / screens |
|---|---|---|---|
| 8 | `GET /users/profile?device=App` | `data` (array of one row or object): `id`, `attributes.fullname`, `email`, `mobile_number` | `useProfile` (key `['ck','profile',token]`). Profile, Account settings, Delete account (masked mobile), click-outs (user id), Never Miss Cashback sync, analytics `user_id`. Prefetched at sign-in. |
| 9 | `GET /users/earnings?device=App` | `data[0].attributes`: `confirmed_cashback`, `pending_cashback`, `paid_cashback`, `total_cashback_earned`/`total_cashback`, `total_rewards_earned`/`total_rewards`, `total_earned`. Derived: withdrawable = confirmed + rewards | `useEarnings`. Earnings tab, Withdraw method amounts, withdraw gate. Prefetched at sign-in. |

## CashKaro: orders

| # | Call | Request | Response read | Screens |
|---|---|---|---|---|
| 10 | `GET /users/orders` (user) | `device=App`, `page[size]=20`; optional `filter[status]` (pending,confirmed,paid,requested,cancelled), `filter[cashbacktype]` (cashback,rewards), `filter[fromdate]`/`filter[todate]` (yyyy-MM-dd). Store filter is client-side. | `data[]` (`myorder`): `id`, `cashback_type`, `cashback_status`, `is_delayed`, `cashback_amount`, `order_id`, `referral_name`, `bonus_type`, `comments`, `merchant_image_url`; merchant name from `merchant_name`/`report_merchant_name`/`store_name` or the logo filename | Orders list (filters), Never-miss nudge on Home. First 20 only. |
| 11 | `GET /users/orders/{id}?device=App` | | `cashback_type`, `cashback_status`, `is_delayed`, `cashback_amount`, `order_amount`, `order_id`, `merchant_image_url`, dates (`transaction_date`, `pending_date`, `confirm_date`, `paid_date`, `cancelled_date`, `expected_confirmation_date`) | Order detail (status badge, "expected by", timeline); also from a tracked claim. |

## CashKaro: offers (app token, JSON:API)

| # | Call | Response read | Notes |
|---|---|---|---|
| 12 | `GET /offers/category/miniapp?device=App&page[size]=1&include=categories` | `included[].categories.relationships.sub_categories.data[]` → `unique_identifier`, `name`. Strip = "All" + `miniapp/<slug>` | Any 400 → #13 (production: 400 code 10003). |
| 13 | `GET /offers/categories?device=App` | `data[].attributes.unique_identifier`, `name`, `parent_id` (top level only); internal buckets excluded | Fallback strip with short labels/icons. |
| 14 | `GET /offers/category/{path}?device=App&page[size]=100` | `data[].attributes`: `unique_identifier`/`id`, `name`, `image_url` (asset host normalised), `cashback.{payment_type,amount}`, `secondary_cashback_count` → "Flat/Upto X% / ₹X", `coupons_count` | Offers grid per tab; search fans out over all categories. One page (100). 0 stores on production today. |
| 15 | `GET /offers/category/home-categories-exclusive?device=App&page[size]=100&page[number]=N` | `data[].id`, `attributes.name`, `cashback.{amount,payment_type}` → card reward index by store id and name | Called from `useCards`; errors → `[]`. Empty on production, so BK `commission` is shown. |
| 16 | `GET /offers/{slug}?device=App&include=coupons,secondary_cashback,related_offers` | `name`, `unique_identifier`, `image_url`, `banner_image_url`, `store_banners.mobile.data[]`, `cashback{payment_type,amount,details,strike_out_value}`, `cashback_type`, `tracking_speed`, `expected_confirmation_days`, `app_tracking_enabled_android/ios`, descriptions, terms, benefit cards, steps to shop, `cashback_url`, rating, `faq[]`, `included[].secondary_cashback[]` (rate rows) | Store page; Never Miss Cashback sync (amazon, flipkart, ajio). Coupons and related offers are requested but not shown. 400 code 10001 on production. |

Not an API call: `cardTrackingUrl(ck_store_id)` builds `https://<trackingHost>/visitretailer/app/<id>?id=`; empty on prod, so cards use BK `network_url`. Click-out building and logging: `src/lib/clickOut.ts`, `src/lib/useClickOut.tsx`.

## CashKaro: withdraw (user token)

| # | Call | Request | Response read | Notes |
|---|---|---|---|---|
| 17 | `GET /payment/payment?device=App&paymentautomation=true&include=charities` | | `data.attributes.payment_threshold` (default 250), payment method ids by name (amazon/flipkart/upi/bank; defaults 12/13/20/18). 400 with code `5002` → "payout already in progress" (`errors[].meta.requested_earnings`) | `usePaymentInfo` (30 s stale). Withdraw gate; method screens. |
| 18 | `POST /users/sendotp?device=App` | `{data:{type:"user_otp",attributes:{notification_name:"PAYMENT_REQUEST_OTP"}}}` | `otp_guid` (from `data.attribute` or `data.attributes`, fallback `data.id`), `sent_to_mobile` (masked) | "Get Paid" on UPI/Amazon/Flipkart; Resend. No refresh-on-401. |
| 19 | `POST /users/verify` (no `device`) | `{data:{type:"user_otp",attributes:{otp_guid,otp:"digits"}}}` | `verifyHasError`: `res.error` or `res.data.errors` → "Enter a valid OTP" | Auto-submits at 6 digits. Status 0 → "Connection problem". |
| 20 | `POST /payment/paymentV1?device=App` | UPI: `type:"upi"`, `{otp_guid,payment_type,payment_method_id,upi_id}`. Amazon: `type:"amazongiftcard"`, `{payment_type,payment_method_id,mobile,otp_guid,amazon_payment_type:"AmazonMobile"}`. Flipkart: `type:"flipkartgiftcard"`, `{otp_guid,payment_type,payment_method_id,email}`. `payment_type` ∈ cashback / rewards / cashback_and_rewards. No amount (server derives it). | Ignored; success → Withdraw success | Status 0 → that `otp_guid` is blocked from resubmitting ("Couldn't confirm your withdrawal"). Below-₹250 (code 5003) is prevented by the client-side threshold. |

Defined but unused: `submitBankPayment` (`type:"imps"`); Bank Transfer shows "Coming soon".

## CashKaro: missing cashback (user token)

| # | Call | Request | Response read | Screens |
|---|---|---|---|---|
| 21 | `GET /users/missingcashback/retailers?device=App&page[number]=1&page[size]=100` | | `data[].attributes`: `store_id`/`id`, `store_name`/`report_merchant_name`, `store_logo`/`image_url`, `group` (A/B1/B2/C1/C2/D), `tracking_speed` | "Did you shop?" → store list. Always refetched. |
| 22 | `GET /users/missingcashback/exitclickdates/{storeId}` | | `data[].attributes.exitclick_date`/`exit_date`, `exit_id`; `meta.sample_orderid`, `orderid_hint_message`, `orderid_format` (regex map for client validation) | Choose date; Order ID hint and validation. |
| 23 | `GET /users/missingcashback/queue?filter[status]=Pending\|Resolved\|Rejected&page[number]=1&page[size]=50` | | `data[]` claims (`cashback_id`, `status`, `groupid`, `details`, `under_tracking`, `expected_resolution_date`, `status_update`, `click_date`, `order_id`, `order_amount`, store name/image, cashback value, `ticket_id`, `ticket_status`); `meta.{pending,resolved,others}` | Claims tabs (In Review / Closed / Others). "not found / no data / empty" → empty list. |
| 24 | `POST /users/missingcashback/validate` | `{data:{type:"missingcashback",attributes:{storeid,exitclick_date,order_id}}}` | Success or error message | Order ID → Continue. |
| 25 | `POST /users/missingcashback/queue` | Same + `order_amount` ("0" for group D) | `data.id` → queue id; `meta.{cashback_id,cashbackvalue,status,under_tracking}` → outcome: tracked / resolved / auto-tracking / needs details (B1 new-user, C1 category, C2 invoice) / queued | Amount → Submit (or Order ID for group D). |
| 26 | `PUT /users/missingcashback/queue/{queueId}` | `{data:{type:"queue",attributes:{user_type?:"New"\|"Existing",category?:"Mobile Recharge"\|"No Cashback"}}}` | Same as #25 | New-user check (B1), category select (C1). |
| 27 | `POST /users/tickets/{yyyy-MM-dd}/{storeId}/{exitId}` | Multipart: `transaction_id`, `transaction_details`, `total_amount_paid`, `missing_txn_queue_id`, `type` ("Other Category" or "Missing Cashback"), `sub_type`, files `ticket_attachment`, `ticket_attachment1`… | `data.id` or `data.attributes.ticket_id` | Invoice upload → ticket success. |

## BankKaro

| # | Call | Request | Response read | Used by |
|---|---|---|---|---|
| 28 | `POST /token` | Header `partner-token: EXPO_PUBLIC_BK_PARTNER_KEY`; body `{"x-api-key": <same key>}` | `data.jwttoken` | Every BK call. |
| 29 | `GET /cardgenius/init-bundle` | | `data.bank_data[].{id,name,logo}` (bank directory) | `useCards`; errors → built-in bank names. Other filter metadata unused (Home filters are static). |
| 30 | `GET /cardgenius/cards` | | `data[]` (only `status === true`): `id`, `name`, `image`, `card_alias`, `network_url`, `ck_store_id`, `bank_id`, `card_type`, `commission`/`bk_commission`, fee text + waiver/comment, eligibility fields, `invite_only`, `tags[]`, `product_usps[]` | `useCards` (key `['bk','cards']`): Home list, filters, card detail, store page "best cards". |
| 31 | `GET /cardgenius/cards/{alias}` | | `product_benefits[].{benefit_type,html_text}` → benefit tabs, "What We Love" | Card detail, All benefits. Neighbours prefetched. |
| 32 | `POST /cardgenius/eligiblity` (spelling as in the API) | `{pincode, inhandIncome:"<monthly>", empStatus:"salaried"\|"self_employed"}` | `data[].{eligible, card_alias}` | Eligibility checker (Home toggle), checker inside card detail. Errors → fallback verdict. |

Defined but unused: `GET /cardgenius/popular-cards`, `POST /cardgenius/cards` (server-side filter/sort), `POST /cardgenius/calculate` (spend-based rewards; see the Home ideas in `production-readiness.md`).

## External

| # | Call | Used for |
|---|---|---|
| 33 | `GET https://api.ipify.org?format=json` | `ip_address` for `/signupV1`; 5 s timeout, cached, falls back to `0.0.0.0`. |

## Known inconsistencies and risks

1. `?device=App` is sent inconsistently (missing on `/signupotp`, `/users/verify` and most missing-cashback calls).
2. `/refreshtoken` ignores a rotated refresh token; the app token has no 401 retry.
3. Withdraw calls (#18–20) don't refresh-and-retry on 401.
4. The Offers fallback triggers on any 400, not specifically code 10003.
5. Single-page fetches: category stores (100), orders (20), claims (50).
6. `include=coupons,related_offers` and `include=charities` are requested but unused.
7. `fcm_id` is `""` on logout but the device id on login.
8. Comments in `payments.ts` are stale (no client format gate; "integer" OTP).
9. All keys ship in the app bundle (`EXPO_PUBLIC_*`).
