# API reference

> **Last updated 2026-11-23:** Rewritten for the BFF (decision 2026-11-17). The app calls only the cards.xtra BFF. The BFF holds the partner keys and mints the partner tokens. Checked against the code at `e4d37a1`.

Every backend call the app makes, with the request it sends, the response fields it reads, how errors are handled, and which screens use it. The BFF allows 30 routes: 25 to CashKaro (CK) and 5 to BankKaro (BK) (`bff/src/routes.js`). Any other path gets a 404. The BFF itself also calls CK `GET /token` and BK `POST /token`; the app never does. Row numbers are kept from the earlier version of this page. For tokens and secrets see `auth-and-secrets.md`; for the BFF see `bff/README.md`.

No secret values appear here; keys are referred to by their env names.

## Shared behaviour

**The app talks to one host** (`src/config/env.ts`)
- `EXPO_PUBLIC_API_BASE_URL` is the BFF. CK calls go to `<BFF>/ck/<path>`, BK calls to `<BFF>/bk/<path>`.
- No partner key, Basic auth or partner token is in the app. `EXPO_PUBLIC_STAGE` selects only `x-chkr-app-version` (staging 4.6, prod 4.9) and the click-out tracking host.
- If the BFF URL is empty, every call fails at once with "This build is missing an API address" (error kind `config`).

**HTTP client** (`src/api/http/client.ts`)
- Joins base + path, drops undefined query values, encodes the rest. Body: strings as-is, `FormData` untouched (multipart), everything else JSON.
- Adds `x-request-id` (UUID) to every call.
- Timeout 15 s by default. Payout 65 s (above the BFF wait of 55 s), payout re-check reads 10 s with no retry, calculate 45 s, invoice upload 60 s.
- Retries transient failures (network error, timeout, 429, 5xx) up to 2 times, with exponential backoff and jitter, and honours `Retry-After`. Only GET/HEAD, or a write marked `idempotent` (eligibility, calculate). Payouts, OTP sends, claim submit and ticket upload are never retried.
- Every failure becomes `ApiError { message, status, payload, kind }`; `kind` is `network`, `timeout`, `aborted`, `http` or `config`. Message comes from `errors[0].detail|title|message`, then `meta.message`, `message`, `error` (`src/api/http/errors.ts`).
- A 200 response that carries an error in its body is not treated as an error, except `/users/verify` (checked with `verifyHasError`).
- Response contracts: many calls pass a zod schema (`src/api/schemas`). A mismatch is reported (`checkContract`), never thrown.

**React Query** (`src/query/queryClient.ts`): staleTime 5 min, gcTime 30 min, refetch on app focus; screen hooks also refetch when the screen regains focus (`useRefetchOnFocus`). Queries do not retry an `ApiError`, because the HTTP client already retried; other errors retry once. Mutations don't retry.

**CashKaro** (`ck()` in `src/api/cashkaro.ts`)
- The BFF forwards to `CK_BASE_URL` (default `https://ckminapps.com/v1`).
- The app sends `Accept: application/vnd.api+json` and `x-chkr-app-version`; JSON bodies add `Content-Type: application/vnd.api+json`. The BFF adds `x-api-key` and sets `x-chkr-app-version` from its own config.
- Two auth modes:
  - **Guest** (`auth: 'aws'`): the app sends no `Authorization`. The BFF adds its cached site token (`GET /token`). On a 401 whose body is about the token, the BFF re-mints once and retries.
  - **User**: the app sends `Authorization: Bearer <access_token>`; the BFF forwards it unchanged. Before the call the app refreshes the token if its JWT `exp` is less than 2 min away. On 401 the app calls `POST /refreshtoken` once (single-flight) and retries once (`withUserToken`, `src/api/http/tokenManager.ts`). If the refresh returns 401 or code 2004, the user is signed out. A 403 does not sign out.
- Most calls send `?device=App` (exceptions noted).

**BankKaro** (`bk()` in `src/api/bankkaro.ts`)
- The BFF forwards to `BK_BASE_URL` and adds `partner-token: <JWT>`. The app sends only `Content-Type: application/json` on bodies.
- The BFF mints the JWT once, caches it until `exp` minus 2 min, and on 401/403 re-mints and retries once.

---

## CashKaro: auth

| # | Call | Request | Response read | Used by / notes |
|---|---|---|---|---|
| 1 | `GET /token` | **Called by the BFF only**, never by the app. `x-api-key: CK_API_KEY`, optional Basic auth (`CK_BASIC_USER:CK_BASIC_PASS`); no `device` | `data.attributes.token` → site token | BFF caches it (JWT `exp` − 2 min, fallback 25 min) and adds it to every guest call. Not on the BFF allowlist. |
| 2 | `POST /loginotp?device=App` (guest) | `{data:{type:"user_otp",attributes:{mobile_number:<number>}}}` | `data.id` → `otp_guid`; `data.attributes.otp_expire_sec` (not shown) | Onboarding login sheet: Get OTP, Resend. "not regist…" error → signup. BFF rate limit: 30 per IP and 5 per mobile number in 10 min (429). |
| 3 | `POST /signupotp?device=App` (guest) | Same as #2 | Same as #2 | Fallback for new numbers; Resend in signup mode. |
| 4 | `POST /login?device=App` (guest) | `{data:{type:"auth",attributes:{mobile_number,otp_guid,otp:"digits",device_info}}}` | `data.attributes.access_token`, `refresh_token`; `data.id` → `ck_user_id` (the click-out `id=`, read before `/users/profile`); `segment_id[]`, `new_user_segment_expiry_time_sec`, `user_joined_at` → secure store, sent as `filter[segmentid]` (#12, #14 to #16) | Verify (existing user). `otp` is sent as a digit string (keeps a leading zero). `device_info` fields: see `auth-and-secrets.md`. `signIn` stores the id and segment; every session end clears them. |
| 5 | `POST /signupV1?device=App` (guest) | `{data:{type:"auth",attributes:{fullname,email,password,mobile_number,otp_guid,otp,referral_user:null,device_info}}}` | Same as #4 | Verify (new user). Name typed by the user; email and password generated (D16). The BFF sets `ip_address` from `x-forwarded-for` and, when `SIGNUP_PASSWORD` is set, replaces the password. |
| 6 | `POST /refreshtoken?device=App` (guest) | `{data:{type:"auth",attributes:{refresh_token}}}` | `data.attributes.access_token`; `refresh_token` too when CashKaro rotates it (kept); `data.id` and the segment fields of #4 when present (stored; a field the response leaves out keeps its stored value) | `refreshUserToken` in `tokenManager.ts`: before a user call when the JWT is about to expire, and on a user-call 401. Single-flight. The launch check and the token manager both refresh through `refreshKeepingIdentity` (`AuthContext.tsx`); nothing is stored after the session ended. |
| 7 | `POST /users/logout?device=App` (user) | `{data:{type:"user",attributes:{fcm_id,device_unique_id}}}`, both the per-install device id (CK rejects an empty `fcm_id`) | Ignored; errors swallowed | Profile → Logout. |

There is **no delete-account API**. The Delete Account screen is hidden (D23).

## CashKaro: profile and earnings

| # | Call | Response read | Hook / screens |
|---|---|---|---|
| 8 | `GET /users/profile?device=App` | `data` (array of one row or object): `id`, `attributes.fullname`, `email`, `mobile_number` | `useProfile` (key `['ck','profile',token]`). Profile, Account settings, Delete account (masked mobile), click-outs (user id fallback only: the login `data.id` stored as `ck_user_id` comes first), Never Miss Cashback sync, analytics `user_id`. Prefetched at sign-in. |
| 9 | `GET /users/earnings?device=App` | `data[0].attributes`: `confirmed_cashback`, `pending_cashback`, `paid_cashback`, `total_cashback_earned`/`total_cashback`, `total_rewards_earned`/`total_rewards`, `total_earned`. Derived: withdrawable = confirmed + rewards | `useEarnings`. Earnings tab, Withdraw method amounts, withdraw gate. Prefetched at sign-in. |

## CashKaro: orders

| # | Call | Request | Response read | Screens |
|---|---|---|---|---|
| 10 | `GET /users/orders` (user) | `device=App`, `page[size]=20`; optional `filter[status]` (pending,confirmed,paid,requested,cancelled), `filter[cashbacktype]` (cashback,rewards), `filter[fromdate]`/`filter[todate]` (yyyy-MM-dd). Store filter is client-side. | `data[]` (`myorder`): `id`, `cashback_type`, `cashback_status`, `cashback_amount`, `order_id`, `referral_name`, `bonus_type`, `comments`, `merchant_image_url`, `groupid`. No date, store name or `is_delayed` on the list (detail only), so no delayed badge, no month grouping, and the Store filter keys on the logo URL | Orders list (filters), Never-miss nudge on Home. Pages of 20, loaded on scroll until `meta.total_records` (`useOrders`, infinite query). |
| 11 | `GET /users/orders/{id}?device=App` | | `cashback_type`, `cashback_status`, `is_delayed`, `cashback_amount`, `order_amount`, `order_id`, `merchant_image_url`, dates (`transaction_date`, `pending_date`, `confirm_date`, `paid_date`, `cancelled_date`, `expected_confirmation_date`) | Order detail (status badge, "expected by", timeline); also from a tracked claim. |

## CashKaro: offers (app token, JSON:API)

| # | Call | Response read | Notes |
|---|---|---|---|
| 12 | `GET /offers/category/miniapp?device=App&page[size]=1&include=categories` | `included[].categories.relationships.sub_categories.data[]` → `unique_identifier`, `name`. Strip = "All" + `miniapp/<slug>` | Any 400 → #13 (production: 400 code 10003). |
| 13 | `GET /offers/categories?device=App` | `data[].attributes.unique_identifier`, `name`, `parent_id` (top level only); internal buckets excluded | Fallback strip with short labels/icons. |
| 14 | `GET /offers/category/{path}?device=App&page[size]=100` | `data[].attributes`: `unique_identifier`/`id`, `name`, `image_url` (asset host normalised), `cashback.{payment_type,amount}`, `secondary_cashback_count` → "Flat/Upto X% / ₹X", `coupons_count` | Offers grid per tab; search fans out over all categories. One page (100). 0 stores on production today. |
| 15 | `GET /offers/category/home-categories-exclusive?device=App&page[size]=100&page[number]=N` | `data[].id`, `attributes.name`, `cashback.{amount,payment_type}` → card reward index by store id and name | Called from `useCards`; errors → `[]`. Empty on production, so BK `commission` is shown. |
| 16 | `GET /offers/{slug}?device=App&include=coupons,secondary_cashback,related_offers` | `name`, `unique_identifier`, `image_url`, `banner_image_url`, `store_banners.mobile.data[]`, `cashback{payment_type,amount,details,strike_out_value}`, `upsell{cashback_upsell_button_text,cashback_expiry_date,...}` (only while an upsell calendar is active; drives the bonus card and its timer), `cashback_type`, `tracking_speed`, `expected_confirmation_days`, `app_tracking_enabled_android/ios`, descriptions, terms, benefit cards, steps to shop, `cashback_url`, rating, `faq[]`, `included[].secondary_cashback[]` (rate rows) | Store page; Never Miss Cashback sync (amazon, flipkart, ajio). Coupons and related offers are requested but not shown. 400 code 10001 on production. |

`filter[segmentid]` on #12, #14, #15 and #16 (not #13): sent only for a signed-in user with a known segment; a guest sends none. Value: the stored `segment_id[]` joined with commas (`openapi-mini.json` example `1629794856,1629794721`). The new-user segment `888888888` is dropped once `user_joined_at` + `new_user_segment_expiry_time_sec` has passed; if either field is missing, the ids go as stored. Source: `segmentFilterValue` in `src/api/cashkaro.ts`.

Not an API call: `cardTrackingUrl(ck_store_id)` builds `https://<trackingHost>/visitretailer/app/<id>?id=`; empty on prod, so cards use BK `network_url`. Click-out building and logging: `src/lib/clickOut.ts`, `src/lib/useClickOut.tsx`.

## CashKaro: withdraw (user token)

| # | Call | Request | Response read | Notes |
|---|---|---|---|---|
| 17 | `GET /payment/payment?device=App&paymentautomation=true&include=charities` | | `data.attributes.payment_threshold` (default 250), payment method ids by name (amazon/flipkart/upi/bank; defaults 12/13/20/18). 400 with code `5002` has 3 meanings (`classifyPayment5002`): `meta.requested_earnings` → payout pending ("Payment Is Processing" with the amount, or "A withdrawal is already in process" when there is no amount above ₹0); `meta.type:"security"` + "30 minutes" text → one request per 30 minutes; `meta.type:"security"` + "recently updated" text → payouts disabled after an email or mobile change. The two security states show the server `detail`. An unknown 5002 is an error. | `usePaymentInfo` (30 s stale). Withdraw gate; method screens. |
| 18 | `POST /users/sendotp?device=App` | `{data:{type:"user_otp",attributes:{notification_name:"PAYMENT_REQUEST_OTP"}}}` | `otp_guid` (from `data.attribute` or `data.attributes`, fallback `data.id`), `sent_to_mobile` (masked) | "Get Paid" on UPI/Amazon/Flipkart; Resend. Never retried. BFF OTP rate limit applies. |
| 19 | `POST /users/verify` (no `device`) | `{data:{type:"user_otp",attributes:{otp_guid,otp:"digits"}}}` | `verifyHasError`: `res.error` or `res.data.errors` → "Enter a valid OTP" | Auto-submits at 6 digits. Status 0 → "Connection problem". |
| 20 | `POST /payment/paymentV1?device=App` | UPI: `type:"upi"`, `{otp_guid,payment_type,payment_method_id,upi_id}`. Amazon: `type:"amazongiftcard"`, `{payment_type,payment_method_id,mobile,otp_guid,amazon_payment_type:"AmazonMobile"}`. Flipkart: `type:"flipkartgiftcard"`, `{otp_guid,payment_type,payment_method_id,email}`. `payment_type` ∈ cashback / rewards / cashback_and_rewards. No amount (server derives it). | Ignored; success → Withdraw success | 65 s timeout, never retried. Only a 4xx (not 429) is a rejection; any other failure re-checks row 17 up to 3 times, then "Couldn't confirm" and a 10-minute cool-down on new payouts (secure store, per user) ("Couldn't confirm your withdrawal"). Unknown-outcome re-check (row 17): 5002 pending → submitted, cool-down cleared; 5002 30-minute rule → submitted, cool-down kept; 5002 contact change or unknown → not landed. Below-₹250 (code 5003) is prevented by the client-side threshold. |

Bank Transfer shows "Coming soon"; there is no bank payout call.

All withdraw calls use the user token with refresh-and-retry on 401, like the other user calls.

## CashKaro: missing cashback (user token)

| # | Call | Request | Response read | Screens |
|---|---|---|---|---|
| 21 | `GET /users/missingcashback/retailers?device=App&page[number]=1&page[size]=100` | | `data[].attributes`: `store_id`/`id`, `store_name`/`report_merchant_name`, `store_logo`/`image_url`, `group` (A/B1/B2/C1/C2/D), `tracking_speed` | "Did you shop?" → store list. Always refetched. |
| 22 | `GET /users/missingcashback/exitclickdates/{storeId}` | | `data[].attributes.exitclick_date`/`exit_date`, `exit_id`; `meta.sample_orderid`, `orderid_hint_message`, `orderid_format` (regex map for client validation) | Choose date; Order ID hint and validation. |
| 23 | `GET /users/missingcashback/queue?filter[status]=Pending\|Resolved&page[number]=1&page[size]=50` | | `data[]` claims (`cashback_id`, `status`, `groupid`, `details`, `under_tracking`, `expected_resolution_date`, `status_update`, `click_date`, `order_id`, `order_amount`, store name/image, cashback value, `ticket_id`, `ticket_status`); `meta.{pending,resolved,others}` | Claims tabs (In Review / Closed / Others). "not found / no data / empty" → empty list. Pages of 50 followed via `links.next` / `meta.total_records`, at most 10 pages. |
| 24 | `POST /users/missingcashback/validate` | `{data:{type:"missingcashback",attributes:{storeid,exitclick_date,order_id}}}` | Success or error message | Order ID → Continue. |
| 25 | `POST /users/missingcashback/queue` | Same + `order_amount` ("0" for group D) | `data.id` → queue id; `meta.{cashback_id,cashbackvalue,status,under_tracking}` → outcome: tracked / resolved / auto-tracking / needs details (B1 new-user, C1 category, C2 invoice) / queued | Amount → Submit (or Order ID for group D). |
| 26 | `PUT /users/missingcashback/queue/{queueId}` | `{data:{type:"queue",attributes:{user_type?:"New"\|"Existing",category?:"Mobile Recharge"\|"No Cashback"}}}` | Same as #25 | New-user check (B1), category select (C1). |
| 27 | `POST /users/tickets/{yyyy-MM-dd}/{storeId}/{exitId}` | Multipart: `transaction_id`, `transaction_details`, `total_amount_paid`, `missing_txn_queue_id`, `type` ("Other Category" or "Missing Cashback"), `sub_type`, files `ticket_attachment`, `ticket_attachment1`… (max 3, 2 MB each, jpeg/png/jpg/gif/pdf; checked at pick time). 422 body is a field map `{"ticket_attachment":["…"]}`, shown as its messages | `data.id` or `data.attributes.ticket_id` | Invoice upload → ticket success. 60 s timeout, never retried. The BFF rejects bodies over 4.4 MB (413) and gives a user call 55 s. |

The BFF also allows `GET /users/missingcashback/queue/{id}`, but the app does not call it: `getQueueItem` searches the Pending and Resolved lists instead, paging up to 10 pages each.

## BankKaro

| # | Call | Request | Response read | Used by |
|---|---|---|---|---|
| 28 | `POST /token` | **Called by the BFF only.** Body `{"x-api-key": BK_PARTNER_KEY}` | `data.jwttoken` | BFF caches it (`exp` − 2 min, fallback 50 min) and sends it as `partner-token` on every BK call. Not on the BFF allowlist. |
| 29 | `GET /cardgenius/init-bundle` | | `data.bank_data[].{id,name,logo}` (bank directory) | `useCards`; errors → built-in bank names. Other filter metadata unused (Home filters are static). |
| 30 | `GET /cardgenius/cards` | | `data[]` (only `status === true`): `id`, `name`, `image`, `card_alias`, `network_url`, `ck_store_id`, `bank_id`, `card_type`, `commission`/`bk_commission`, fee text + waiver/comment, eligibility fields, `invite_only`, `tags[]`, `product_usps[]` | `useCards` (key `['bk','cards']`): Home list, filters, card detail, store page "best cards". |
| 31 | `GET /cardgenius/cards/{alias}` | | `product_benefits[].{benefit_type,html_text}` → benefit tabs, "What We Love" | Card detail, All benefits. Neighbours prefetched. |
| 32 | `POST /cardgenius/eligiblity` (spelling as in the API) | `{pincode, inhandIncome:"<monthly>", empStatus:"salaried"\|"self_employed"}` | `data[].{eligible, card_alias}` | Eligibility checker (Home toggle), checker inside card detail. Errors → fallback verdict. |
| 32a | `POST /cardgenius/calculate` | JSON body with 21 spend keys, all required, 0 = no spend (type `CalculateSpends`, `src/api/types.ts`). Rupee keys are sent as whole rupees. The keys `insurance_health_annual`, `insurance_car_or_bike_annual`, `life_insurance`, `flights_annual` and `hotels_annual` take a yearly input. The two lounge keys are asked per year and sent per quarter. Asked and built by `SPEND_QUESTIONS`, `toApiValue`, `buildSpends` in `src/lib/cardTools.ts`. | `data.savings[]`, one row per card: `seo_card_alias`, savings, fees, fee-waiver spend, lounge value, `spending_breakdown`. Mapped by `mapCalculateResponse` in `src/lib/cardTools.ts`; checked by `src/api/schemas/calculate.ts`. The app does not read `roi`. | Card tools (`useCardSavings`, key `['bk','calculate',<spend profile>]`, 10 min stale). One call per spend profile, 45 s timeout, one retry (`calculateSavings`). Rows join to the app's cards by alias, then id; a row with no app card stays in the league table with no Apply and no card page. The partner API rejects brand names, so brands are counted by category, except Amazon and Flipkart. Offline: the query pauses and the screen shows retry. The BFF allows this route and gives it a longer timeout (`bff/src/routes.js`, `bff/src/proxy.js`); deployed on the production BFF since 2026-11-18. |

`GET /cardgenius/popular-cards` and `POST /cardgenius/cards` are not used and not on the BFF allowlist.

## External

None. Row 33 (`api.ipify.org` for the signup IP) was removed: the BFF sets `ip_address` from the request.

## Known inconsistencies and risks

1. `?device=App` is sent inconsistently (missing on `/users/verify` and most missing-cashback calls).
2. The Offers fallback triggers on any 400, not specifically code 10003.
3. Single-page fetches: category stores (100) and claims (50). Orders page on scroll.
4. `include=coupons,related_offers` and `include=charities` are requested but unused.
5. The comment on `verifyPaymentRequestOTP` says "integer"; the OTP is sent as a digit string.
6. The BFF OTP rate limit is kept in memory per running copy. Move it to a shared store before launch.
7. The production click-out host (`EXPO_PUBLIC_CK_TRACKING_HOST`) is empty, so card Apply uses BankKaro `network_url`.
8. Invoice upload: the app waits 60 s, the BFF gives a user call 55 s.
