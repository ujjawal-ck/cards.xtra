# PROJECT_STATE.md — Cards.xtra (mini-app)

> **Snapshot:** 2026-06-10 · branch `devrana-amount-loading-shimmer` (off `miniapp-hrutvij`).
> A whole-repo audit: folder structure, every screen + its status, the API
> integration layer (BankKaro + CashKaro staging), the navigation map, the
> token architecture, and the known gaps / TODOs. This is a living snapshot —
> re-audit after large merges. Facts cite `file:line` so they're verifiable.

---

## 1. What this is

An **Expo SDK 54 / React Native** mobile app (iOS + Android, run via Expo Go)
for **Cards.xtra, powered by CashKaro** — a credit-card comparison + cashback
app. It began as a stakeholder demo but is built as the real production
foundation: clean, token-bound, atomic. It now spans far more than the original
4-screen demo scope in `CLAUDE.md` (Withdraw, Missing-Cashback, Orders, Profile
sub-screens and Notifications all exist and are mostly wired to live backends).

**Two live backends**, both on staging:
- **CashKaro** (`ckapistaging.lmssecure.com/v1`) — auth, user, earnings, orders, offers, payments, missing-cashback.
- **BankKaro / CardGenius** (`platform.bankkaro.com/partner`) — card catalog, card detail, eligibility.

---

## 2. Tech stack & tooling

- **Expo SDK 54**, React 19.1, RN 0.81, JavaScript entry (`App.js`); `.ts/.tsx` for everything in `src/`.
- **Navigation:** `@react-navigation/native` + native-stack + bottom-tabs.
- **Bottom sheets:** `@gorhom/bottom-sheet` (+ gesture-handler, reanimated 4, worklets).
- **Animation:** `react-native-reanimated`; **masking:** `@react-native-masked-view/masked-view` (Expo-Go-bundled); **gradients:** `expo-linear-gradient`; **video:** `expo-video`; **SVG:** `react-native-svg` (+ transformer).
- **Data:** `@tanstack/react-query`; fetch-based clients (no Axios).
- **Storage:** `expo-secure-store` (session tokens).
- **Fonts:** Outfit (`@expo-google-fonts/outfit`), 5 weights, gated at startup.
- **Tests:** none. No `*.test.*` / `__tests__`. The only automated check is `npx tsc --noEmit` (tsconfig is minimal, extends `expo/tsconfig.base`).
- **Run:** `npx expo start -c` → scan QR in Expo Go. `-c` clears Metro cache (required after adding assets/native libs).

---

## 3. Folder structure (`src/`)

```
src/
  api/        13 — backend clients (cashkaro, bankkaro, payments, missingCashback,
                   eligibility, client) + mappers (card, cardBenefits, earnings,
                   orders, offers, missingCashback)
  auth/        2 — AuthContext, tokenStore (secure-store session)
  query/      10 — react-query hooks (useCards, useOffers, useEarnings, useOrders,
                   useOrderDetail, useCardBenefits, useProfile, usePaymentInfo,
                   useMissingCashback) + queryClient
  config/      env.ts — single staging/local/prod switch (base URLs, keys)
  data/        static fixtures (cards, partners, amazonOffers, filterOptions, offerCategories)
  lib/         openUrl (click-out + tracking-user injection)
  types/       shared TS types
  tokens/      7 — colors, spacing, typography, gradients, elevation, opacity, index (LAW)
  theme/       gradients.ts — brand gradients deliberately outside locked tokens/
  atoms/      28 components + index
  molecules/  24 components + index
  organisms/  39 components + index
  navigation/  RootNavigator, TabNavigator, WithdrawStack, types
  screens/    41 screens + helpers; screens/withdraw/ 7 screens + helpers
  assets/     icons (SVG registry), images (cards/brands/stores/categories/…), videos, animations
```

> ⚠️ **Repo hygiene:** a nested **`mini-app/`** folder sits at the repo root — a
> full clone-inside-the-clone **with its own `.git`** (branch `miniapp-hrutvij`,
> one commit behind the outer tip). It's untracked (`?? mini-app/`) and not
> gitignored. It should be removed or gitignored to avoid accidental commits.

---

## 4. Token architecture (`src/tokens/` — "TOKENS ARE LAW")

Two layers, mirroring the Figma variable collections. **Components consume only
the semantic `colors.*` layer — never `primitives.*`.** Re-theming = remapping a
semantic token.

- **`colors.ts`** — Layer 1 `primitives`: 9 ramps (~50→1000) — `saffron` (brand, 500 `#ff6d1d`), `cobalt` (accent, 500 `#0741ef`), `slate` (neutral, 50 `#ffffff`→1000 `#000000`), `fern`, `amber`, `ruby`, `rose`, `violet`, `sky`, plus `transparentBlack/White` rgba scales. Layer 2 `colors` semantic groups: `background`, `surface`, `border`, `text` (primary `#262626`, inverse, link), `action` (variant-keyed: `primary`=saffron, `accent`=cobalt, `secondary`, `tertiary`, `destructive`), `feedback` (success/warning/error/info), `cashback`, `promotional`, `icon`, **`tones`** (9 bundles bg/bgSubtle/text/border for Toast/InlineMessage — exported type `ToneName`), `status` (7 cashback-lifecycle bundles).
- **`spacing.ts`** — `spacing` 0–128 scale; `radius` (xs4→4xl48, full 10000); `borderWidth` (hairline .5 → extra 3, iconDefault 1.25); `iconSize` 8–56; `avatarSize` 24–80; `mediaSize` 16–64; `sizing` (touchMin 44, containerMobile 360, bottomNavHeight 64, …).
- **`typography.ts`** — Outfit; `fontFamily` per weight (never `fontWeight`). Variant scheme `<category><size><weight>` (Figma "Heading/20/Semi Bold" → `heading20SemiBold`); each value is a full RN text-style object. Families: Display (40/36/32), Heading (30→16), Body (17→12), Caption (10).
- **`gradients.ts`** — expo-linear-gradient-shaped brand/surface/accent gradients; 3 radials flagged as needing svg. Stops are raw hex *by design* (documents Figma named gradients).
- **`elevation.ts`** — shadow factory; 3 families (`light`/`neutral`/`brand`) × 6 steps (`xs/sm/md/lg/xl/up`).
- **`opacity.ts`** — `opacity` (node-level 0..1, % keys) + `alpha` (rgba black/white overlays).
- **`index.ts`** — barrel for all of the above. Does **not** export `src/theme/gradients.ts` (brand gradients imported directly).

**Token compliance:** overwhelmingly clean. Genuine raw-hex leaks in component code = **3**, all in `organisms/`, all commented + flagged for tokenization: `CardTile.tsx:91` (`GOLD_STOP_END`), `CardDetailMasthead.tsx:310` (`shadowColor '#000'`), `HowToGetOfferCard.tsx:41` (custom shadow). Atoms/molecules = 0.

---

## 5. Component library

### Atoms (`src/atoms/` — 28 + index)
Text, Button, Input, TextArea, OtpBox, OtpInput, Tag, Badge, CashbackBadge,
StatusBadge, Chip, Selector, Checkbox, Radio, Switch, Divider, DividerVertical,
Indicator, Timer, Icon (SVG registry), InfoCircleGlyph, BrandLogoTile,
LogoContainer, DateSelection, MonthSelector, Rating, **AmountSkeleton** (loading
shimmer), **RollingAmount** (odometer money reveal).

### Molecules (`src/molecules/` — 24 + index)
SearchBar (+SearchResults), CardTile *(older)*, PartnerCard, FilterRow,
CategoryCircle, Choice, TermsAndConditions, TabPrimary, TabsSecondary, ListRow,
Tooltip, Accordion, Toast, InlineMessage, StripAlert, CardFeeStrip, BrandLogo
(+BrandLogoGrid), AmountActionRow, DiscBulletList, HelpTicketCard,
TrackMoreBanner, PaymentRecordCard, ReviewCard, HeroVideo.

### Organisms (`src/organisms/` — 39 + index)
**Card:** CardDetailSheet *(scroll-to-expand, non-negotiable)*, CardDetailMasthead, CardTile *(rebuilt — preferred)*, Carousels (7 exports), Grid.
**Chrome:** BottomNav, Header, HomeHeader, MastheadHeader, Masthead, Footer, FooterButtons.
**Sheets:** BottomSheet/Header/Body, LoginSheet, SelectMonthSheet, EarningsBreakupSheet, EarningStatusSheet, CashbackNotConfirmedSheet, MissingCashbackSummarySheet, ShareSheet, EligibilityCheckerSheet, EligibleSheet, MaybeSheet, IneligibleSheet, EligibilityMasthead, FilterMenu, SearchTopSheet (+provider/hook).
**Store page:** StoreAboutBrand, StoreCashbackDetails, StoreOfferDetails, StoreBenefitDetails, StoreCashbackTimelines, StoreTermsConditions, StoreSimilarStore, HowToGetOfferCard.
**Misc:** OrderRow, Timeline.

> Note: `import { CardTile } from '../organisms'` resolves to the **organism**
> rebuild; the molecule `CardTile` is the older placeholder (flagged for deletion
> in IDEOLOGY-AUDIT).

---

## 6. Screens & status (`src/screens/` — 41 screens + helpers)

Status legend: **live** = consumes a real query hook · **static** = renders with
hardcoded/placeholder data · **stub** = layout only · **flow** = step in a
multi-screen flow.

### Auth / Onboarding / Bootstrap
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| FoundationCheck | TEMP design-token verification screen; **current initial route** | stub | — |
| SplashScreen | Lottie splash → Onboarding | flow | — |
| OnboardingScreen | Landing → Login sheet | flow | — |
| LoginScreen | Phone entry → Get OTP | flow | — |
| OtpScreen | OTP + resend → MainTabs | flow | — |

### Home / Offers
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| HomeScreen | Hero + live card list; opens CardDetailSheet | **live** | `useCards` |
| OffersScreen (tab) | Category strip + partner grid | **live** | `useCategoryOffers` |
| OffersBrandAmazon | Brand/store page (slug-driven) | **live** | `useOfferStore`, `useProfile` |
| AllCardBenefitsScreen | All-benefits page from detail sheet | **live** | `useCardBenefits` |
| NotificationsScreen | Notifications list (Home bell) | static | — |

### Earnings / Withdraw
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| EarningsScreen (tab) | Earnings landing + balance buckets | **live** | `useEarnings` |
| WithdrawScreen (`WithdrawMethodSelect`) | Method select; reads earnings | **live** | `useEarnings` |
| withdraw/WithdrawEnterUPI | UPI ID + send OTP | **live** | `usePaymentInfo` |
| withdraw/WithdrawAmazon | Amazon Pay mobile + OTP | **live** | `usePaymentInfo` |
| withdraw/WithdrawFlipkart | Flipkart email + OTP | **live** | `usePaymentInfo` |
| withdraw/WithdrawVerifyOTP | Shared 6-digit OTP → submit payment | flow | — |
| withdraw/WithdrawGiftCard | Rewards/combined gift-card chooser | flow | — |
| withdraw/WithdrawSuccess | Success terminal | flow | — |
| withdraw/WithdrawTerms | Static UPI T&C | stub | — |

### Orders
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| OrdersList | Orders list | **live** | `useOrders` |
| OrdersDetail | Order detail (id-driven) | **live** | `useOrderDetail` |

### Missing-Cashback flow
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| MissingCashbackDidYouShop | LIVE consolidated claims (3 tabs); flow hub | **live** | `useClaims` |
| MissingCashbackWhereDidYouShop | Retailer picker — claim ENTRY | **live** | `useRetailers` |
| MissingCashbackChooseDate | Visit-date picker | **live** | `useExitClickDates` |
| MissingCashbackEnterOrderId | Order-ID + validate | **live** | `useExitClickDates`, actions |
| MissingCashbackEnterAmount | Amount → submit to queue | **live** | actions |
| MissingCashbackNewUserCheck | Group-B1 new-vs-existing (PUT) | **live** | actions |
| MissingCashbackCategorySelect | Group-C1 category (PUT) | **live** | actions |
| MissingCashbackInvoiceUpload | C1-Other/C2 invoice → raise ticket | **live** | actions |
| MissingCashbackResult | Terminal result (param-driven) | flow | — |
| MissingCashbackTicketSuccess | "Allow 8–10 days" after ticket | flow | — |
| MissingCashbackTrack | Raise/track purchases step | static | — |
| MissingCashbackTicketStatusReview / …ListClosed / …ListTracked | Demo ticket lists — **registered but off the live path** (superseded by DidYouShop) | static | — |

### Profile / Account
| Screen | Purpose | Status | Hook |
|---|---|---|---|
| ProfileScreen (tab) | Profile landing (avatar + menu) | **live** | `useProfile` |
| AccountSettingsScreen | Edit profile / settings | **live** | `useProfile` |
| EditContactVerifyIdentity / EnterNew / VerifyNew | Email/mobile change (3 steps) | flow | — |
| DeleteAccountScreen | Delete-account landing (T&C) | flow | — |
| DeleteAccountOtpScreen | Delete-account OTP gate | flow | `useProfile` |
| AccountDeletedScreen | Deleted terminal (back-gesture blocked) | flow | — |
| ProfilePaymentHistory / …Details | Payment history list + detail | static | — |
| ProfilePaymentHistoryEmpty | Payment-history empty state | stub | — |
| ReviewUsScreen | "Review Us" rating | static | — |

> **Orphans:** none — every screen file is registered in a navigator. The three
> "demo reference" MissingCashbackTicket* screens are registered but unreachable
> from the live UX (they only navigate to each other / Track).

---

## 7. Navigation map

3 navigators: a root native-stack, a bottom-tab navigator (nested at `MainTabs`),
and a nested Withdraw stack.

```
RootNavigator (native stack, initialRouteName = "FoundationCheck"  ← TEMPORARY)
│
├─ FoundationCheck                [temp token-verification screen]
├─ Splash ─(replace)→ Onboarding → Login(sheet) → Otp → MainTabs
│
├─ MainTabs  (Bottom tabs, default = Home; custom FloatingBottomNav bar)
│    ├─ Home      → HomeScreen      [useCards]
│    ├─ Offers    → OffersScreen    [useCategoryOffers]
│    ├─ Earnings  → EarningsScreen  [useEarnings]
│    └─ Profile   → ProfileScreen   [useProfile]
│
├─ Notifications          (Home bell)
├─ OffersBrandAmazon      (from Offers)        [useOfferStore, useProfile]
├─ AllCardBenefits        (from CardDetailSheet)[useCardBenefits]
│
├─ WithdrawStack  (nested stack, initial = WithdrawMethodSelect)
│    └─ MethodSelect [useEarnings]
│         ├─(UPI/Amazon/Flipkart)→ Enter* [usePaymentInfo] → VerifyOTP ─┐
│         ├─ GiftCard ───────────────────────────────────────────────────┤
│         ├─ Terms                                                        │
│         └──────────────────────────────────────────────► Success ◄──────┘
│
├─ Orders:  OrdersList [useOrders] → OrdersDetail [useOrderDetail]
│
├─ Missing-Cashback:
│    DidYouShop [useClaims] (hub)
│      ├→ Track
│      └→ WhereDidYouShop [useRetailers]  (ENTRY)
│           → ChooseDate [useExitClickDates] → EnterOrderId → EnterAmount → Result
│           → (B1) NewUserCheck → Result   /  (C1) CategorySelect → Result
│           → (C1-Other/C2) InvoiceUpload → TicketSuccess
│    [TicketStatusReview, TicketListClosed, TicketListTracked — registered, off-path]
│
└─ Profile/Account:
     AccountSettings [useProfile]
       ├→ EditContact: VerifyIdentity → EnterNew → VerifyNew → back
       └→ DeleteAccount → DeleteAccountOtp [useProfile] → AccountDeleted (terminal)
     ProfilePaymentHistory → …Details ; …Empty ; ReviewUs
```

> ⚠️ **Pre-demo / pre-prod flip:** `RootNavigator.tsx:62` `initialRouteName="FoundationCheck"`
> must revert to `Login` (or `Splash`/`Onboarding`). Flagged in `RootNavigator.tsx:3`
> and `types.ts:37`.

---

## 8. API / integration layer

### 8.1 Clients & base URLs
- **Shared core — `src/api/client.ts`:** backend-agnostic `httpRequest()` (querystring builder, header passthrough, JSON encode, FormData passthrough for multipart, 20s `AbortController` timeout), normalizes failures into `ApiError {message, status, payload}` (`status:0` = network/timeout). `basicAuthHeader()` hand-rolls base64 (Hermes-safe).
- **CashKaro — `src/api/cashkaro.ts`** · base **`https://ckapistaging.lmssecure.com/v1`** (`env.ts:34`). JSON:API. Shared headers: `Accept: application/vnd.api+json`, `x-chkr-app-version: 4.6`, `x-api-key`. **Two-tier auth:** (1) **aws-token** bootstrap from `GET /token` (HTTP Basic), 30-min in-memory TTL, sent as `Bearer` pre-login; (2) **user session** `access_token`/`refresh_token` from `/login`/`/signupV1`. Endpoints: `/token`, `/loginotp`, `/login`, `/signupotp`, `/signupV1`, `/refreshtoken`, `/users/earnings`, `/users/orders[/:id]`, `/users/profile`, `/users/logout`, `/offers/categories`, `/offers/category/<path>`, `/offers/<slug>`.
- **CashKaro payments — `src/api/payments.ts`** (same base/auth): `/payment/payment`, `/users/sendotp`, `/users/verify`, `/payment/paymentV1` (UPI/Amazon/Flipkart/Bank).
- **CashKaro missing-cashback — `src/api/missingCashback.ts`**: `/users/missingcashback/{retailers,exitclickdates/:id,validate,queue,queue/:id}`, `/users/tickets/:date/:store/:exit` (multipart upload).
- **BankKaro / CardGenius — `src/api/bankkaro.ts`** · base **`https://platform.bankkaro.com/partner`** (`env.ts:40`). Partner **JWT** minted once via `POST /token` (header `partner-token: <key>` + body `{x-api-key}`), cached in memory, sent as `partner-token` on every call. Endpoints: `/cardgenius/{init-bundle,popular-cards,cards,cards/:alias,eligiblity,calculate}` (backend's `eligiblity` misspelling preserved — `bankkaro.ts:81`).

### 8.2 Query hooks (`src/query/`)
Defaults (`queryClient.ts`): `staleTime` 5min, `gcTime` 30min, **retry 1 except none on 401/403**, no refetch-on-focus.

| Hook | Backend → endpoint | Returns | Notes |
|---|---|---|---|
| `useCards` | BK `cards` + `init-bundle` (parallel) | `CardModel[]` (`status===true`) | init-bundle failure tolerated |
| `useCardBenefits(alias)` | BK `cards/:alias` | `BenefitCategory[]` | `enabled: !!alias` |
| `useCategoryOffers(slug)` / `useOfferStore(slug)` | CK `offers/category/*` / `offers/*` | summaries / detail | `enabled: !!slug` |
| `useEarnings` | CK `users/earnings` | `EarningsValues` | auth-gated; refresh-on-401 |
| `useOrders` / `useOrderDetail(id)` | CK `users/orders[/:id]` | rows / detail | auth-gated; refresh-on-401 |
| `useProfile` | CK `users/profile` | `UserProfile` | auth-gated; refresh-on-401 |
| `usePaymentInfo` | CK `payment/payment` | amounts + method IDs | auth-gated; refresh-on-401 |
| `useRetailers` / `useExitClickDates` / `useClaims` / `useMissingCashbackActions` | CK missing-cashback | rows / dates / claims / imperative actions | `staleTime:0`; refresh-on-401 |

Refresh-on-401 is **hand-rolled per hook** (fetch-based, no interceptor): catch `ApiError` 401/403 → `refreshSession()` once → retry → else rethrow.

### 8.3 Auth flow (`src/auth/`)
- **Login/OTP:** `LoginScreen` → `loginOtp(phone)` (`/loginotp`) → `OtpScreen` → `login()` (`/login`) → `signIn(session)`. Signup endpoints exist but the UI wires **login only**.
- **Storage (`tokenStore.ts`):** `expo-secure-store` keys `ck_access_token`, `ck_refresh_token`, `device_unique_id`. The aws-token + BankKaro JWT are intentionally **not persisted** (in-memory).
- **Session (`AuthContext.tsx`):** bootstrap loads deviceId + session in parallel (`loading→authenticated|unauthenticated`); `signIn` prefetches earnings + profile; access tokens expire ~15min → `refreshSession()` via `/refreshtoken`; `signOut` best-effort `/users/logout` then clears storage. Query keys embed `accessToken` so cache auto-invalidates on token change.
- **Provider order (`App.js`):** GestureHandlerRootView → QueryClientProvider → AuthProvider → SafeAreaProvider → BottomSheetModalProvider → NavigationContainer.

### 8.4 Mappers (`src/api/*Mapper.ts`)
- **`cardMapper.ts`** — BK card → `CardModel`; Indian digit grouping, `formatFee`, **fees + 18% GST**, derived `feeType`, USP→icon mapping, applyUrl placeholder stripping; static `FALLBACK_BANK_NAMES` (names only).
- **`cardBenefitsMapper.ts`** — `product_benefits` HTML → `BenefitCategory[]` tabs; strips tags, decodes entities (`&#8377;`→₹), drops "no benefits" placeholders.
- **`earningsMapper.ts`** — `/users/earnings` → `EarningsValues`; `money()` (`₹10,000` / `₹775.60`); computes `combined` + numeric fields; `hasData` flag.
- **`ordersMapper.ts`** — list + detail → models; money/date formatting, status→`StatusBadgeStatus`, per-status timeline.
- **`offersMapper.ts`** — offers → summaries/detail; **asset host swap** `asset11→asset21.ckassets.com` (403 workaround); CTA label logic; HTML stripping.
- **`missingCashbackMapper.ts`** — flow branching (A/B1/B2/C1/C2/D), submit-outcome decision, order-id regex validation, tracking-speed parsing, claim view-models.

### 8.5 Config & secrets (`src/config/env.ts`)
- Single hardcoded switch **`STAGE = 'staging'`** (`env.ts:23`). `local`/`prod` blocks are empty TODO stubs (`:47`, `:52`). No `.env` files; no `process.env`/`expo-constants` usage — **all config compiled into the bundle.**
- **Hardcoded staging secrets (committed):** CK `x-api-key` `<redacted>` (`:35`), CK Basic user/pass `<redacted>` (`:36-37`), BK partner key `<redacted>` (`:42-43`). The file acknowledges this and warns: client secrets need a server proxy before prod. `.gitignore` excludes `docs/api/` ("contain real secrets") — but `env.ts` itself is committed. **No prod credentials present.**

### 8.6 Integration status
- **Live against staging:** Auth (login/OTP/refresh), Home cards (`useCards`), card detail benefits, eligibility (`/cardgenius/eligiblity`), Offers grid + brand page, Earnings, Profile, Orders, Payments, Missing-Cashback.
- **Static fixtures (`src/data/`):** `cards.ts`/`partners.ts` are legacy and **not imported** by the live screens. `amazonOffers.ts` is an **active fallback** in `OffersBrandAmazon`. `filterOptions.ts` provides the **client-side filter predicate** (server filters by category only; network/fee/etc. applied locally). `offerCategories.ts` = label→path map.
- **Implemented but unused:** BK `popular-cards`, filtered `cards` POST, `calculate` (no hook). CK signup endpoints (UI is login-only). BankKaro response types still `any` ("Phase 2").

---

## 9. Known gaps & TODOs

### Config / integration
- `env.ts:47,52` — `local` + `prod` stage configs empty (`// TODO: fill at prod cutover`).
- `env.ts:12-16` — staging secrets bundled client-side; **need a server proxy before prod**.
- `cardMapper.ts:311` — applyUrl `{click_id}/{user_id}` placeholders stripped (no click context yet).
- INTEGRATION.md caveats: `fcm_id` placeholder (push won't route); MaybeSheet suggested cards hardcoded; embedded eligibility checker is `console.log` only; offers upsell timer has no end-time + coupon text not fetched; OrdersDetail help card static + ticket relationships not wired; MC flow not device-tested end-to-end; `raiseTicket` multipart untested vs staging; expo-image-picker needs its config plugin for a production build.

### Components
- `BottomSheetBody.tsx:486,506` — **`_FilterMenu` not built**; `'filters'` template renders a labelled stub.
- `CardDetailSheet.tsx:17-19` — header lists Fee/Eligibility/Carousels/Recommended as "omitted (Stage 2B/2C)" — **looks stale vs INTEGRATION.md** which marks the sheet wired. *(Verify against current code.)*
- `molecules/CardTile.tsx`, `atoms/Badge.tsx`, `atoms/OtpBox.tsx` + dead `LoginScreen`/`OtpScreen` flagged for deletion in IDEOLOGY-AUDIT (**not yet done** — Login/Otp still registered).

### Screens
- `withdraw/WithdrawSuccess.tsx:94` — TODO: success GIF asset.
- `WithdrawScreen.tsx:203` — Bank Transfer is a no-op (no Figma yet).
- `MissingCashbackTrack.tsx:144` — manual "raise a ticket" route not built (empty onPress).
- `MissingCashbackTicketListClosed/Tracked` — upload/details routes inert (TODO).
- `ProfilePaymentHistoryEmpty.tsx` + `FoundationCheck.tsx:3531` — illustration PNGs pending export (intentional placeholders, no broken refs).
- `OrdersDetail.tsx:141` — delayed status uses amber tone (Timeline lacks orange — flagged token gap).
- `NotificationsScreen` — static demo data.

### Tokens (documented in IDEOLOGY-AUDIT / FIGMA_RECONCILE)
- Add missing recipes: alpha steps, glare/overlay/shimmer gradients, exact shadow recipes, per-status `feedback.*.subtle`, section-tint hexes, zero-tracking ExtraBold/16.
- Duplicate `gradients.ts` in both `src/tokens` and `src/theme` (intentional split, flagged to consolidate once `colors.ts` unlocks).
- 3 flagged raw-hex leaks (§4).

### Assets / icons
- Icon registration owed: `right-circle`, `gethelp`/headset, `info-circle` (currently substituted/omitted — FIGMA_RECONCILE).

---

## 10. Cross-doc inconsistencies to resolve (human glance)
1. **CardDetailSheet scope:** `CardDetailSheet.tsx:17` (sections omitted) vs INTEGRATION.md:15 (sheet wired with fees/eligibility/recommended). One is stale.
2. **Dead-code cleanup:** IDEOLOGY-AUDIT says delete `LoginScreen`/`OtpScreen` (real login = Onboarding sheet), but both are still imported + registered in `RootNavigator.tsx:21-22,77-78`.
3. **Scope drift:** `CLAUDE.md` still describes a 4-screen demo; the app is now ~50 screens. CLAUDE.md should be updated or explicitly marked as historical.

---

## 11. Reference docs on disk
- **CLAUDE.md** — build constitution ("tokens are law", saffron-primary, atomic structure, scroll-to-expand sheet). *Scope section is historical.*
- **COMPONENT_SPECS.md** — exact Figma specs per component (file `P7UcoZYBnfyefmJIA8wcM7`), tokens mapped.
- **INTEGRATION.md** — backend wiring tracker (CK + BK), per-area status + caveats.
- **FIGMA_RECONCILE.md** — 2026-06-03 reconcile vs Figma; enumerates 🚩 open items (asset exports, icon registration, optional tokens).
- **IDEOLOGY-AUDIT-AND-FIXES.md** — 2026-06-04 code-health audit (8–9/10, 86 issues); 6 prioritized fixes (tokens, dead-code, semantic colors, shadows, sizes, housekeeping).
- **NEW-APP-DESIGN-BRIEF.md** — process guidance for building future category apps on the shared system.
- **AGENTS.md** — one rule: read Expo v54 docs before coding.

---

## 12. Pre-demo / pre-prod checklist
- [ ] Revert `RootNavigator.tsx:62` `initialRouteName` → `Login` (or `Splash`).
- [ ] Remove or gitignore the nested `mini-app/` clone-in-clone.
- [ ] Front the staging API keys/basic-auth with a server proxy before any prod cutover; fill `env.ts` `prod` block + wire `EXPO_PUBLIC_STAGE`.
- [ ] Build `_FilterMenu` (filters sheet template stub).
- [ ] Reconcile CardDetailSheet scope comment vs actual sections.
- [ ] Execute IDEOLOGY-AUDIT dead-code deletions (or close them out).
- [ ] Export pending illustration assets (WithdrawSuccess GIF, payment-history empty, ScreenState PNGs).
- [ ] Register missing icons; add the OrdersDetail orange/delayed timeline tone.
- [ ] Add at least smoke tests (none exist today).
