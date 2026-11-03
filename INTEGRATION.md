# Backend Integration Tracker

Running log of stitching the frontend to the two backends (CashKaro = auth/user,
BankKaro/CardGenius = card catalog). Update this as each screen is wired.

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⚠️ gap to resolve

| Area | Backend | Status | Notes |
|---|---|---|---|
| Login / OTP | CashKaro | ✅ | Live via OnboardingScreen sheet (see below) |
| Home — card list | BankKaro | ✅ | Wired via `useCards` → `mapBkCardToCardModel` |
| Home — category carousel | BankKaro | ✅* | Curated tiles + tap filters Home; *popular-cards NOT used (no images, tag_id=0 specials) |
| Home — filters | (client-side) | ✅ | All 4 rails filter the loaded list; no API (see §3) |
| Home — eligibility toggle | BankKaro | ✅ | Real `eligiblity` call; **filters Home list** by card_alias (§4) |
| Card detail sheet | BankKaro | ✅ | Header + GST fees + eligibility + recommended; embedded checker prefills (§4) |
| Offers grid + brand page | CashKaro | ✅ | Category stores + slug-driven brand page (§6) |
| Earnings | CashKaro | ✅ | `useEarnings` → `/users/earnings`; real fields confirmed (§9) |
| Profile | CashKaro | ✅ | Real name/email/mobile via `useProfile`; logout → login (§10) |
| Orders list + detail | CashKaro | ✅ | `useOrders`/`useOrderDetail` → `/users/orders[/:id]`; live shape probed (§13) |
| Missing Cashback (full flow) | CashKaro | ✅ | Live claim flow w/ group branching (A/B1/B2/C1/C2/D) + claims list (§14) |

---

## 1. Login / OTP — ✅ DONE

- **Live entry point is the OnboardingScreen bottom-sheet**, NOT LoginScreen/OtpScreen
  (those are dead code). See `src/screens/OnboardingScreen.tsx`.
- Get OTP → `loginOtp(phone)`; Verify → `login({...})` → `signIn(session)` → MainTabs;
  Resend → `loginOtp` again.
- OTP length = **6 digits**.
- Fix applied: `device_info` in `src/api/cashkaro.ts` must have **every field non-empty**
  (backend rejects empty strings with "the device info must be a valid data").
- Caveat: `fcm_id` is a placeholder (device id) — push won't route until real FCM wiring.

---

## 2. Home page — field reconciliation (frontend vs BankKaro)

Frontend renders `CardTile` from `CardModel` (`src/data/cards.ts`, currently hardcoded
`SAMPLE_CARDS`). Source of truth on the backend: `GET /partner/cardgenius/cards`
→ `data[]` (184 cards total, **159 with `status: true`** — filter on that).

| Frontend field (CardModel) | On Home tile? | BankKaro field | Match | Action needed |
|---|---|---|---|---|
| `id` | key | `id` (number) | ✅ | FE ids are strings → coerce `String(id)` |
| `name` | yes | `name` | ✅ | direct |
| `cardImage` | yes | `image` (https URL) | ✅ | FE uses local `require()`; switch CardTile to `{ uri }` source |
| `cashbackValue` ("₹2,500") | yes (badge) | — none — | ⚠️ | **No cashback-amount field.** Candidates: `annual_saving` ("20233"), `bk_commission`. Needs a product decision + a formatter |
| `feeType` (`with-fees`/`lifetime-free`/`discontinued`) | yes | — derived — | ⚠️ | Derive: `joining_fee_text` & `annual_fee_text` are `"0"` → `lifetime-free`; `status: false` → treat as `discontinued`; else `with-fees` |
| `tags` (string[]) | yes | `tags[].name` | ✅ | API returns objects → map to `.name`; tile shows ~3 |
| `tileBenefits` (`[{icon,text}]`) | yes | `product_usps[]` (`{header, description}`) | 🟡 | text = `header + description`; **icon is NOT in API** → map `usp.tag_id` → local feat-icon, with a default. Also many cards return `product_usps: []` (sparse) |
| `joiningFee` ("₹2,500") | yes (fee strip) | `joining_fee_text` ("3500") | 🟡 | raw number, no ₹/commas; `"0"` → "Free"; needs formatter |
| `annualFee` | yes | `annual_fee_text` | 🟡 | same as joiningFee |
| `inviteOnly` | yes | `invite_only` (bool) | ✅ | direct |

Fields FE has that are **detail-only** (not on the Home tile): `shortName`, `placeholderColor`,
`cashback`, `benefits` (emoji) — legacy, ignore for Home.

### Decisions made (Home card list — ✅ wired 2026-06-03)
1. **Cashback badge** — RESOLVED: use `commission` (e.g. SBI Cashback = 1400), rendered
   as **"Flat ₹<commission> Rewards"**. "Flat"/"Rewards" are constant (hardcoded in the
   organism `CardTile`'s `CashbackBadge`), only the value varies. Mapper: `commissionValue()`.
2. **Benefit icons** — DONE: `product_usps[].tag_id` → local feat-icon via `USP_TAG_ICON`,
   default `feat-rewards-outline`. Cards with empty `product_usps` show no benefit rows.
3. **feeType** — DONE: derived in `deriveFeeType()` (both fees 0 → lifetime-free,
   status false → discontinued, else with-fees).

**Implementation:** `src/api/cardMapper.ts` (transform), `src/query/useCards.ts` (fetch +
filter `status:true` + map), `src/screens/HomeScreen.tsx` (consumes `useCards`; skeleton
while loading, inline Retry on error). Organism `CardTile` badge copy changed Upto→Flat,
Cashback→Rewards (affects all card tiles, incl. carousels — intended).

**Superseded by §3:** the card detail body, category carousel, and filters were since
wired — see §3 below. (MaybeSheet's suggested cards are still hardcoded in HomeScreen.)

### Category carousel — `GET /partner/cardgenius/popular-cards`
`data[]` = categories: `{ id, name, tag_id, products[] }`.
Each product: `{ id, name, image, seo_card_alias, priority, product_usps, tags, bk_popular_category_cards }`.
Maps to the "Find the best card by category" section (category = `name`, cards = `products`).

---

## Reference
- BK token: `POST /partner/token`, header `partner-token: <apiKey>`, body `{ "x-api-key": <apiKey> }` → `data.jwttoken`.
- Card schema is large (~80 fields); only the Home-relevant subset is mapped above.
- Postman collections: `docs/api/`.
---

## 3. Card detail body, filters, carousel, eligibility — ✅ wired 2026-06-03

**Card detail body** (decision: reuse the card-list data, no extra call)
- Mapper builds `CardModel.detail` from the list response: fees (`joining/annual_fee_text`
  + `annual_fee_waiver`/`joining_fee_comment` as bullets) and eligibility rows (age, income
  LPA, CRIF, new-to-credit, existing-customer) per salaried/self-employed.
- `RecommendedCards` now uses the real loaded list (passed via `recommended` prop), not SAMPLE_CARDS.
- **Still generic/static:** FAQ (API `faqs` is an empty string on most cards), "Best for
  spending on" carousel, the embedded eligibility checker inside the detail sheet (console.log only).

**Filters** (decision: all client-side — the server `/cardgenius/cards` POST is the
recommendation engine, category-only, can't filter bank/network/fee standalone)
- `CardModel.filterMeta` carries bankId/bankName/bankLogo, network (card_type), categoryIds
  (tag ids), annualFeeValue, isFree. Bank name + logo come from the live init-bundle
  `bank_data` (built into a directory by `buildBankDirectory`, fetched alongside the card list
  in `useCards`); a static `FALLBACK_BANK_NAMES` map in cardMapper is a name-only safety net for
  when init-bundle is unavailable (no logos in that case). Bank logos feed the search "Banks"
  result rows on Home.
- `src/data/filterOptions.ts` owns category/network/fee option metadata + `applyFilters`.
- Home: draft rail selections → committed `AppliedFilters` on Apply; Clear resets; bank rail
  options derived from the loaded cards. No-results state with one-tap Clear.

**Category carousel** (decision: tap filters Home)
- Tiles from curated `CATEGORY_OPTIONS` (local images + clean tag ids); tap → client-side
  category filter. `popular-cards` intentionally unused for tiles (no images; includes
  tag_id=0 "Editor's Choice"/"Rohan's Picks" that don't map to a filterable category).
  Future: use `popular-cards.products[]` for a separate "popular cards" product row.

**Eligibility** (decision: real API) — ⚠️ **superseded by §4**: the toggle now filters the
Home list instead of routing to Eligible/Maybe sheets.

### Open follow-ups
- Income unit sent to eligibility is the user's monthly figure; confirm API expects monthly.
- Detail-sheet eligibility "income" row mixes LPA (per-type) and ₹/mo (fallback) — flag for product.
- Profile still hardcoded ("Manikandan") — next.

---

## 4. Eligibility = filter, + GST fees — updated 2026-06-03

**Eligibility toggle now FILTERS the Home list** (was: routed to Eligible/Maybe sheets)
- Toggle ON → eligibility checker → `fetchEligibility` (`src/api/eligibility.ts`) → Home list
  restricted to cards the user qualifies for. Toggle OFF / Clear → filter removed.
- **Match by `card_alias`**, NOT product_id — some eligible rows return `product_id: null`.
  `CardModel.filterMeta.cardAlias` carries it; `eligibleAliases` set drives the filter.
- Verified: income 1,200 → 1 eligible (IDFC First WOW); income 1,20,000 → 147. So a low
  income correctly collapses the list (earlier bug: count>0 just popped a generic "eligible" sheet).
- `empStatus` must be **`self_employed`** (underscore); hyphen → "Validation Failed".
- Eligible/Maybe sheets remain mounted but are no longer presented from Home.

**Shared eligibility details** — entered values (pincode/income/incomeType) are kept on
HomeScreen and passed to the card-detail embedded checker as `defaultPincode/Income/IncomeType`,
so it prefills if the user already entered them; otherwise the form is blank. The embedded
checker runs the same `fetchEligibility` and applies the same Home filter.

**Fees now GST-inclusive (18%)** — detail FeeStat shows the GST-inclusive amount (e.g. base
₹999 → **₹1,179**); tapping the "i" reveals the breakdown **(₹999 + GST)**. Free/`N/A` fees
show no breakdown. Mapper: `feeStat()` in cardMapper. (Home tile fee strip still shows the
base figure — flag if it should also be GST-inclusive.)

---

## 5. Home fees-with-GST + working search — 2026-06-03

- **Home card tile fees** now show the GST-inclusive amount with a tap-to-reveal
  "(base + GST)" breakdown, matching the detail sheet. `CardFeeStrip` gained
  `joiningSub`/`annualSub` + a `FeeColumn` with an info "i"; Home tiles feed it from
  `card.detail.fee`. The "i" glyph was extracted to a shared atom `InfoCircleGlyph`
  (used by both CardFeeStrip and CardDetailSheet).
- **Search works:** the Masthead search opens SearchTopSheet; typing filters the loaded
  catalog by card name (`searchResults`/`searchSections` in HomeScreen), and tapping a
  result opens that card's detail sheet. (Was hardcoded sample sections.)

---

## 6. Offers (CashKaro) — ✅ wired 2026-06-03

**Discovered endpoints** (not in the Postman collection — found by probing; all use aws-token):
- `GET /offers/categories` → 33 categories. The real app categories are the **nested
  sub-categories under `home-categories-exclusive`** ("Home Categories", 13 subs) — the same
  set the website navigates (`/products/home-categories-exclusive/<sub>`).
- `GET /offers/category/<parent>/<sub>` → stores in a category (NESTED path; flat sub-slugs
  error). e.g. `/offers/category/home-categories-exclusive/home-kitchen-offers`. Each store:
  `{name, unique_identifier=store slug, cashback{amount,payment_type}, image_url}`.
- `GET /offers/<storeSlug>?include=coupons,secondary_cashback,related_offers` → full brand page.

**Offers grid** (`OffersScreen`) — decision: category-wise stores.
- Masthead category strip (local images) drives the grid: tapping a category maps its label →
  CK category PATH (`src/data/offerCategories.ts`, nested under `home-categories-exclusive`)
  and loads that category's stores via `useCategoryOffers`. Each tile shows the live cashback
  ("Shop & Earn upto X%") and taps through to the brand page. Loading / empty / error handled.
- The endpoint defaults to **10 results** — `getCategoryOffers` now sends `page[size]=100`
  so the full category loads (e.g. fashion = 39 stores, confirmed via `meta.total_records`).
- "New on CashKaro" → `highest-cashback-stores`. Default = highest-cashback-stores.

**Brand page** (`OffersBrandAmazon`) — decision: generic, slug-driven.
- Route now takes `{ slug }`; `useOfferStore(slug)` fetches the store. Wired floors: hero banner
  (banner_image_url), about/logo/description (HTML stripped), cashback % + details, footer CTA,
  offer/timeline titles use the real brand name. Falls back to the Amazon static content when no
  slug / while loading.
- **Still static:** Reward-rates & T&C sheets (AMAZON_* data), Similar Stores, Did You Know,
  timeline metrics. `offers/<slug>` carries terms/faq/related_offers to wire these later.
- Note: `amazon` doesn't exist on staging — demo via flipkart / myntra / nykaa / etc.

---

## 7. Brand-page real data + store-type variants — 2026-06-03

Fixed the "every store shows Amazon's content" bug — the brand page now renders each store's
real data, and detects which of the three Figma store-page layouts to show.

**Real data (mapper `mapOfferStore`):**
- **Description** — from short/full_description (HTML stripped); empty → generic
  `Shop on <brand>…` (NEVER the Amazon blurb anymore).
- **Important details / timelines** — real `tracking_speed` ("1 Hours"), `expected_confirmation_days`
  (35), and app-tracking (`app_tracking_enabled_android/ios`) → the 3 tiles.
- **Flat vs Upto** — `cashback.payment_type`: flat → "Flat ₹X" (grid + headline), percent → "Upto X%".
- **View Cashback Rates** — built from the store's own cashback (secondary rates aren't embedded
  on staging, so it's the primary row, not Amazon's static list). Terms sheet likewise from the
  store's `terms_and_conditions` (stripped → intro + bullets).

**Store-type variants** (the 3 Figma frames map to existing component props):
- `benefits` (default) — about + cashback + how-to + timelines + T&C.
- `upsell` (`StoreCashbackDetails bonusOffer` + timer) — triggered by `cashback_upsell_button_text`.
- `coupons` (`StoreOfferDetails copyCode` + code) — triggered by the grid's `coupons_count` > 0,
  passed to the page via the `hasCoupons` route param (the detail's coupons include isn't populated).

**Staging caveats:** almost no stores have coupons or upsell text, so those variants rarely
trigger on staging (they'll light up in prod). Upsell timer has no end-time field → the countdown
is a placeholder; coupon CODE isn't fetched yet (needs the coupons relationship in prod).

---

## 8. Brand-page corrections (Jaypore) — 2026-06-03

Real per-store data was using the wrong fields / variant. Fixed in `mapOfferStore` +
`OffersBrandAmazon`:
- **Description** ← `seo_description` (short/full_description are empty on most stores; this
  is where the real copy lives), then generic fallback. No more Amazon blurb.
- **Flat vs Upto** ← `cashback_type`: `'Cashback'` → **"Flat X%"**, `'Rewards'` → **"Upto X%"**
  (the trailing word is the cashback_type itself). `payment_type` is only ₹-vs-% — not the signal.
- **Benefits vs Offer block** — stores with `benefit_card_short_description` (e.g. Jaypore) render
  `StoreBenefitDetails` (numbered "X Benefits" list) and **hide** the "Top Offers / How to get"
  block. `StoreOfferDetails` shows only when `how_to_get_offer` is populated or coupons exist.
- **Terms & Conditions** ← real `terms_and_conditions` (parsed: split lines, strip `*`/`•`),
  fallback `special_terms_conditions`. Fed to both the T&C floor (`cards`) and the View-All sheet.
- **Pagination** — `getCategoryOffers` sends `page[size]=100` (API default 10; fashion = 39).

Caveat: upsell timer still has no end-time field; coupon code text not fetched (coupons
relationship not embedded on staging).

---

## 9. Earnings — ✅ wired (real shape confirmed) — 2026-06-03

- `GET /users/earnings` requires the **logged-in user's token** (Bearer; aws-token →
  "invalid signature"). `getEarnings(userToken)` + `useEarnings` (uses AuthContext
  `accessToken`, disabled when signed out).
- **Confirmed response shape**: `data` is an **array** of one `user` row; amounts are
  decimal strings. Mapped fields: `total_earned` → total, `total_cashback_earned` → cashback,
  `total_rewards_earned` → rewards, `confirmed_cashback` → Confirmed, `pending_cashback` →
  Pending. (Also available: `paid_cashback`, `payment_threshold`, `firstname`, `email`.)
- `EarningsScreen` shows these in the masthead + Confirmed/Pending rows; placeholders while
  loading / signed out. Money formatting: grouped ₹, 2-decimals only when there are paise.
- **Token refresh** (added): CK access tokens expire in **~15 min**. `AuthContext.refreshSession()`
  exchanges the refresh token for a fresh access token (persists it); `useEarnings` retries once
  through it on a 401/403. This is why Earnings showed ₹1,500 defaults — the restored access
  token was stale and nothing refreshed it. Other authed screens (Profile, etc.) should reuse
  `refreshSession` the same way.

---

## 10. Profile — ✅ wired — 2026-06-03

- `GET /users/profile` (user token) → `getProfile` (fixed: `data` is an **array**, same as
  earnings — was reading `data.attributes` and getting nothing). Returns `fullname`, `email`,
  `mobile_number`. `useProfile` hook mirrors `useEarnings` (refresh-on-401).
- `ProfileScreen` masthead now shows the real **name** (fullname), **contact** ("email · last-4
  of mobile"), and **avatar initial**. Falls back to "Manikandan" defaults while loading/signed out.
- **Logout** → `signOut()` (clears session + best-effort server logout) → resets the root stack
  to **Onboarding** (the live login/sign-up screen). Uses `navigation.getParent().reset(...)`.

Note: tabs still aren't gated behind login (a persisted session is auto-restored). Optional
follow-up: route to Onboarding in `RootNavigator` when `status === 'unauthenticated'`.

**Loading UX (2026-06-03):** Earnings/store-page showed hardcoded defaults (₹1,500 / Amazon)
while the first fetch was in flight, then snapped to real data. Fixed: Earnings shows "—" and
the store page a spinner while loading. Plus `AuthContext.signIn` now **prefetches** earnings +
profile into the query cache (`warmUserCache`) so those tabs open instantly after login (repeat
visits were already instant via the 5-min query cache).

---

## 11. Click-out CTAs wired to real links — 2026-06-03

- **Home "Apply Now"** (card tile + the CardDetailSheet sticky CTA) → opens the card's apply
  link. **As of 2026-06-24 this is the CashKaro tracker, not BankKaro's `network_url`** — see
  §11b below. `CardModel.applyUrl` = `…/visitretailer/app/<ck_store_id>?id=`; `handleResultApply`
  → `openUrl(withTrackingUser(card.applyUrl, profile?.id))` (same user-id injection as the store
  flow). Falls back to the BankKaro `network_url` (placeholders stripped) when a card has no
  `ck_store_id`.
- **Store "Earn Cashback on <brand>"** → opens the store's `cashback_url`
  (`OfferStoreDetail.cashbackUrl`, the CK `cktracking.../visitretailer/...` redirect),
  **with the logged-in user id injected** (see exit-click attribution below).
- Shared helper `src/lib/openUrl.ts` (RN `Linking.openURL`, trims, no-ops on empty, swallows errors).

### Exit-click attribution — ✅ wired 2026-06-04
The store `cashback_url` is `…/visitretailer/app/<store>?id=` with an **empty `id=`** slot —
that slot is the **user id**, and CashKaro only records an "exit click" against the user when
it's filled. Verified live: the offers API never fills it (cashback_url isn't even returned
under the user token), so `withTrackingUser(url, profile.id)` (`src/lib/openUrl.ts`) injects it
client-side; `OffersBrandAmazon` opens `withTrackingUser(store.cashbackUrl, profile?.id)`.
This is what makes a visited store appear in the **Missing Cashback** retailers / exit-click-dates
list (§14). No-ops when signed out. Probed user id = profile `data[0].id` (e.g. 2152754).

### 11b. CashKaro tracking + rate for cards — ✅ wired 2026-06-24

BankKaro stays the card **catalog** (name, art, fees, benefits, eligibility), but the **click-out
and the displayed reward both come from CashKaro** so the click is attributed to CashKaro and the
user sees CashKaro's payout. The join key is BankKaro's **`ck_store_id`** (the CashKaro store id;
present on all active cards — e.g. SBI Cashback = 24756).

- **Tracking link** — built deterministically (no extra call): `https://<CK.trackingHost>/visitretailer/app/<ck_store_id>?id=`
  (`cardTrackingUrl()` in `src/api/cashkaro.ts`; host is stage-driven in `env.ts`, staging =
  `cktracking.lmssecure.com`, prod = TODO at cutover). Verified live: the staging host resolves the
  **production** `ck_store_id` (24756 → SBI card page → CashKaro publisher `pub_id=594`, vs
  BankKaro's `network_url` `pub_id=10`). The empty `id=` slot is filled with the user id at click.
- **Rate** — CashKaro's reward, NOT BankKaro `commission` (SBI: BankKaro ₹1400 → CashKaro ₹1200).
  The card stores live in the `home-categories-exclusive` offers category; `getCardRateStores()`
  pages it (~288 stores / 3 pages, cached in `useCards`), `cardRates.ts` indexes by store id (+
  unambiguous normalised name) and `resolveCkRate(ck_store_id, name)` resolves each card. `cardMapper`
  uses the resolved rate for `cashback`/`cashbackValue`, else falls back to `commission`.
- **Coverage (staging):** ~73% match by `ck_store_id`, a few more by name (recovers staging "twin"
  stores like SBI's "CG May" #26519 whose id ≠ the prod `ck_store_id`), ~25% miss (premium/invite
  cards absent from CK staging — these keep the BankKaro commission and should resolve by id in prod).

---

## 12. Missing Cashback — flow reference (from the web prototype) — 2026-06-03

Source: `Downloads/Hrutvij- CashKaro Mini Apps` (`src/pages/MissingCashback.tsx`, `src/lib/api.ts`).
Documents the **different flows** so the mini-app can wire them. ⬜ NOT yet wired in the mini-app.

### CK endpoints (all user-token; same `/users/...` base as earnings/profile)
1. `GET  /users/missingcashback/retailers?page[number]&page[size]` — stores you can claim against (each has a **`group`** + `tracking_speed`).
2. `GET  /users/missingcashback/exitclickdates/<storeId>` — your visit/click dates for that store; `meta` carries `sample_orderid`, `orderid_hint_message`, `orderid_format` (regex), `report_merchant_name`.
3. `POST /users/missingcashback/validate` — validate {store, exit date, order id} before submit.
4. `POST /users/missingcashback/queue` — submit the claim (store, exit date, order id, amount).
5. `GET  /users/missingcashback/queue?filter[status]=Pending|Resolved|Rejected` — claims list (tabs).
6. `PUT  /users/missingcashback/queue/<id>` — add details (user_type / category) to a queued claim.
7. `POST /users/tickets/<exitDate>/<storeId>/<exitId>` — raise a ticket w/ invoice attachments (base64).

### Step machine
`claims → retailers → dates → orderId → orderAmount → [additionalDetails | categorySelection | invoiceUpload] → [ticketSuccess | success]`

### The flows are driven by the retailer's **`group`**
- **A** — standard: order id + amount → submit → success.
- **B1** — after submit, ask **New vs Existing user** (`user_type`) → PUT queue/<id>.
- **B2** — like A (no extra step; just a different tracking-speed default).
- **C1** — after submit, **category select** (Mobile Recharge / "No Cashback" categories / Other).
  "Other Category" → **invoice upload → raise ticket**; else PUT category.
- **C2** — after submit, **invoice upload → raise ticket** directly.
- **D** — **no order amount** required (`groupRequiresOrderAmount` false) → submit with amount "0".

### Submit-response branching (`meta` from POST queue / PUT)
- `cashback_id` present → cashback found → success ("tracked") modal.
- `status: "Resolved"` → success.
- `under_tracking: "yes"` → "under auto-tracking" success (countdown = click_date + tracking_speed).
- `status: "Pending"` + group B1/C1/C2 → go collect additional details (above).
- else → generic "added to queue" success.

### Order-id validation
`meta.orderid_format` is a map of **regex strings** (`/pattern/flags`); validate the typed order id
against any; show `sample_orderid` as the hint on mismatch.

### Mapping to the mini-app's existing screens
- `MissingCashbackDidYouShop` = the **claims list** (In Review=Pending / Closed=Resolved / Others=Rejected
  tabs) — currently static demo tickets → wire to endpoint 5; "Add details" CTA for B1/C1/C2.
- `MissingCashbackTrack` = the **new-claim entry** (recent purchases / retailers) → wire to endpoint 1,
  then build the `dates → orderId → orderAmount → group branch` steps (endpoints 2–4, 6–7).
- **Not yet built in the mini-app:** the dates/orderId/orderAmount steps, category/user-type/invoice
  sub-flows, and the tracked/success modals. The web prototype has them all to port.

---

## 13. Orders — list + detail (CashKaro) — ✅ wired 2026-06-04

Both order screens were static demo data; now live off the **logged-in user
token** (same `/users/...` base as earnings/profile, refresh-on-401 pattern).
Live shape was probed against staging (collection had no saved examples).

### Endpoints (user token; aws-token → "invalid signature")
- `GET /users/orders?page[size]=N&device=App` → JSON:API list of `myorder` rows.
- `GET /users/orders/:id?device=App` → JSON:API `orderdetails`.

### List row attributes (confirmed live)
`merchant_image_url` (may be `.../no-image.jpg` → use fallback logo),
`cashback_type` (**Cashback | Rewards | Bonus | Referral**), `cashback_amount`
(decimal string "684.50"), `cashback_status` (**Pending | Requested | Confirmed
| Paid | Cancelled**), `order_id` (string, may be ""), `bonus_type`,
`referral_name`, `comments` (→ expandable Note), `groupid`, `currency`.

### Detail attributes (confirmed live)
`order_amount`, `merchant_name`/`report_merchant_name`, `cashback_amount`,
`cashback_status`, `order_id`, `transaction_date`/`pending_date`/`confirm_date`/
`paid_date`/`cancelled_date`/`expected_confirmation_date` (all ISO), `is_delayed`
("yes"/"no"), `*_comments`, plus `relationships.configurations` (raisequery Q&A
for the "Need Help" flow) and `relationships.ticket`.

### Mapping decisions (`src/api/ordersMapper.ts`)
- **Row type** ← `cashback_type` (fallbacks: `referral_name` → referral,
  `bonus_type` → bonus). Drives meta label ("Order ID:" / "Bonus Type:" /
  "Referral Name:") and badge variant (**referral → Tag "Referral"**, else
  StatusBadge). Referral rows have no detail page (no chevron / no nav).
- **Status badge** ← `cashback_status` lowercased; **`is_delayed:"yes"` on a
  pending/requested order → `delayed`** (wins).
- **Amount** ← `cashback_amount` → "₹684.5" (trailing-zero paise trimmed).
- **Logo** ← `merchant_image_url` as `{ uri }`; `no-image` → `images.logos.darkSmall`.
- **Detail timeline** ← real dates per status (placed → tracked → confirmation/
  confirmed/paid/cancelled). `delayed` uses warning/amber (Timeline has no
  orange tone — same gap as the demo). Masthead amount/logo/tone/label/expected
  + the 3 summary rows all from the detail response.

### Wiring
- `src/query/useOrders.ts`, `src/query/useOrderDetail.ts` (mirror useEarnings:
  enabled when signed in, refresh access token once on 401/403).
- `OrdersList` consumes `useOrders` (spinner / "No orders yet" / Retry); each row
  taps to `OrdersDetail` with **`{ id }`** (nav param gained `id`).
- `OrdersDetail` consumes `useOrderDetail(id)`; falls back to the legacy
  `{ status }` demo config when no `id` is passed (spinner / Retry on first load).

### Open follow-ups / gaps
- ✅ Entry point: the Earnings screen "My Order Details" `ListRow` →
  `navigation.navigate('OrdersList')` (was a no-op `() => undefined`).
- **"Note" help card** in the detail is still the static gold-coins copy
  (identical across Figma states). The real `relationships.configurations`
  (raisequery Q&A) + `ticket` are NOT wired — "Need Help" routes to the
  missing-cashback flow. Candidate for a proper raise-query sheet later.
- No Rewards/Referral rows existed on the probed account (9970272550) — those
  branches are mapped defensively but not yet seen live.
- `delay_validation_comments`/`cancelled_comments` etc. on the detail are not
  surfaced; could feed a status explainer line.

---

## 14. Missing Cashback — full claim flow (CashKaro) — ✅ wired 2026-06-04

The most complex flow. Ported the group-branching logic from the CashKaro web
prototype (`Downloads/Hrutvij- CashKaro Mini Apps`, see §12) onto the existing
RN screens, wired to live user-token endpoints.

### API (`src/api/missingCashback.ts`, mapper `missingCashbackMapper.ts`)
- `getRetailers` → `/users/missingcashback/retailers` (device=App).
- `getExitClickDates(storeId)` → visit dates + `meta.orderid_format` (regex map).
- `validateClaim` → POST `/validate`; `submitQueue` → POST `/queue`;
  `updateQueue` → PUT `/queue/:id` (user_type | category);
  `getQueue(status)` → list; `getQueueItem` (scan Pending→Resolved by id).
- `raiseTicket` → POST `/users/tickets/:date/:store/:exit` — **multipart**
  (RN FormData, `ticket_attachment[n]` files). `client.ts` + CK `ck()` made
  FormData-aware (skip JSON content-type, pass body through).
- Hooks: `useRetailers`, `useExitClickDates`, `useClaims(tab)` (queries,
  refresh-on-401) + `useMissingCashbackActions()` (imperative validate/submit/
  update/raiseTicket/getItem, token-bound, refresh-on-401).

### Flow rules (mapper — verbatim from the prototype)
- `groupRequiresOrderAmount`: group ≠ D (D submits amount "0" right after validate).
- `groupRequiresAdditionalDetails`: B1 | C1 | C2.
- `decideSubmitOutcome(res, group)` — branch order: `cashback_id` → tracked ·
  `status:Resolved` → success · `under_tracking:yes` → success(auto-tracking) ·
  `status:Pending` + B1/C1/C2 → collect · else → queued.

### Screen flow (nav-param threaded via `McClaimDraft`)
```
WhereDidYouShop(retailers) → ChooseDate(dates) → EnterOrderId(validate)
   ├─ group D → submit("0") → Result
   └─ else → EnterAmount(submit) → branch:
        tracked/queued/tracking → MissingCashbackResult
        Pending B1 → NewUserCheck (PUT user_type) → Result
        Pending C1 → CategorySelect (PUT category | "Other" → InvoiceUpload)
        Pending C2 → InvoiceUpload (raiseTicket) → TicketSuccess
```
- Each step carries the accumulating `McClaimDraft` (store, group, exitDate,
  exitId, orderId, orderAmount, queueId) — see `navigation/types.ts`.

### Screens
- **Wired live** (were static): WhereDidYouShop, ChooseDate, EnterOrderId,
  EnterAmount, NewUserCheck, DidYouShop.
- **New, from Figma**: `MissingCashbackTicketSuccess` (4129:27840 "allow 8–10
  business days"), `MissingCashbackResult` (4129:24114 cashback-tracked sheet).
- **New, on-brand** (⚠️ no Figma frame exists — C1/C2 are Amazon-edge flows the
  design never drew): `MissingCashbackCategorySelect`, `MissingCashbackInvoiceUpload`
  (uploader caption matches the Figma feedback-form attachment spec). Invoice
  uses **expo-image-picker** (newly added; Expo-Go compatible).
- **Claims list consolidated**: `DidYouShop` is now the single live list (3 tabs
  In Review/Closed/Others → Pending/Resolved/Rejected, real counts). Cards:
  in-review (timer) / need-details (resume CTA by group) / tracked (→ order).
  The old `TicketStatusReview`/`TicketListClosed`/`TicketListTracked`/`Track`
  screens are **superseded** (still registered as demo refs; TicketStatusReview's
  CTA repointed to the live list to avoid a draft crash).

### Entry points (all → the flow)
- Profile → Missing Cashback → DidYouShop (live list).
- Earnings → Missing Cashback row → DidYouShop (was a no-op).
- OrdersList "Check Status" + OrdersDetail "Need Help" → WhereDidYouShop (new claim).
- DidYouShop banner "Have more cashback to track?" → WhereDidYouShop.

### Open follow-ups / caveats
- Not device-tested end-to-end: needs an account with real retailers/claims.
  The probed account (9970272550) had orders but MC retailers/claims unverified.
- Category-select + invoice-upload are on-brand (no Figma) — reconcile later if
  frames get drawn.
- `raiseTicket` multipart untested against staging (CloudFront sometimes blocks
  app multipart). Invoice files are RN URIs, not base64 (native upload path).
- expo-image-picker needs its config plugin for a production build; works in
  Expo Go as-is.
- Timers on claim cards are stamped at fetch time (not live-counting) — fine for
  the demo.
