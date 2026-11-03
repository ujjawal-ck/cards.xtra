# Cards.xtra: Figma vs code gap audit and roadmap

Audited 2026-11-03. Figma file `P7UcoZYBnfyefmJIA8wcM7`, page "Refined Flow" (248 screen frames). Code at commit `ae263b5`. Read-only audit: no app code was changed.

## 1. The short version

The app is further along than the Figma count suggests, but it is not production-ready. Every core screen exists. The problems are underneath: some flows look done but do nothing, some leak revenue, and some mislead users about their money.

| Status | Discovery | Money | Account + Help | Total |
|---|---|---|---|---|
| Match | 11 | 29 | 41 | **81 (33%)** |
| Drift | 14 | 21 | 37 | **72 (29%)** |
| Partial | 7 | 13 | 31 | **51 (21%)** |
| Missing | 10 | 11 | 23 | **44 (18%)** |
| Frames | 42 | 74 | 132 | **248** |

9 of the 44 Missing frames are home mutations for other verticals (shoes, electronics, loans). They are not Cards.xtra scope.

**Build health**
- Android JS bundle: builds.
- TypeScript: 3 app errors, all typings on animation transforms (`PromoTopSheet.tsx:180`, `GreetingScreen.tsx:137,149`). Storybook adds 65 more, because its packages aren't installed and 5 story props are stale.
- Web export: fails (`@lottiefiles/dotlottie-react` is missing). The web demo backup is broken.
- Tests: none. Crash reporting: none.
- Staging APIs could not be reached from the audit sandbox, so API wiring was judged from the code.

**Docs are stale in several places.** The initial route is already `Splash`, signup is wired, and the eligibility checker calls the API. Treat `PROJECT_STATE.md` and `INTEGRATION.md` as history, and this file as current.

## 2. P0: production blockers

Each one is a revenue, legal or trust risk. None of them is visual polish.

| # | Issue | Why it matters | Where | Effort |
|---|---|---|---|---|
| 1 | **Delete account, email/mobile change and name edit are UI-only.** No write API is called, any OTP passes, and "Account deleted" only signs the user out. | Play Store requires real account deletion. Users are also told their changes saved when they did not. | `AccountDeletedScreen`, `DeleteAccountOtpScreen`, `EditContact*`, `AccountSettingsScreen` | M |
| 2 | **Click-out attribution leaks.** `withTrackingUser` leaves `id=` empty if the profile hasn't loaded. There is no click or source id. Shared links carry no tracking. A missing URL gives a dead CTA that still logs `offer_shop` / `card_apply`. | Untracked Apply and Shop clicks are lost affiliate revenue, and they become "missing cashback" tickets later. | `lib/openUrl.ts:27`, `HomeScreen.tsx:1442`, `OffersBrandAmazon.tsx:147-153,524-531` | M |
| 3 | **The eligibility verdict ignores the API and contradicts itself.** The sheet says "eligible" at income ≥ ₹50k even if CardGenius rejects the card. Home uses a different heuristic. On API failure both silently fall back to income. | Users told "eligible" get rejected by the bank. That lowers approval rate, which is what pays out. | `CardDetailSheet.tsx:496`, `HomeScreen.tsx:155` | M |
| 4 | **Rejected missing-cashback claims are hidden, and every resolved claim reads "Hurray! Cashback tracked".** | Users are told a claim succeeded when it may not have. Support load and trust. | `missingCashbackMapper.ts:331,489-491`, `useMissingCashback.ts:153` | M |
| 5 | **Client-side secrets, and no prod config.** Staging keys ship in the JS bundle (now in `.env`, still bundled). The `prod` block in `env.ts` is empty. | You cannot ship prod keys in the app. A server proxy is needed for CK Basic auth and the BK partner key. | `src/config/env.ts` | L (backend) |
| 6 | **The cashback-guard Android service needs a Play declaration.** It uses `PACKAGE_USAGE_STATS` and a `specialUse` foreground service, and polls the foreground app. | Play review can reject it, which blocks the whole release. Its tracked URLs are also still placeholders. | `modules/cashback-guard/` | S (declaration), M (real deep links) |
| 7 | **No crash reporting.** | You can't hit or even measure the crash-free target. | add Sentry or Crashlytics | S |
| 8 | **Analytics can't measure the funnel.** `card_apply` fires twice per conversion, `view_item` is missed on swipes, `share` and `withdraw_success` never fire, failed OTPs and the eligibility outcome are not logged, and there are no zero-result search events. | Without this, none of the success metrics below can be read. | `src/analytics/events.ts` and call sites | S–M |

## 3. Roadmap

| Phase | Scope | Success metric | Tradeoff |
|---|---|---|---|
| **P0: Ship-safe** (about 2 weeks + backend proxy) | Items 1–8 above. Remove dead routes (`FoundationCheck`, `Login`, `Otp`). Fix the 3 TS errors. | Crash-free sessions ≥ 99.5%. 100% of Apply/Shop click-outs carry a user id (check in Redshift exit clicks). Delete-account requests reach the backend. | It delays visible polish, but shipping without it risks a Play rejection and lost attribution from day 1. |
| **P1: Core funnel parity** (about 2 weeks) | Discovery to Apply: the pre-apply T&C sheet (missing), the Apply gate (decide whether eligibility is mandatory or skippable), tappable "Explore cards" carousels on maybe/ineligible, the empty search state, recents and trending. Offers to click-out: real coupon codes and Copy, a live upsell timer, the store-not-available / Notify Me state, tappable similar stores. A "Redirecting to…" interstitial for Apply and Shop. | Card view → Apply click rate. Offer view → Shop click rate. Lower zero-result search share. | Making eligibility skippable raises Apply clicks but may lower approval quality. Decide with data: A/B the gate. |
| **P2: Money trust** (about 2–3 weeks) | Bank transfer withdraw (the API exists). Combined balance split (UPI/Bank for cashback). Every withdraw error state (invalid UPI before OTP, server-expired OTP, email/phone mismatch). Payment History on a real API, reachable from Profile. A rejected-claim card with reasons. The "already tracked" pre-check. Invoice upload verified on staging, plus the `expo-image-picker` plugin. | Withdraw success rate. Fewer withdraw and missing-cashback Freshdesk tickets per 1k users. | More states mean more QA. Prioritise by ticket volume. |
| **P3: Polish and scale** (ongoing) | The remaining Drift items. Feedback, Review Us and Get Help topics wired. 404 and offline pages. Android card-interaction revamp (`docs/android-card-interaction-issues.md`). Storybook install. Smoke tests for login, apply and withdraw. Fix the web export. | Design QA pass rate. Store rating. | Do it after the funnel is measurable, so effort goes where drop-off is. |

## 4. Decisions needed from product

1. **Eligibility before Apply:** mandatory gate (today) or skippable (Figma)? This directly trades click volume against approval rate.
2. **OTP length:** the app uses 6 digits, Figma shows 4. Confirm with the backend and align Figma.
3. **Cashback-guard:** ship in v1 (needs a Play declaration and real app-to-app deep links from partnerships), or hold to v1.1?
4. **Server proxy owner and timeline:** this blocks the prod cutover.

## 5. Engineering notes

- Refresh-on-401 is copied into each hook. Move it to one shared fetch wrapper before adding more endpoints.
- `fcm_id` is a placeholder, so push notifications can't route. Notifications screen is static.
- Android card detail: the iOS floating-card and gyro effects are off on Android, and the expand stutters. A plan exists in `docs/android-card-interaction-issues.md`.
- Raw hex leaks: 3, all flagged (`CardTile.tsx:91`, `CardDetailMasthead.tsx:310`, `HowToGetOfferCard.tsx:41`).
- OTA via EAS Update is set up: JS-only fixes in P1–P3 can ship without a store release. P0 items 6 and 7 need a full build.

---

# Appendix: frame-by-frame audit

The three area audits follow, unedited. Each table lists Figma frame (node id), the implementing code, status, gap and effort.


## Cards.xtra — Discovery area audit vs Figma (P7UcoZYBnfyefmJIA8wcM7)

Scope: Splash/Onboarding/Login, Onboarding Mutations, Home, Other Home Mutations, Filter, Search, Card Details, details, 5a/5b, Share, Check Eligibility.
Method: Figma section screenshots + node metadata, compared against code in `/home/user/mini-app/src` (read-only). Staging APIs not reachable, so data wiring was judged from code.
Paths below are relative to `/home/user/mini-app/src/`.

### 1. Summary

| Status | Count |
|---|---|
| Match | 11 |
| Drift | 14 |
| Partial | 7 |
| Missing | 10 (9 of these are other-vertical mutations: shoes, electronics, loans) |
| **Total frames** | **42** (section "5b" has 0 frames) |

Effort: S = under 0.5 day, M = 1–2 days, L = 3 days or more.

### Doc claims checked against code (docs are stale)
- `PROJECT_STATE.md:128,203,243` says `FoundationCheck` is the initial route. **Stale.** `navigation/RootNavigator.tsx:90` has `initialRouteName="Splash"`. `FoundationCheck` is still registered (`RootNavigator.tsx:120`, a 4,333-line dev screen), but nothing navigates to it.
- `LoginScreen` and `OtpScreen` are still registered (`RootNavigator.tsx:122-123`). Neither is reachable: only `LoginScreen.tsx:108` navigates to `Otp`, and nothing navigates to `Login`. The real login is the bottom sheet inside `screens/OnboardingScreen.tsx`. This is dead code.
- The `BottomSheetBody` `_FilterMenu` stub (`organisms/BottomSheetBody.tsx:523`) is used only by `FoundationCheck.tsx:720`. Home's Filters sheet renders `organisms/FilterMenu.tsx` directly (`HomeScreen.tsx:2103`), so the stub does not affect users.
- `INTEGRATION.md:97` says the embedded eligibility checker is "console.log only". **Stale.** `CardDetailSheet.tsx:648-664` calls `fetchEligibility` and bubbles the result to `applyEligibility`. No `console.log` remains in these files.
- `INTEGRATION.md:74` says MaybeSheet suggestions are hardcoded. **Partly stale.** Cards now come from `resultCarouselCards`, the top 8 of the eligible or filtered list (`HomeScreen.tsx:1388`). The *copy* is still hardcoded (see Eligibility table).
- `INTEGRATION.md:137` says Eligible/Maybe sheets are no longer presented from Home. **Stale.** They are presented by `presentResultSheet` from Apply Now (`HomeScreen.tsx:457-470, 2153-2165`).
- The `CardDetailSheet.tsx:17-19` header says the Fee, Eligibility, Checker, FAQ, Recommended and Footer sections are "OMITTED". **Stale.** All of them render (`CardDetailSheet.tsx:1512-1590`).

### Analytics on key actions (`analytics/events.ts`; the GA4 sink is registered at `App.js:49`)
| Action | Event | Where | Gap |
|---|---|---|---|
| Card tile tap | `select_item` | `HomeScreen.tsx:994` | — |
| Card detail view | `view_item` | `HomeScreen.tsx:412` (`openCardSheet`) | Not fired when the user swipes the detail pager (`onActiveCardChange`, `HomeScreen.tsx:1974`) or taps a Recommended card (`:1983`). Those views go uncounted. |
| Apply click | `card_apply` | `HomeScreen.tsx:1046` (`redirect:false`, the intent) **and** `:1432` (`redirect:true`, the outbound) | Same event name twice per conversion. Dashboards must split on `redirect`, or apply clicks are inflated. |
| Eligibility | `eligibility_check`, `eligibility_toggle` | `HomeScreen.tsx:755, 767` | The outcome shown (eligible / maybe / ineligible) is not logged. API failures are not distinguished from real results. |
| Search | `search` | `HomeScreen.tsx:1206, 1230, 1238` | Fires only when a result or chip is selected. Typed queries and zero-result queries are not logged. `search_result_select` is defined but never fired. |
| Filter | `filter_apply`, `filter_clear`, `category_filter` | `HomeScreen.tsx:673, 714, 824` | — |
| Share | `share` (defined) | — | **Never fired.** |
| OTP | `otp_requested`, `otp_resend`, `otp_submitted`, `login`, `sign_up` | `OnboardingScreen.tsx:431, 483, 521` | `otp_submitted` is sent only with `success:true`. Wrong or failed OTP attempts are not tracked. |

---

### 2. Per-section tables

### 1- Splash / Onbording & login (section 4439:291374)
| Figma frame (node id) | Code (file:line or route) | Status | Gap | Effort |
|---|---|---|---|---|
| Splash, named "onboarding_1" (6893:32730) | `screens/SplashScreen.tsx` (route `Splash`, initial) | Match | Lottie version of the static frame. Routes to `MainTabs` if already authenticated, otherwise `Onboarding` (`:49`). | — |
| onboarding_1 (6893:27353) | `screens/OnboardingScreen.tsx:118-139` (slide-1) | Drift | Headline matches. Pager is story-style timed progress bars (`<Indicator>` `:736`) instead of Figma's dots. Hero is Lottie, not the static photo. | S |
| onboarding_2 (6893:27366) | same, slide-2 | Drift | Same indicator difference. Copy matches. | S (shared) |
| onboarding_3 (6893:27390) | same, slide-3 | Drift | Same indicator difference. Copy matches ("1500+ Brands"). | S (shared) |
| auth/login/enter-mobile (1929:31023) | `OnboardingScreen.tsx` login sheet, phone panel (`:838-928`) | Drift | Title is "Log in or Sign up", which matches the newer 6851 frame, not this one ("Log in / Sign up"). Field label is "Mobile Number" (Figma: "Number"). The "Terms & Conditions" and "Privacy Policy" links have no `onPress` (`:914-927`), even though a `PrivacyPolicy` route exists. | S |
| auth/login/enter-otp (1929:31043) | `OnboardingScreen.tsx` OTP panel (`:930-1028`) | Drift | 6 OTP boxes (`OTP_LENGTH = 6`, `:356`) vs 4 in Figma. CTA reads "Verify OTP" (Figma: "Submit"). Subtitle reads "OTP sent on +91 …" (Figma: "Sent to …"). The 30 s resend timer, wrong-OTP state (`OtpInput state='error'` plus the API message, `:988-1004`) and "Change" link are all implemented. Figma needs updating to 6 digits, or the code changed. | S |

### 1- Onbording & login (section 6851:26617)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| auth/login/enter-mobile (6851:26627) | `OnboardingScreen.tsx:838-928` | Drift | Title matches. Label "Mobile Number" vs "Label" (Figma placeholder). T&C and Privacy links are not tappable. API errors show as red text under the CTA; Figma has no frame for that state. | S |
| auth/login/enter-otp (6851:26640) | `OnboardingScreen.tsx:930-1028` | Drift | Same as 1929:31043: 6 vs 4 boxes, "Verify OTP" vs "Submit", subtitle copy. | S (shared) |

### Onboarding Mutations (section 6905:28408) — other verticals
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| Frame 1991634770 (6905:28138) Shoes slide 1 | — | Missing | Shoes-vertical onboarding (yellow theme). Not part of Cards.xtra; confirm whether in scope. | L (per vertical) |
| Frame 1991634771 (6905:28165) Shoes slide 2 | — | Missing | as above | (shared) |
| Frame 1991634772 (6905:28179) Shoes slide 3 | — | Missing | as above | (shared) |
| Frame 1991634773 (6905:28255) Electronics slide 1 | — | Missing | Electronics-vertical onboarding (purple). | L (per vertical) |
| Frame 1991634774 (6905:28282) Electronics slide 2 | — | Missing | as above | (shared) |
| Frame 1991634775 (6905:28296) Electronics slide 3 | — | Missing | as above | (shared) |

### 2- Home page (section 4439:291375)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| home/landing (1929:31104) | `screens/HomeScreen.tsx` (tab `Home`): `<Masthead>` `:1547`, FilterBar, CardTiles, CategoryTiles, Footer | Partial | Live catalog via `useCards`, with skeleton, error/retry (`:1757`) and no-results (`:1797`) states. But the notification badge is hardcoded `notificationCount={1}` (`:1549, :1945`), and `onMessagePress={() => undefined}` (`:1554`). The hero is a baked video (`assets/videos/home-hero.mp4`), so the hero copy can't be edited. | S |
| home/scrolled (1929:32667) | `HomeScreen.tsx` frosted header (`FROSTED_HEADER_*` `:123`), `organisms/HomeHeader.tsx` | Match | Logo, search icon and filter chips on the frosted bar. | — |
| home/scrolled-header-overlap (3609:169776) | same | Match | — | — |
| home/with-eligibility-filter (3914:38992) | `HomeScreen.tsx:1302-1340` (`groupedRows`), `SectionRule` `:175` | Drift | (1) Figma's dark summary pill under the filter bar ("144000 · ₹1.2L · Salaried · Edit") is replaced by a small pencil box next to the toggle (`:1670-1690`). (2) Ineligible and Maybe tiles still render the normal Apply Now fee strip; Figma shows a muted strip with "View Details" instead. (3) Groups are ordered Eligible / Maybe / Ineligible (Figma: Eligible / Ineligible / Maybe). (4) Maybe vs Ineligible is a client-side guess (`classifyEligibility` `:155`, an income tier guessed from the fee), not backend data. | M |

### Other Home Mutations (section 6893:32747)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| Home/cards (6893:30979) | `HomeScreen.tsx` | Match | "Search by card name" placeholder (`Masthead.tsx:141`). LIFETIME FREE and with-fees strips come from `deriveFeeType` (`api/cardMapper.ts:157`). "Flat/Upto ₹X Cashback" badge. | — |
| Home/loans (6893:29939) | — | Missing | Loans vertical. Not Cards.xtra. | L |
| Home/shoes (6893:30051) | — | Missing | Shoes vertical (2-col product grid, Brand/Sort chips). | L |
| Home/electronics (6893:30552) | — | Missing | Electronics vertical. | L |

### 3- Filter (section 4439:291376)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| filters/category (1791:4029) | `organisms/FilterMenu.tsx:258` in a gorhom sheet at `HomeScreen.tsx:2090-2117`; options in `data/filterOptions.ts:23` | Drift | Helper text says "Select one category to apply for." (`FilterMenu.tsx:354`), but the tiles are multi-select. There are 7 tiles (adds Bills) vs 6 in Figma. The footer caption strip shows a live "N filters selected" count. | S |
| filters/annual-fee (1929:32761) | `FilterMenu.tsx`, `ANNUAL_FEE_BUCKETS` `filterOptions.ts:46` | Match | All 5 buckets and copy match. | — |
| filters/card-network (2158:13541) | `FilterMenu.tsx`, `NETWORK_OPTIONS` `filterOptions.ts:33` | Match | Visa, Mastercard, RuPay, American Express, Diners Club. | — |
| filters/banks (2158:13647) | `FilterMenu.tsx`, `bankOptions` built from the catalog (`HomeScreen.tsx:527-534`) | Match | Bank list comes from live data, sorted A–Z. Filtering is client-side (`applyFilters`). Clear and Apply are tracked. | — |

### 4- Search (section 4439:291377)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| search/suggestions (1985:36934) | `organisms/SearchTopSheet.tsx:108` (empty-query branch `:309-314`); chips from `HomeScreen.tsx:1145` | Partial | Chips are generated (top 3 banks plus the top card), not real recent searches or trending items. Figma shows a history icon and a "trending" chip. Nothing is persisted, so there is no recent-search history. | M |
| search/on-typing (1985:36947) | `SearchTopSheet.tsx:294-308`, sections from `HomeScreen.tsx:1175-1198` | Partial | Banks and Cards sections are implemented. The bank row subtitle is a stand-in (the bank's top card cashback, `HomeScreen.tsx:1121-1135`), not the bank's cashback range. **Zero results render nothing** (`SearchTopSheet.tsx:314` returns `null`), even though Figma has a "Cards search / No result" frame (4367:243584, in the transition pages section). No search analytics fire until a result is tapped. | S–M |

### 5- Card Details (section 4439:291378)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| card-details/bottomsheet (4157:59277) | `organisms/CardDetailSheet.tsx`, `CardDetailSheetIOS` (75% → 100% snap), presented from `HomeScreen.tsx:1964` | Drift | Matches on iOS. Android uses `CardDetailScreenAndroid` (`CardDetailSheet.tsx:2570-2577`), which opens full screen directly with no half-sheet. Intentional for performance, but it differs from Figma. | S (product decision) |
| card-details/on-scroll (4157:59278) | `CardDetailMasthead` collapsing hero plus `MastheadHeader` | Match | — | — |
| card-details/full-page (3914:43655) | `CardDetailSheet.tsx:1352-1590`, mirrored in `CardDetailScreenAndroid.tsx:382-427` | Drift | Present and live: benefits grid, View all benefits, Best for spending (card tags), Fee section (`card.detail.fee`), Eligibility table (`eligibilityRows`, `cardMapper.ts:213`), embedded checker (live API), Recommended, Footer. **Missing:** the bank promo-banner carousel (e.g. "Lifetime Free Rupay Card") and "Still have question? Chat Now". FAQ is 4 hardcoded generic credit-card questions (`CardDetailSheet.tsx:805-826`), not per card. Footer subtext reads "Apply now and get cash back" (`:1589`); Figma says "Apply now and earn cashback." | M |
| Card_Details/View all benefits (5874:26478) | `screens/AllCardBenefitsScreen.tsx:53` (route `AllCardBenefits`, `useCardBenefits`) | Match | Live tabs and benefit list, loading, error and empty states, "Go back to card details". The sheet reopens on return. | — |

### details (section 5873:26731)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| Card_Details/Full_Page (5873:27486), "All Card Benefits" page | `screens/AllCardBenefitsScreen.tsx` | Match | — | — |
| Learn how it works (5873:27824), full-page list + "Go back to card details" | `organisms/HowItWorksSheet.tsx:185`, opened at `HomeScreen.tsx:1987, 2048` | Drift | Built as a centred modal (from newer Figma node 6173:12529), not this full page. Steps are static `DEFAULT_STEPS` (`HowItWorksSheet.tsx:108`); Home passes only the image and reward value, so the content is the same for every card. | M |
| Card_Details/Full_page (5873:27578), "All Terms & Conditions" sheet: Cashback Timelines (36 h / 35 days / UPI-Bank), Key Terms, Important Reminders, "Accept & Continue ↗" | — | **Missing** | No pre-apply terms screen in code (no "Key Terms", "Important Reminders" or "Accept & Continue" anywhere). Apply goes straight from the eligibility result sheet to the bank (`applyOutbound`, `HomeScreen.tsx:1429`), so users never see the cashback-tracking terms. | M |

### 5a - Card eligibility visible on details page, sticky footer (section 4439:291873)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| card-details/default-v1 (3914:38782), eligible strip + Apply Now | `EligibilityFooterStrip`, `CardDetailSheet.tsx:549`, above the pinned Apply bar | Match | "Congrats! You're eligible for this card." plus Edit. | — |
| card-details/default-v2 (3914:38887), maybe strip + "Visit Bank Site" / "More Cards" | same | Drift | Copy reads "You might qualify for this card." (Figma: "You might be eligible for the card."). The footer keeps a single Apply Now CTA; Figma's two buttons, "Visit Bank Site" (outline) and "More Cards" (primary), are not built. | S–M |

### 5b - Card eligibility visible on details page, scroll (section 4439:291874)
Section has 0 frames. Nothing to audit.

### 6 - Share card (section 4439:291379)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| card-details/share-sheet (1951:33843) | `organisms/ShareSheet.tsx:359`, opened at `HomeScreen.tsx:1997-2040` | Partial | Visually matches ("Found on CashKaro", card, badge, subtitle, footer line). But the WhatsApp, Instagram, Facebook and More tiles are plain `View`s with no `onPress` (`ShareSheet.tsx:121-176, 312-318`); only the "Share" CTA works, through the OS share sheet. The share message has **no link** (no deep link, referral or apply URL; `:189-191`), so a share cannot bring anyone back. The `share` analytics event is never fired. | S–M |

### 7- Check Eligibility (section 4439:291380)
| Figma frame | Code | Status | Gap | Effort |
|---|---|---|---|---|
| card-details/eligibility/empty (2917:67207) | `organisms/EligibilityCheckerSheet.tsx` at `HomeScreen.tsx:2123`; embedded version `CardDetailSheet.tsx:622` | Drift | CTA reads "Check Eligibility" (`:371, :383`; Figma: "Check Now"). Income placeholder reads "Enter your monthly income". PIN validation error state and "Clear" for saved details are present. **No API error state:** on failure the result falls back to income-only, or 0 eligible cards (`:315-327`; `CardDetailSheet.tsx:662`), with no message to the user. | S |
| card-details/eligibility/eligible (2917:67212) | `organisms/EligibleSheet.tsx:134` (single-card mode, `HomeScreen.tsx:2215`) | Partial | Visually matches (green masthead, card, "₹X Rewards", Apply Now, Edit pill). **The verdict is not driven by the API:** `resolveCardOutcome` (`CardDetailSheet.tsx:496-505`) returns `eligible` whenever monthly income is ₹50k or more, even if CardGenius marked the card not eligible. | M |
| card-details/eligibility/may-be-eligible (2917:67222) | `organisms/MaybeSheet.tsx`, `EligibilityMasthead` variant `maybe` (`EligibilityMasthead.tsx:482-525`) | Partial | Cards come from data now (top 8 of the eligible or filtered list). But `infoText` is hardcoded to "salaries above ₹50,000/month" for every card (`EligibilityMasthead.tsx:521`). Carousel cards can't be tapped (`CardCarousel` takes `onCardPress`; Maybe and Ineligible sheets don't pass it), so "Explore N cards" leads nowhere. The trailing copy "that you are eligible for you!" is ungrammatical and copied verbatim from Figma. | M |
| card-details/eligibility/not-eligible (3762:85818) | `organisms/IneligibleSheet.tsx`, `EligibilityMasthead` variant `ineligible` (`:707-725`) | Partial | The `reasons` prop is never passed (`HomeScreen.tsx:2274-2282`), so **every** ineligible user sees the hardcoded "Your pin code is not serviceable" and "Salary is below the required amount" (`EligibilityMasthead.tsx:717-720`), whether or not they apply. The carousel can't be tapped. "Continue to Apply" still sends an ineligible user to the bank (matches Figma, but wastes a lead). | M |

---

### 3. Extras (in code, no Figma frame in this area)
| Code | Notes |
|---|---|
| `screens/NameInputScreen.tsx`, `screens/GreetingScreen.tsx` (routes `NameInput`, `Greeting`) | Name capture and greeting after signup. Signup fills in a random name, a dummy email and a random password behind the scenes (`OnboardingScreen.tsx:503-511`). No Figma frame. |
| `organisms/EligibleSheet.tsx` "cards" mode (`HomeScreen.tsx:2199`) | Toggle path: fanned card stack, "Congrats! You're eligible for N cards", "Great, Show Cards". No Figma frame. |
| `organisms/FilterTransitionOverlay.tsx`, `FilterBarSkeleton`, category-fetch skeletons (`HomeScreen.tsx:200, 575-606`) | Animated "redirect" overlay on Apply Filter. The 900 ms category "fetch" is a fake timer (`CATEGORY_FETCH_MS`); no request is made. |
| Active-bank banner with Clear (`HomeScreen.tsx:1278-1292`) | Shown when a bank filter is applied from search. |
| Home error/retry and "No cards match your filters" (`HomeScreen.tsx:1757, 1797`) | Good corner states with no Figma frame. |
| `organisms/CardDetailScreenAndroid.tsx` | Separate Android full-screen detail pager. |
| `NeverMissCashbackNudge` on Home (`HomeScreen.tsx:1563`) | Post-order nudge (Android). |
| `screens/FoundationCheck.tsx` (route registered) | Dev token-verification screen. Dead in production; delete or gate behind `__DEV__`. |
| `screens/LoginScreen.tsx`, `screens/OtpScreen.tsx` (routes registered) | Unreachable duplicates of the login sheet. Delete. |
| `BottomSheetBody` `'filters'` template stub (`BottomSheetBody.tsx:523`) | Used only by FoundationCheck. Delete with it. |

---

### 4. Top 5 issues (ranked by funnel and revenue impact)

1. **The eligibility verdict ignores the API and contradicts itself.** (Partial, M)
   - `resolveCardOutcome` (`organisms/CardDetailSheet.tsx:496`) shows "Congrats! You're eligible" whenever income is ₹50k or more, even if CardGenius rejected the card.
   - The Home grouped list uses a different heuristic (`classifyEligibility`, `screens/HomeScreen.tsx:155`, which compares against a fee-tier income). The same card can be listed under "Ineligible Cards" on Home and get a green "eligible" sheet on Apply.
   - On API failure both checkers silently fall back to income-only.
   - Ineligible reasons are hardcoded (`EligibilityMasthead.tsx:717`).
   - Result: users told they're eligible get rejected by the bank, which hurts trust and approval rate, which is what drives affiliate payout. Fix: make the API the only source of truth, use one shared classifier, and add an error state.

2. **Apply Now is gated behind a mandatory eligibility form, and the click is dropped if the user dismisses it.** (Drift, S–M; product decision)
   - The first Apply tap always opens the pincode/income checker (`HomeScreen.tsx:1057-1061`).
   - Closing it clears `applyPendingCard` (`:2131-2139`) and never opens the bank.
   - Figma's card detail and 5a frames show Apply Now going straight through.
   - Attribution is also fragile. `withTrackingUser` (`lib/openUrl.ts:27`) leaves `id=` empty if `useProfile` hasn't loaded, so the click is unattributed. A missing `applyUrl` makes Apply a silent no-op (`openUrl.ts:11`).
   - This is the highest-value click in the app. Confirm the gate is intended; otherwise allow skip-to-apply.

3. **The pre-apply "All Terms & Conditions / Accept & Continue" sheet is missing.** (Missing, M; Figma 5873:27578)
   - Users go to the bank without seeing the cashback timelines, the "resume via CashKaro" rule, the 30-day missing-rewards window or the KYC conditions.
   - Expect more untracked applications and missing-cashback tickets.

4. **Analytics gaps across the funnel.** (S–M)
   - `card_apply` fires twice per conversion under one name (`HomeScreen.tsx:1046` intent, `:1432` outbound).
   - `view_item` is not fired on pager swipes or Recommended taps.
   - `search` fires only on selection; there are no query or zero-result events, and `search_result_select` is unused.
   - `share` is never fired.
   - Failed OTPs are not tracked.
   - The eligibility outcome shown to the user is not logged.
   - Funnel conversion (view → eligibility → apply) can't currently be measured reliably.

5. **Dead ends in the recovery paths.** (Partial, M)
   - Maybe and Ineligible sheets show "Explore N Cards" carousels that can't be tapped (no `onCardPress`).
   - Search with zero results shows a blank panel (`SearchTopSheet.tsx:314`), even though a "No result" frame exists in Figma.
   - Search suggestions are synthetic: no recents, no trending.
   - The maybe-state footer lacks the "More Cards" CTA (5a default-v2).
   - Each of these is where a user who didn't find or qualify for a card should be steered to an alternative card (another chance at an Apply click), and right now they hit a dead end.

Lower priority: share has no link and its social tiles do nothing; the "Learn how it works" content is static; FAQ is generic; the promo-banner carousel and Chat Now are missing; the OTP is 6 digits vs 4 in Figma (align Figma); the T&C and Privacy links on login are not tappable; dead routes (`FoundationCheck`, `Login`, `Otp`) and stale docs.


## Cards.xtra — MONEY area audit (Offers, Brand pages, Earnings, Withdraw, Payment History)

Figma file `P7UcoZYBnfyefmJIA8wcM7`, sections 8–15 and 17. Code: `/home/user/mini-app/src`. I read the code only and did not modify it. Staging APIs could not be reached from the sandbox, so I judged data wiring from the code. Paths below are relative to `src/`.

### 1. Summary

| Status | Count |
|---|---|
| Match | 29 |
| Drift | 21 |
| Partial | 13 |
| Missing | 11 |
| **Total frames** | **74** |

| Section | Frames | Match | Drift | Partial | Missing |
|---|---|---|---|---|---|
| 8 Offers Page | 1 | 1 | 0 | 0 | 0 |
| 9 Offer Details pages | 8 | 2 | 4 | 1 | 1 |
| 10 Offer-detail bottom sheets | 5 | 5 | 0 | 0 | 0 |
| 11 Earnings Day 0 | 5 | 3 | 1 | 0 | 1 |
| 12 Earnings Dn Pending | 5 | 2 | 2 | 1 | 0 |
| 13 Withdraw happy path | 20 | 5 | 7 | 4 | 4 |
| 14 Withdraw corner cases | 17 | 7 | 3 | 2 | 5 |
| 15 Cashback + Rewards | 9 | 4 | 4 | 1 | 0 |
| 17 Payment History | 4 | 0 | 0 | 4 | 0 |

### Doc claims checked against the code
- PROJECT_STATE.md calls `WithdrawTerms` a "Static UPI T&C" **stub**. That is stale: it now carries all four method variants (`screens/withdraw/termsContent.ts`).
- PROJECT_STATE.md says "Orphans: none — every screen file is registered". The Payment History screens are registered, but **nothing navigates to them**. The Profile menu item has no action (`screens/ProfileScreen.tsx:149-150`, `onMenu('payment_history')` with no callback).
- `OffersBrandAmazon` is called "slug-driven, live". This is true for the data fields. Several floors still render hardcoded Amazon/mcaffeine sample copy for every store (details in section 9).
- FIGMA_RECONCILE.md lists the ProfilePaymentHistoryDetails Excel/PDF handlers as no-op stubs. They now show a "Preparing your Excel…" toast, but there is still no export (`screens/ProfilePaymentHistoryDetails.tsx:110-115`).
- `api/payments.ts:259` has `submitBankPayment`. No UI calls it.

---

### 2. Tables per section

### 8 — Offers Page

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| offers/landing (1791:3655) | `screens/OffersScreen.tsx` (Offers tab, `navigation/TabNavigator.tsx`) | Match | Live categories and stores (`useOfferCategories`, `useCategoryOffers`). Sticky category strip and 2-up "Shop & Earn" grid match the design. Search overlay, per-category tint and welcome promo are code-only additions (see Extras). | — |

### 9 — Offer Details pages (brand pages)

There is one screen for every store: `screens/OffersBrandAmazon.tsx`, route `OffersBrandAmazon {slug, hasCoupons, category}` (`navigation/RootNavigator.tsx:149`). It is slug-driven through `useOfferStore(slug)`. These gaps apply to **every** variant:
- **Similar Store** always shows the static default stores, and tapping one does nothing (`OffersBrandAmazon.tsx:460-464`, `onStorePress={noop}`; defaults in `organisms/StoreSimilarStore.tsx:53-60`).
- **Did You Know?** always shows 3 static images (`OffersBrandAmazon.tsx:90-94`).
- **About Brand "View More"** expands in place. `onViewMore` is a no-op.

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| offers/brand/mcaffeine (3832:31481) | OffersBrandAmazon (slug) | Drift | The offer block is hardcoded for all stores: `offerText="Upto 90% Off across categories"` and `seeDetailsLabel="See +5 Offers"` (`OffersBrandAmazon.tsx:420-422`). Figma shows each store's own offer line. Shared static Similar Store and Did You Know. | S |
| offers/brand/tata-1mg (3832:31503) | same | Drift | Coupon stores show the **wrong code**. `StoreOfferDetails` is rendered without a `code` prop, so every coupon store shows the default "MCCK300" (`organisms/StoreOfferDetails.tsx:45`) instead of e.g. 1MGNEW. "Copy Code" has no `onCopyCode`, so tapping it does nothing. The offer line is also hardcoded (see above). The mapper never extracts coupon codes. | M |
| offers/brand/medibuddy (3832:31525) | same | Drift | Figma shows the coupon/offer block **and** the "Benefits" list together. Code renders one or the other (`showBenefits ? … : showOfferDetails ? …`, `OffersBrandAmazon.tsx:407-427`). The coupon code bug above also applies. | S |
| offers/brand/sbi-card (3832:31549) | same | Match | Benefits list, How-to, timelines, T&C card and FAQ (`StoreFaq`, shown only when the store has FAQ data) all render. Only minor: Did You Know always renders, but Figma omits it here. | — |
| offers/brand/upsell-timer (3832:31569) | same, `StoreCashbackDetails bonusOffer` | Partial | The bonus card appears when `cashback_upsell_button_text` exists (`api/offersMapper.ts:290,349`), but: (1) the **timer is static "01:23:59"**. No `timerValue`/`targetTime` is passed (`OffersBrandAmazon.tsx:389-399`; default in `organisms/StoreCashbackDetails.tsx:83`), and the mapper reads no end-time field, so it never counts down or expires. (2) The sub-line is hardcoded "on order over ₹150 once per user" (`StoreCashbackDetails.tsx:82`). (3) The bonus value is the API *button text*, not a structured amount. | M |
| offers/brand/amazon (3832:31590) | same (no-slug fallback is Amazon data) | Match | The hardcoded offer strings happen to equal the Amazon design. Shared static Similar Store and Did You Know. | — |
| offers/brand/magzter (3832:31612) | same | Drift | Figma shows the T&C floor as a bullet **list view**. Code always uses `property1="Card View"` (`OffersBrandAmazon.tsx:443-448`). The hardcoded offer-line issue also applies when the block is shown. | S |
| offers/brand/store-not-available (3832:31632) | — | Missing | There is no "No Cashback on this brand!" hero, no "We'll notify you when cashback is available" + **Notify Me** strip, and no handling for a store without cashback. With no `cashbackUrl`, the footer CTA still reads "Earn Cashback on X". Tapping it fires `offer_shop`, then `openUrl` silently does nothing (`lib/openUrl.ts:9-12`). | M |

### 10 — Offer-detail bottom sheets

All five use the shared `organisms/BottomSheet` inside OffersBrandAmazon (`presentSheet`, `OffersBrandAmazon.tsx:168-321`).

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| bottomsheet/rewards-rate (3834:43408) | `openRewardRates` → `rate-list` (`:251-264`) | Match | Live `rewardRates`. Title switches Cashback/Reward by store kind. | — |
| bottomsheet/terms-conditions (3834:44263) | `openTerms` → `terms-list` (`:267-279`) | Match | Live terms bullets. | — |
| bottomsheet/rewards-on-app-order (3834:44318) | `openAppOrdersInfo` (`:190-207`) | Match | Eligible and not-eligible copy, with illustration and "Ok, Got It". | — |
| bottomsheet/rewards-tracking-timeline (3834:44606) | `openTrackingInfo` (`:208-221`) | Match | Uses the store's live tracking time. | — |
| bottomsheet/rewards-confirmation-timeline (3834:50923) | `openConfirmationInfo` (`:222-235`) | Match | Uses the store's live confirmation time. | — |

### 11 — Earnings, Day 0

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| earnings/day-0/no-earnings (3609:170274) | `screens/EarningsScreen.tsx` (Earnings tab) | Drift | Live data, so zero balances render correctly. Differences: (1) Figma has a "← Request Payment" header; code has none (it is a tab). (2) Code adds a third "Paid / View" row that is not in Figma. (3) The **Get Help row does nothing** (`EarningsScreen.tsx:277-282`), although a `GetHelp` route exists. | S |
| day-0/bottomsheet/no-cashback (2898:164825) | — | Missing | There is no "No Cashback Yet! You haven't shopped via Cards.xtra…" sheet. With ₹0 total, Withdraw always opens `CashbackNotConfirmedSheet` (`EarningsScreen.tsx:129-131`), which reads "You have ₹0.0 pending". That is wrong for a new user. | S |
| day-0/bottomsheet/earning-status (2898:164842) | `organisms/EarningStatusSheet.tsx` | Match | Opened from "Know Why?". | — |
| day-0/bottomsheet/cashback-status (2898:166440) | `organisms/EarningsBreakupSheet.tsx` (variant cashback) | Match | Live confirmed, pending and paid amounts. Code renames the third legend label to "Paid Cashback" (Figma typo). | — |
| day-0/bottomsheet/rewards-breakup (2898:166445) | EarningsBreakupSheet (variant rewards) | Match | At Day 0 every value is ₹0, as designed. | — |

### 12 — Earnings, Dn, Withdrawable, Cashback Pending

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| day-n-pending/bottomsheet/cashback-status (3614:171124) | EarningsBreakupSheet cashback | Match | — | — |
| day-n-pending/bottomsheet/rewards-breakup (3614:171126) | EarningsBreakupSheet rewards (`EarningsScreen.tsx:297-303`) | Partial | Rewards pending and paid are **hardcoded "₹0.0"**. Only the confirmed amount is live. | S |
| day-n-pending/landing (3614:171494) | EarningsScreen | Drift | Same as the Day 0 landing: no header, extra Paid row, Get Help does nothing. The "Confirmed" row shows confirmed + rewards combined (`:202`), but Figma labels it confirmed cashback. | S |
| day-n-pending/bottomsheet/cashback-not-confirmed (2898:166460) | `organisms/CashbackNotConfirmedSheet.tsx` | Drift | Copy and layout match. The stopwatch-and-cash illustration is an **emoji placeholder ⏱️** (`CashbackNotConfirmedSheet.tsx:107-121`). | S |
| day-n-pending/bottomsheet/earning-status (2898:166477) | EarningStatusSheet | Match | — | — |

### 13 — Withdraw happy path (Withdrawable, cashback confirmed)

These gaps hit every OTP frame:
- **OTP length:** code uses a 6-box OTP (`screens/withdraw/WithdrawVerifyOTP.tsx:50`); Figma uses 4 boxes. 6 may be the backend's real format; if so, Figma should be updated.
- **Masthead sub-line:** it is hardcoded "Cashback Available For Payment" on the UPI, Amazon, Flipkart and OTP screens, even in the rewards flow (`WithdrawVerifyOTP.tsx:180`, `WithdrawAmazon.tsx`, `WithdrawFlipkart.tsx`, `WithdrawEnterUPI.tsx:212`).

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| day-n-confirmed/bottomsheet/rewards-breakup (2898:165012) | EarningsBreakupSheet rewards | Partial | Pending and paid are hardcoded ₹0.0. | S |
| day-n-confirmed/landing (3614:171647) | EarningsScreen | Drift | Same as the Day 0 landing. Withdraw gating works: payment in process → `PaymentProcessingSheet`, ₹0 → NotConfirmed sheet, otherwise → `WithdrawStack` (`EarningsScreen.tsx:114-135`). | S |
| withdraw/upi/success (2898:165272) | `screens/withdraw/WithdrawSuccess.tsx` (`WithdrawSuccess`) | Partial | Copy matches. The **success GIF is a TODO**: a static check-circle stands in (`WithdrawSuccess.tsx:83-109`). The `withdraw_success` event is never fired. | S |
| withdraw/flipkart-gift-card/payment-initiated (2898:165289) | WithdrawSuccess (method flipkart) | Partial | Copy matches. Same placeholder graphic. | S |
| withdraw/upi/enter-upi-filled (3248:12758) | `WithdrawEnterUPI` | Match | T&C checkbox gates "Get Paid". The OTP is sent on submit. | — |
| withdraw/flipkart-gift-card/verify-otp (3277:14432) | `WithdrawVerifyOTP` (busy overlay) | Drift | 6 vs 4 digits; wrong sub-line. | S |
| withdraw/flipkart-gift-card/enter-otp (3277:14192) | WithdrawVerifyOTP | Drift | 6 vs 4 digits; wrong sub-line. | S |
| withdraw/amazon-pay/enter-otp (3277:14619) | WithdrawVerifyOTP | Drift | 6 vs 4 digits. | S |
| day-n-confirmed/bottomsheet/cashback-status (2898:166495) | EarningsBreakupSheet cashback | Match | — | — |
| withdraw/method-select (3248:12501) | `screens/WithdrawScreen.tsx` (`WithdrawMethodSelect`) | Drift | Figma has 4 rows: UPI, Bank Transfer, **Amazon Pay Balance**, **Flipkart Gift Card**. Code merges the last two into one "Amazon / Flipkart Gift Card" row that opens an extra chooser (`WithdrawGiftCard` variant cashback), which has no Figma frame. **Bank Transfer row has no `onPress` and does nothing** (`WithdrawScreen.tsx:223-230`). Header and section heading differ. | S |
| withdraw/upi/enter-upi-empty (3248:12580) | WithdrawEnterUPI | Match | — | — |
| withdraw/flipkart-gift-card/enter-email (3277:13812) | `WithdrawFlipkart` | Match | Email + confirm fields, Note box, T&C. | — |
| withdraw/amazon-pay/enter-phone (3277:14556) | `WithdrawAmazon` | Match | Mobile + re-enter fields, Note box, T&C. | — |
| withdraw/upi/verify-otp-empty (3248:13095) | WithdrawVerifyOTP | Drift | Figma keeps the "Enter Your UPI ID" context on the OTP step; code is a separate "Verify Using OTP" screen with 6 boxes. | S |
| withdraw/upi/verifying-otp (3277:13203) | WithdrawVerifyOTP (`busy` spinner + input block) | Drift | Behaviour matches; only the digit count differs. | S |
| withdraw/bank-transfer/enter-account (3277:14833) | — | Missing | No bank screen exists (Account Holder Name, Account No, Re-enter Account No, IFSC). The API helper exists (`api/payments.ts:259`). | M |
| withdraw/bank-transfer/account-filled (3277:14896) | — | Missing | (part of the bank screen) | (incl. above) |
| withdraw/amazon-pay/payment-initiated (2898:167062) | WithdrawSuccess (method amazon) | Partial | Copy matches; placeholder graphic. | S |
| withdraw/bank-transfer/payment-initiated (2898:167079) | — | Missing | `successCopy` for `bank` falls through to the UPI "withdrawn Successfully!" copy (`WithdrawSuccess.tsx:63-69`). Figma says "Bank Payment Initiated". | S |
| withdraw/bank-transfer/verify-otp (3277:15196) | — | Missing | The shared OTP screen has no `bank` branch: `verifyAndPay` handles only upi, amazon and flipkart (`WithdrawVerifyOTP.tsx:107-113`). | S |

### 14 — Withdraw corner cases

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| withdraw/upi/wrong-upi (3283:49404) | WithdrawEnterUPI `looksLikeUpi` (`:156,171-174`) | Partial | The inline error copy matches, but only for malformed input (`x@y` shape). A UPI ID the **server rejects is caught only after the user enters the OTP**, as a generic "Payment failed" alert (`WithdrawVerifyOTP.tsx:121-125`). No pre-validation, no inline state. | M |
| withdraw/flipkart-gift-card/otp-expired (3283:52625) | WithdrawVerifyOTP | Drift | "Expired" is just the client-side **30s resend timer** running out (`:51,69-77`), not the server's OTP expiry. An expired OTP the server rejects shows "Enter a valid OTP" (`:97-101`). Network errors also show "Enter a valid OTP" (`:91-95`). | S |
| withdraw/flipkart-gift-card/wrong-otp (3283:52359) | WithdrawVerifyOTP | Match | "Enter a valid OTP" with haptic. | — |
| withdraw/amazon-pay/otp-expired (3283:53288) | WithdrawVerifyOTP | Drift | Same as the Flipkart expiry row. | (shared) |
| withdraw/bank-transfer/otp-expired (3283:53556) | — | Missing | No bank flow. | (in bank M) |
| withdraw/amazon-pay/invalid-otp (3283:53155) | WithdrawVerifyOTP | Match | — | — |
| withdraw/bank-transfer/wrong-otp (3283:53423) | — | Missing | No bank flow. | (in bank M) |
| withdraw/flipkart-gift-card/emails-dont-match (3283:52088) | WithdrawFlipkart | Missing | No inline error on Confirm Email. The button is just disabled (`WithdrawFlipkart.tsx:63`, inputs `:117-136` have no `state`/`hint`). | S |
| withdraw/upi/wrong-otp (3283:50761) | WithdrawVerifyOTP | Match | — | — |
| withdraw/upi/otp-expired (3283:51654) | WithdrawVerifyOTP | Drift | Same as the Flipkart expiry row. | (shared) |
| withdraw/upi/terms-conditions (2898:166743) | `WithdrawTerms {variant:'upi'}` | Match | — | — |
| withdraw/flipkart-gift-card/invalid-email (3283:51858) | WithdrawFlipkart | Missing | `EMAIL_RE` silently gates the button; there is no inline "Invalid Email" state. | S (with above) |
| withdraw/flipkart-gift-card/terms-conditions (2898:166825) | WithdrawTerms flipkart | Match | — | — |
| withdraw/amazon-pay/terms-conditions (2898:166847) | WithdrawTerms amazon | Match | — | — |
| withdraw/bank-transfer/terms-conditions (2898:166869) | WithdrawTerms bank (`termsContent.ts:71`) | Partial | The content is built but unreachable: no bank flow links to it. | — (comes with bank flow) |
| withdraw/amazon-pay/invalid-phone (3283:52824) | WithdrawAmazon | Missing | No inline "invalid mobile number" error on the first field. The button is just disabled until `/^\d{10}$/` passes. | S |
| withdraw/amazon-pay/phones-dont-match (3283:52956) | WithdrawAmazon `confirmMismatch` | Match | Shows the inline "Mobile numbers do not match" error. | — |

### 15 — Cashback & Rewards Confirmed (combined)

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| withdraw/combined/method-select (3277:41973) | WithdrawScreen | Drift | Figma shows **all three sections at once** (Cashback, Rewards, Cashback + Reward). Code shows **only one** bucket: combined when both balances are positive (`WithdrawScreen.tsx:199-203`). A user with both balances therefore **cannot withdraw just the cashback via UPI/Bank**. Header reads "Withdraw Cashback"; Figma reads "Request Payment". Figma puts UPI rows under Rewards/Combined, which contradicts its own gift-card-only tooltip. Code uses gift-card rows; product should confirm. | M |
| combined/method-select-cashback-tooltip (3297:16873) | WithdrawScreen `SectionHeading` + `Tooltip` | Drift | The tooltip and copy exist, but they are reachable only for cashback-only users, never on the combined screen Figma shows. | (in above) |
| combined/method-select-reward-tooltip (3297:16541) | same | Drift | Reachable only for rewards-only users. | (in above) |
| combined/method-select-combined-tooltip (3297:16707) | same | Match | Copy matches; tap-anywhere dismiss works. | — |
| combined/withdraw-as-reward (3297:17039) | `WithdrawGiftCard` variant rewards | Match | Amazon Pay Balance and Flipkart rows lead to the detail screens. | — |
| combined/withdraw-total-as-reward (3297:17101) | WithdrawGiftCard variant combined | Match | — | — |
| earnings/cashback-and-rewards/landing (3614:173515) | EarningsScreen | Drift | Same as the Day 0 landing (header, extra Paid row, Get Help does nothing). | (shared S) |
| cashback-and-rewards/bottomsheet/rewards-breakup (3277:39916) | EarningsBreakupSheet rewards | Partial | Pending and paid hardcoded ₹0.0. | (shared S) |
| cashback-and-rewards/bottomsheet/cashback-status (3277:39918) | EarningsBreakupSheet cashback | Match | — | — |

### 17 — Payment History

| Figma frame (node) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| Profile / Payment history / No details available (3416:62381) | `screens/ProfilePaymentHistoryEmpty.tsx` | Partial | Copy matches. The receipt illustration is a grey placeholder box (asset 3629:174357 was never exported). Unreachable: nothing routes here, and there is no data to decide when it should show. | S |
| Profile / Payment history (3396:51078) | `screens/ProfilePaymentHistory.tsx` | Partial | **Static.** Two hardcoded cards (`CARD_1`/`CARD_2`, `:79-92`). No API or query hook exists for payment history. **Unreachable:** the Profile "Payment History" menu item has no action (`screens/ProfileScreen.tsx:149-150`). The Earnings "Paid → View" row opens a sheet, not this screen. | L (API + wiring) |
| Profile / Payment history / View details (3396:51408) | `screens/ProfilePaymentHistoryDetails.tsx` | Partial | Static `CARDS` (`:73`). The header Request ID is hardcoded. Download Excel/PDF only shows a toast; there is no export. | M |
| Profile / Payment history / select month (3416:63963) | `organisms/SelectMonthSheet.tsx` | Partial | The sheet opens and selection updates the label, but **picking a month does not filter anything**, and the month options are static (`SELECT_MONTH_OPTIONS`). | S (with history API) |

---

### 3. Extras (code in this area with no Figma frame)

| Code | Notes |
|---|---|
| `WithdrawGiftCard` variant `cashback` (`screens/withdraw/WithdrawGiftCard.tsx:38-41`) | An intermediate Amazon/Flipkart chooser for the cashback bucket. Figma lists both methods directly on method-select. |
| `organisms/PaymentProcessingSheet.tsx` (opened from `EarningsScreen.tsx:125-128`) | "Payment in process" blocker. The header cites Figma 2047:25729, which is outside the audited sections. Useful; keep. |
| Earnings "Paid / View" row + `EarningStatusSheet variant='paid'` (`EarningsScreen.tsx:224-239,316-320`) | Not in the Figma landing. |
| `PromoTopSheet` welcome banner on Offers (`OffersScreen.tsx:169-189,445-449`) | Shows once per session; not in Figma. |
| Offers search overlay (`SearchTopSheet`) and global store index (`OffersScreen.tsx:191-296`) | Figma shows a static search bar only. |
| Thematic per-category header tint (`OffersScreen.tsx:123-153`) | Not in Figma. |
| `StoreBestCards` "Best cards to use here" floor (`OffersBrandAmazon.tsx:457`) | Credit-card upsell floor; not in the brand-page frames. |
| Share button → OS share with the raw `cashbackUrl` (`OffersBrandAmazon.tsx:147-153`) | It shares the URL with an **empty `id=`**, so the recipient's click is unattributed. |
| Profile → "Withdraw Cashback" (`ProfileScreen.tsx:142-143`) | Opens `WithdrawStack` directly. This **bypasses** the Earnings gates (payment-in-process, ₹0 balance) and the `withdraw_start` event. |

---

### 4. Offer click-out and analytics

**Click-out URL building** (`lib/openUrl.ts`, `OffersBrandAmazon.tsx:524-531`):
- The URL is `store.cashbackUrl` (API `cashback_url`) with only the user id put in the `id=` slot (`withTrackingUser`). It carries no click or session id, sub-id, source (app / screen / category) or campaign parameter.
- When signed out, or before `useProfile` resolves, the URL opens with an **empty `id=`** and the click goes unattributed. The CTA is not gated on `profile` being loaded.
- When `cashbackUrl` is missing (store unavailable, or the field is omitted under the user token, as the comment at `openUrl.ts:20` notes), the tap silently does nothing but still logs `offer_shop`.
- There is no redirection interstitial ("offer details / Redirection" is in Figma section 27, outside this scope).

**Analytics events**

| Event | Where it fires | Properties / gap |
|---|---|---|
| `offer_category_select` | `OffersScreen.tsx:161` | category, index |
| `select_content` | `OffersScreen.tsx:271` (search), `:305` (grid) | content_type=store, item_id=slug, source |
| `offer_shop` | `OffersBrandAmazon.tsx:526` | `{store: brandName, cashback_kind}`. Missing slug/store id, category, URL-present flag and user id. Fires even when nothing opens. |
| `withdraw_start` | `EarningsScreen.tsx:120` | Not fired on the Profile → Withdraw entry. |
| `withdraw_method_select` | `WithdrawScreen.tsx:213,235,254` | Not fired for Bank (no handler) or for the Amazon vs Flipkart choice in `WithdrawGiftCard`. |
| (none) | Get Paid / OTP send, OTP verify failure, payment failure | No events at these steps, so the withdraw funnel has no visibility past method-select. |
| `withdraw_submit` | `WithdrawVerifyOTP.tsx:115` | method, payment_type, amount |
| `withdraw_otp_resend` | `WithdrawVerifyOTP.tsx:144` | no props |
| `withdraw_success` | defined at `analytics/events.ts:56` | **Never fired.** |

---

### 5. Top 5 issues, ranked by user and business impact

1. **The offer click-out leaks attribution, which is affiliate revenue** (M). `withTrackingUser` fills only the user id, and opens with an empty `id=` when the profile hasn't loaded or the user is signed out. There is no click/session/source id. The Share button spreads untracked URLs. A missing `cashbackUrl` gives a silent dead CTA that still logs `offer_shop`, which inflates the conversion metric. Fix: gate the CTA on the profile, add click/source params agreed with CashKaro tracking, handle the no-URL case, and enrich `offer_shop`. (`lib/openUrl.ts`, `OffersBrandAmazon.tsx:147-153,524-531`)
2. **Bank Transfer withdrawal does not exist, and the method row is a no-op** (M). 4 happy-path frames and 3 corner/T&C frames are unbuilt. The API (`submitBankPayment`) is ready. Users tap Bank Transfer and nothing happens, which is a trust hit on a money screen. (`WithdrawScreen.tsx:223-230`, `WithdrawVerifyOTP.tsx:107-113`, `WithdrawSuccess.tsx:63-69`)
3. **Users with both balances cannot withdraw cashback via UPI/Bank** (M). The combined method-select collapses to one gift-card-only bucket, while Figma shows all three sections. Combined with the hidden cashback/reward tooltips, this forces a gift-card payout on users who expect cash, a retention risk. (`WithdrawScreen.tsx:199-203`)
4. **Brand pages show wrong, hardcoded offer content** (M). Every coupon store shows the coupon code "MCCK300", and Copy Code does nothing. Every store shows "Upto 90% Off across categories / See +5 Offers". The upsell timer is a frozen "01:23:59" with a hardcoded "₹150" condition. The store-not-available / Notify Me variant is missing, and Similar Stores are static and untappable. A wrong coupon code drives failed orders and missing-cashback tickets. (`OffersBrandAmazon.tsx:389-427,460-464`, `StoreOfferDetails.tsx:45`, `StoreCashbackDetails.tsx:82-83`)
5. **Withdraw error states are incomplete or misleading, and Payment History is static and unreachable** (M + L). An invalid UPI is caught only after the OTP step, as a generic alert. "OTP expired" is just the 30s resend timer, and server-expired or network errors read "Enter a valid OTP". The Flipkart invalid-email and email-mismatch states and the Amazon invalid-phone state are missing. The success GIF is a placeholder, and `withdraw_success` is never fired. Payment History has no API, hardcoded rows, a month filter that does nothing, and its Profile menu item has no action. Users cannot verify a payout they just made. (`WithdrawVerifyOTP.tsx:51,69-125`, `WithdrawFlipkart.tsx:63,117-136`, `ProfileScreen.tsx:149-150`, `ProfilePaymentHistory.tsx:79-92`)

Smaller items: the Day-0 "No Cashback Yet" sheet is missing; Earnings "Get Help" does nothing; the rewards breakup pending/paid amounts are hardcoded; the cashback-not-confirmed illustration is an emoji; the masthead sub-line reads "Cashback" in the rewards flow; and the OTP has 6 boxes against Figma's 4 (confirm which is right with the backend).


## Audit: Account + Help area (Figma sections 16a–27)

Figma file `P7UcoZYBnfyefmJIA8wcM7` · code `/home/user/mini-app` · audited 2026-11-03. No code changed.
Paths below are relative to `/home/user/mini-app/src` unless noted. Routes live in `navigation/RootNavigator.tsx` + `navigation/types.ts`.
Staging was not reachable from the sandbox, so data wiring is judged from the code only.

### 1. Summary

| Status | Count |
|---|---|
| Match | 41 |
| Drift | 37 |
| Partial | 31 |
| Missing | 23 |
| **Total frames** | **132** |

Extras: 10 code items with no Figma frame (section 3).

What stands out:
- **Account flows are UI-only.** Edit name, email/mobile change and delete account call no write API. Changing the name throws the edit away. Any OTP is accepted. "Account Deleted" only signs the user out (the account is never deleted). None of the error states in the design are built: invalid input, already registered, wrong OTP, expired OTP, name error, saving state and success state.
- **The missing-cashback claim path is live and branches correctly by group** (A/B1/B2/C1/C2/D in `api/missingCashbackMapper.ts`). The list screen does not handle every outcome, though. Rejected claims and rejection reasons are never shown. Empty states have no illustration. The "already tracked for this date" pre-check from the design does not exist.
- **The transition pages (section 27) are mostly missing.** There is no redirect interstitial before the bank or store opens. There is no 404 page and no connection-lost page. `cat-redirecting.riv` is used only for the Home "Apply Filter" overlay.

---

### 2. Per-section tables

### 16a - Profile page: edit profile (email + name), section 4448:23819

| Figma frame (node id) | Code (file:line or route) | Status | Gap | Effort |
|---|---|---|---|---|
| profile/landing (4448:23845) | `screens/ProfileScreen.tsx` (tab `Profile`) | Drift | Row "Request Payment" is built as "Withdraw Cashback" (:142). Extra "Never Miss Cashback" row (:184). **"Payment History" row has no action** (`onMenu('payment_history')`, :150), so ProfilePaymentHistory cannot be reached from Profile. | S |
| account-settings/verify-identity-otp-email/empty (4448:23866) | `screens/EditContactVerifyIdentityScreen.tsx` (route `EditContactVerifyIdentity`) | Partial | No verify API: any 6 digits advance (:16, :102). Code has 6 OTP slots; Figma has 4. CTA reads "Continue"; Figma reads "Save Changes". | M (wire send/verify OTP for the whole contact-change flow) |
| email-change/invalid-email (4448:23879) | `screens/EditContactEnterNewScreen.tsx` | Missing | No inline "Please enter a valid email" error. The CTA just stays disabled (`isValidContact`, `editContact.ts:51`). | S |
| email-change/email-already-registered (4448:23891) | — | Missing | No server check and no error state. | S (after API) |
| email-change/otp-wrong (4448:23903) | `screens/EditContactVerifyNewScreen.tsx` | Missing | No wrong-OTP state (red slots + "Please enter a valid OTP"). Any code succeeds (:124). | S (after API) |
| email-change/otp-expired (4448:23918) | `screens/EditContactVerifyNewScreen.tsx` | Missing | No expired-OTP state. The resend timer exists (:106). | S |
| edit/default (4448:23933) | `screens/AccountSettingsScreen.tsx` (route `AccountSettings`) | Drift | Header reads "Account Settings" (:107); Figma's edit frames read "Edit Profile". | S |
| email-change/enter-email-empty (4448:23951) | `EditContactEnterNewScreen.tsx` | Partial | UI matches. "Send OTP" sends nothing; it only navigates (:88–94). | covered by M above |
| verify-identity-otp-email/filling (4448:23963) | `EditContactVerifyIdentityScreen.tsx` | Partial | Same as /empty: no API, 6 slots instead of 4. | — |
| verify-identity-otp-email/filled (4448:23975) | `EditContactVerifyIdentityScreen.tsx` | Partial | Same. | — |
| email-change/enter-email-filled (4448:23987) | `EditContactEnterNewScreen.tsx` | Partial | Same as /enter-email-empty. | — |
| email-change/otp-empty (4448:23999) | `EditContactVerifyNewScreen.tsx` | Partial | No API. 6 slots instead of 4. | — |
| email-change/otp-filled (4448:24014) | `EditContactVerifyNewScreen.tsx` | Partial | Same. | — |
| email-change/saved-success (4448:24029) | `AccountSettingsScreen.tsx:176-185` (param `updated`) | Partial | The success message renders, but the new value is optimistic, taken from nav params (:72-78). It is not saved anywhere and reverts on the next visit. | — |
| edit/on-typing (4448:24049) | `AccountSettingsScreen.tsx:123-131` | Match | Save is enabled once the name is dirty. | — |
| edit/on-saving (4448:24066) | `AccountSettingsScreen.tsx:188-196` | Missing | No saving spinner. Save just calls `goBack()`. | S |
| edit/save-success (4448:24085) | — | Missing | No "name updated" success message. **The name is never saved**: no profile-update API, and `AuthContext.setDisplayName` is not called. The edit is silently discarded. | M |
| edit/name-error (4448:24105) | — | Missing | No validation and no "special characters" error. | S |

### 16b - Profile page: mobile change + delete account, section 4439:291389

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| account-settings/verify-identity-otp-mobile/empty (3395:21424) | `EditContactVerifyIdentityScreen.tsx` (field=mobile) | Partial | No API. 6 slots instead of 4. | covered by 16a M |
| mobile-change/invalid-mobile (3396:25096) | `EditContactEnterNewScreen.tsx` | Missing | No inline "Please enter a valid phone number" error. The CTA is just disabled. | S |
| mobile-change/mobile-already-registered (3396:25108) | — | Missing | No server check or state. | S (after API) |
| mobile-change/otp-wrong (3396:25120) | `EditContactVerifyNewScreen.tsx` | Missing | No wrong-OTP state. | S |
| mobile-change/otp-expired (3396:25135) | `EditContactVerifyNewScreen.tsx` | Missing | No expired-OTP state. | S |
| verify-identity-otp-mobile/filling (3395:21437) | `EditContactVerifyIdentityScreen.tsx` | Partial | As above. | — |
| verify-identity-otp-mobile/filled (3395:21449) | `EditContactVerifyIdentityScreen.tsx` | Partial | As above. | — |
| delete-account/success-v2 (3396:29405) | `screens/AccountDeletedScreen.tsx` (route `AccountDeleted`, gesture off) | Partial | UI matches (close X, seal, copy). **No delete API**: `finish()` only calls `signOut()` and resets to Onboarding (:82-86), so the account survives. The seal is an SVG stand-in for the asset. | M (API + compliance) |
| delete-account/landing-v1 (3396:28372) | `screens/DeleteAccountScreen.tsx` (route `DeleteAccount`) | Drift | Layout and T&C match. The illustration is a 🥺 emoji placeholder, not the Figma image. | S |
| delete-account/landing-v2 (3919:38200) | `DeleteAccountScreen.tsx` | Match | Checkbox-checked variant. | — |
| mobile-change/enter-mobile-empty (3395:23867) | `EditContactEnterNewScreen.tsx` | Partial | No API. | — |
| mobile-change/enter-mobile-filled (3395:23879) | `EditContactEnterNewScreen.tsx` | Partial | No API. | — |
| mobile-change/otp-empty (3395:23891) | `EditContactVerifyNewScreen.tsx` | Partial | No API. 6 slots instead of 4. | — |
| delete-account/enter-otp (3396:28591) | `screens/DeleteAccountOtpScreen.tsx` (route `DeleteAccountOtp`) | Partial | Any 4 digits pass (:13, :125-128). No send-OTP call. This screen has 4 slots while edit-contact has 6, so OTP length is inconsistent across flows. | covered by delete M |
| delete-account/success-v1 (3396:29151) | `AccountDeletedScreen.tsx` | Partial | Same as success-v2. | — |
| mobile-change/otp-filled (3395:23906) | `EditContactVerifyNewScreen.tsx` | Partial | No API. | — |
| mobile-change/saved-success (3395:23921) | `AccountSettingsScreen.tsx:176` | Partial | Optimistic only; not saved. | — |
| account-settings/personal-details-v1 (3396:26619) | `AccountSettingsScreen.tsx` | Match | Fields, pencils, Delete link and disabled Save match. Profile is read live via `useProfile`. | — |
| account-settings/personal-details-v2 (3396:29803) | `AccountSettingsScreen.tsx` | Match | — | — |
| delete-account/otp-filled-v1 (3396:30226) | `DeleteAccountOtpScreen.tsx` | Missing | This frame is the **wrong-OTP** state (red slots, "Please enter a valid OTP"). Not built. | S (after API) |
| delete-account/landing-v3 (3919:38237) | `DeleteAccountScreen.tsx` | Match | — | — |
| delete-account/landing-checkbox-error (3919:38344) | `DeleteAccountScreen.tsx:154` | Drift | Figma keeps "Delete Account" tappable and shows red "Please check the box first." Code disables the button instead, so there is no error state. | S |
| delete-account/otp-filled-v2 (3396:30241) | `DeleteAccountOtpScreen.tsx` | Missing | **Expired-OTP** state not built. | S |

### 18 - Get Help page / missing cashback, section 4439:291675

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| help/missing-cashback/feedback-form (3632:193094) | `organisms/WhatWentWrongFeedbackSheet.tsx` (opened from `MissingCashbackHelp.tsx:73`) | Partial | UI matches. The selected reasons only go to analytics (`MISSING_CASHBACK_FEEDBACK`, `MissingCashbackHelp.tsx:77`). No backend receives them. | S–M (needs endpoint) |
| help/missing-cashback/explain-commission (3632:194734) | `organisms/WhatWentWrongInfoSheet.tsx` (from `MissingCashbackOops.tsx:77`) | Match | — | — |
| help/missing-cashback/feedback-thanks (3632:193594) | `organisms/FeedbackAppreciatedSheet.tsx` | Partial | The copy promises "Our team will get back to you within 48 hours" (:97), but nothing is sent to a team. | S (change copy) / M (wire) |
| help/missing-cashback/did-you-shop (3424:71413) | `screens/MissingCashbackHelp.tsx` (route `MissingCashbackHelp`) | Match | Yes waits for `useRetailers`, then goes to the list or to Oops. | — |
| help/missing-cashback/where-did-you-shop (3437:73510) | `screens/MissingCashbackWhereDidYouShop.tsx` | Match | Live retailers, with loading, error and empty states. | — |
| help/missing-cashback/no-visits (3632:194517) | `screens/MissingCashbackOops.tsx` | Match | — | — |
| help/landing (3632:194974) | `screens/GetHelpScreen.tsx` (route `GetHelp`) | Partial | Only "Missing Cashback or Rewards" does anything. The other 4 topic cards (How it works, Your Cashback, Payment related, Unable to Login) have no `onPress` (:80-88). | M |

### 19 - Missing cashback, Did you shop (Yes), section 4439:291681

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| where-did-you-shop-v2 (4129:23675) | `MissingCashbackWhereDidYouShop.tsx` | Match | `MissingCashbackTrack.tsx` header also claims this node; that is wrong (see Extras). | — |
| group-a/oops-no-visits (4129:23753) | `MissingCashbackWhereDidYouShop.tsx:36-62` (inline empty state) | Match | Copy matches. Rendered inside the list screen, not as a full-page modal with a close X. | — |
| group-a/ticket-list-with-cta (4129:23763) | `screens/MissingCashbackDidYouShop.tsx` "Others" tab (`OthersCard`) | Partial | `mapOthersClaims` keeps only claims that have a `ticket_id` (`api/missingCashbackMapper.ts:489-491`). **Rejected claims without a ticket appear in no tab.** The tab count still uses `meta.others`, so the badge can disagree with the rows. Header reads "Missing Cashback"; Figma reads "Did You Shop?". | M |
| group-a/ticket-summary (4129:23775) | `organisms/MissingCashbackSummarySheet.tsx` | Match | — | — |
| group-a/ticket-list-empty (4129:23792) | `MissingCashbackDidYouShop.tsx:211-216` | Drift | Text-only empty state. The Figma document illustration is missing. | S |
| group-a/ticket-list-with-tracked (4129:23806) | `MissingCashbackDidYouShop.tsx` + `molecules/HelpTicketCard.tsx` (status `tracked`) | Drift | The tracked card has no "Note: For every transaction we give a flat 3% Cashback…" line. The tab count renders as text "Closed (2)" (:127), not as the Figma badge pill. | S |
| group-a/ticket-status-in-review (4129:23818) | `HelpTicketCard` status `in-review` with live `timerTarget` | Match | — | — |
| group-a/no-tickets-info (4129:23827) | `MissingCashbackDidYouShop.tsx:168-173` | Drift | No illustration. | S (shared with ticket-list-empty) |
| choose-date-v1 (4129:23839) | `screens/MissingCashbackChooseDate.tsx` | Match | Live exit-click dates grouped by month. | — |
| choose-date-v2 (4129:23861) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| choose-date-v3 (4129:23883) | `MissingCashbackChooseDate.tsx` | Match | The Figma loading-on-Continue state does not apply: no API call at this step. | — |
| enter-order-id-empty (4129:23905) | `screens/MissingCashbackEnterOrderId.tsx` | Match | — | — |
| enter-order-id-placeholder (4129:23917) | `MissingCashbackEnterOrderId.tsx` | Match | Hint comes from `orderid_hint_message`. | — |
| group-a/enter-amount-confirm (4129:23929) | `screens/MissingCashbackEnterAmount.tsx` | Match | — | — |
| order-id-invalid (4129:23970) | `MissingCashbackEnterOrderId.tsx:55-75, 131-134` | Match | Regex check against `orderid_format`, with an inline red error. | — |
| group-a/sr-input-order-id (4129:23982) | `screens/MissingCashbackResult.tsx` (variant `tracked`) | Drift | Figma shows "Cashback Tracked" as a **bottom sheet** over the order-ID step, with "View Details". Code navigates to a full-screen result page after the amount is submitted. | S |
| cashback-tracked (4129:24114) | — | Drift | Figma pre-checks **at date selection**: "no need to raise a ticket, cashback already tracked for your clicks on this date". Code has no such check (`McExitClick` carries no tracked flag, `api/missingCashback.ts:41-50`). The user goes through order ID and amount first and only learns afterwards. | M (needs API field) |

### 20 - Missing cashback, flow 2 (order ID + category varies: TataCliq, Myntra), section 4439:291682

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| group-a/choose-date-v4 (4129:25231) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-a/choose-date-v5 (4129:25253) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-a/enter-order-id-v3 (4129:25275) | `MissingCashbackEnterOrderId.tsx` | Match | — | — |
| group-a/enter-amount (4129:25287) | `MissingCashbackEnterAmount.tsx` | Match | — | — |
| group-a/ticket-status-review-v3 (4129:25299) | `MissingCashbackDidYouShop.tsx` (In Review) | Match | (`MissingCashbackTicketStatusReview.tsx` also claims this node but is unreachable demo code.) | — |
| group-a/new-user-check (4129:25311) | `screens/MissingCashbackNewUserCheck.tsx` (B1) | Partial | Live PUT `user_type` works. The "Learn More" link has no handler (:119). No analytics on submit. | S |
| group-a/ticket-list-with-counter (4129:25325) | `MissingCashbackDidYouShop.tsx:126-131` | Drift | The count renders as a text suffix "(n)", not the Figma badge pill inside the tab. | S |
| group-a/ticket-list-tracked-4 (4129:25335) | `MissingCashbackDidYouShop.tsx` (Closed) | Drift | Tracked card has no Note line. | S (shared) |
| group-a/tracking-info-v2 (4129:25344) | `MissingCashbackDidYouShop.tsx` (Closed empty) | Drift | No illustration. | (shared) |
| group-a/ticket-list-tracked-3 (4129:25356) | `MissingCashbackDidYouShop.tsx` | Drift | Same tracked-card gap. | (shared) |
| group-a/choose-date-v6 (4129:25960) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-a/choose-date-v7 (4129:25982) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-a/enter-order-id-v4 (4129:26004) | `MissingCashbackEnterOrderId.tsx` | Match | — | — |
| group-a/enter-amount-v2 (4129:26016) | `MissingCashbackEnterAmount.tsx` | Match | — | — |
| group-a/ticket-status-review-v2 (4129:26028) | `MissingCashbackDidYouShop.tsx` | Match | — | — |
| group-a/tracked-update-step-8-3 (4129:26042) | `HelpTicketCard` tracked | Drift | Copy differs: "Hurray! Cashback has been tracked ₹132 added to your CashKaro account" vs code "…is added to your account" (`missingCashbackMapper.ts:351`). Note line missing. | S |
| group-a/tracking-info (4129:26111) | `MissingCashbackDidYouShop.tsx` empty | Drift | No illustration. | (shared) |
| group-a/ticket-list-tracked-2 (4129:26123) | `MissingCashbackDidYouShop.tsx` | Drift | Same tracked-card gap. | (shared) |
| group-a/ticket-list-tracked-1 (4129:26132) | `MissingCashbackDidYouShop.tsx` | Drift | Same. | (shared) |

### 21 - Missing cashback, flow 3 (no order ID + category varies: Amazon), section 4439:291683

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| group-b/ticket-summary (4129:26657) | `screens/MissingCashbackTicketSuccess.tsx` | Partial | Layout and copy match ("Please Allow Us 8 to 10 Business Days…"). The "Learn More" link does nothing (`onPress={() => undefined}`, :45). | S |
| group-b/choose-date-v1 (4129:26668) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-b/choose-date-v2 (4129:26690) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-b/enter-order-id (4129:26712) | `MissingCashbackEnterOrderId.tsx` | Match | — | — |
| group-b/enter-amount-with-submit (4129:26724) | `MissingCashbackEnterAmount.tsx:87` | Drift | Figma title is "Almost there! Tell us your order amount" with subtitle "Enter amount you paid after discounts". Code title is "Now, tell us your {store} Order Amount". | S |
| group-b/ticket-list-1 (4129:26736) | `MissingCashbackDidYouShop.tsx` (In Review, `under-review` ticket card) | Drift | Figma ticket card reads "Your missing Cashback ticket is under review · Expect update in 23:59" (countdown). Code under-review card shows "Ticket ID" plus "Expect update by 9th Jun '26" (date, no timer) (`missingCashbackMapper.ts:340-344`). | S |
| group-b/ticket-list-closed-1 (4129:26750) | `HelpTicketCard` `need-details` → "Upload Screenshot" goes to `MissingCashbackInvoiceUpload` | Match | Resume-by-group is wired (`MissingCashbackDidYouShop.tsx:150-161`). | — |
| group-b/ticket-list-2 (4129:26760) | `MissingCashbackDidYouShop.tsx` | Drift | Same ticket-card copy/timer gap as ticket-list-1. | (shared) |
| group-b/ticket-list-tracked-2 (4129:26772) | `MissingCashbackDidYouShop.tsx` | Drift | No empty illustration / tracked Note. | (shared) |
| group-b/ticket-list-tracked-1 (4129:26781) | `MissingCashbackDidYouShop.tsx` | Drift | Same. | (shared) |
| group-b/ticket-status-v1 (4129:26793) | `MissingCashbackDidYouShop.tsx` | Drift | "Missing ticket created · Expect update in 23:59" (countdown). Code shows a date and different copy. | (shared) |
| group-b/ticket-status-v2 (4129:26802) | `MissingCashbackDidYouShop.tsx` (Closed) | Drift | Same, under the Closed tab. | (shared) |
| group-b/ticket-status-v3 (4129:26811) | — | Missing | **Rejected-ticket card**: "We are sorry, your missing ticket has been rejected. Check your email… Rejection Reason: …". There is no rejected `ClaimCardStatus` (`missingCashbackMapper.ts:213`), and no field or render for the rejection reason anywhere. | M |
| group-b/ticket-status-v4 (4129:26831) | — | Missing | **"Transaction not eligible for cashback" + Rejection Reason** card. Not built. In the Closed (Resolved) tab, every non-ticket claim renders as "Hurray! … tracked" (`mapClaimToCard` treats `status==='resolved'` as tracked, :331). | (with v3) |
| group-b/did-you-shop (4129:27642) | `MissingCashbackDidYouShop.tsx` | Drift | Figma lists card-application tickets ("Application Number: C1-…", HDFC). Code has no application-number field and labels the card "Order ID". The header title also differs. | S (if the API exposes it) |

### 22 - Missing cashback, flow 4 (get paid variant), section 4439:291684

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| group-b/choose-date-v3 (4129:27736) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-b/choose-date-v4 (4129:27758) | `MissingCashbackChooseDate.tsx` | Match | — | — |
| group-b/enter-order-id-with-get-paid (4129:27780) | `MissingCashbackEnterOrderId.tsx` | Match | — | — |
| group-b/enter-amount-with-get-paid (4129:27792) | `MissingCashbackEnterAmount.tsx` | Drift | Title copy "Almost there!…", same gap as 4129:26724. | (shared S) |
| group-b/ticket-list-3 (4129:27804) | `MissingCashbackDidYouShop.tsx` | Drift | Ticket-card copy/timer gap, same family as 4129:26736. | (shared) |
| group-b/ticket-list-4 (4129:27818) | `MissingCashbackDidYouShop.tsx` (Closed empty) | Drift | No illustration. | (shared) |
| group-b/ticket-detail (4129:27840) | `MissingCashbackTicketSuccess.tsx` | Partial | "Learn More" does nothing (:45). | (shared S) |
| group-b/ticket-list-tracked-4 (4129:27851) | `MissingCashbackDidYouShop.tsx` | Drift | Tracked Note / empty illustration. | (shared) |
| group-b/ticket-list-tracked-3 (4129:27860) | `MissingCashbackDidYouShop.tsx` | Drift | Same. | (shared) |
| group-b/did-you-shop-v2 (4129:27548) | `MissingCashbackDidYouShop.tsx` | Drift | Application-number ticket variant; same as 4129:27642. | (shared) |

### 23 - Order Details & order status, section 4439:291685

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| orders/list-v1 (4049:131896) | `screens/OrdersList.tsx` (route `OrdersList`, `useOrders`) | Match | Live data. Check-status card, filter, notes with More/Less. | — |
| orders/detail/cashback-pending (3834:51156) | `screens/OrdersDetail.tsx` (route `OrdersDetail`, `useOrderDetail`) | Drift | The help card is static and identical in every state. "Need Help" opens the generic retailer picker `MissingCashbackWhereDidYouShop` (:277); no order ID or store is pre-filled and there is no ticket context. The `gethelp` icon is replaced by `headset-outline`. | M |
| orders/detail/cashback-delayed (3919:40017) | `OrdersDetail.tsx` + `api/ordersMapper.ts:329-334` | Drift | Figma's delayed step is orange. The live mapper uses the amber `warning` tone. FIGMA_RECONCILE says a saffron `brand` tone was added, but that change is only on the demo `STATUS_CONFIG` path. | S |
| orders/detail/cashback-cancelled (3919:40150) | `OrdersDetail.tsx` | Match | Shares the static help card noted above. | — |
| orders/detail/confirmed-on-time (3919:40310) | `OrdersDetail.tsx` | Match | — | — |
| orders/detail/confirmed-early (3919:40413) | `OrdersDetail.tsx` / `ordersMapper.ts` | Partial | There is one `confirmed` key. Early-confirmation step styling (star icon in Figma) is not separately mapped. | S |
| orders/detail/confirmed-delay (3919:40602) | `OrdersDetail.tsx` / `ordersMapper.ts` | Partial | The confirmed-after-delay variant is not distinguished. | S |
| orders/detail/cashback-paid (3919:40701) | `OrdersDetail.tsx` | Match | 4th step present. | — |
| orders/detail/cashback-requested (3919:40811) | `OrdersDetail.tsx` / `ordersMapper.ts:336` | Drift | Figma has a violet masthead and a 5-step timeline. Code falls back to the amber masthead (per FIGMA_RECONCILE: no `requested` subtle token) and the pending 3-step timeline. | S |

### 24 - Give feedback, section 4439:291868

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| help/feedback/form-empty (4001:29384) | — | Missing | No "Give Us Feedback" screen or route anywhere. (`grep "Give Us Feedback"` finds nothing; Get Help has no entry for it.) | M |
| help/feedback/form-with-name (4001:29531) | — | Missing | Includes the "File format not supported" error state. | (in M) |
| help/feedback/form-with-details (4001:29593) | — | Missing | Attachment chip state. | (in M) |
| help/feedback/form-with-attachment (4001:48176) | — | Missing | "Successfully Sent" sheet. | (in M) |
| profile/landing (4439:291686) | `ProfileScreen.tsx` | Drift | Same as 16a profile/landing. | (S above) |

### 25 - Review Us, section 4439:291869

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| help/review/rating-empty (3685:197563) | `screens/ReviewUsScreen.tsx` (route `ReviewUs`) | Partial | Visually matches. The counter `['7','3','3','8']` (:41) and the 3 reviews (`REVIEWS`, :45) are hard-coded. | S–M |
| help/review/rating-filled (3741:53612) | `ReviewUsScreen.tsx:158-168` toast | Partial | The toast shows "submitted successfully", but nothing was submitted (see below). | — |
| help/review/with-comment (3713:52291) | `screens/WriteReviewScreen.tsx` (route `WriteReview`) | Partial | Submit only fires `REVIEW_SUBMIT` analytics (:68) and navigates back. The review is discarded. There is no backend and no native store-review hand-off (expo-store-review). | M |

### 26 - Privacy Policy, section 4439:291870

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| legal/privacy-policy (3685:197516) | `screens/PrivacyPolicyScreen.tsx` + `screens/privacyContent.ts` | Drift | Copy is verbatim plus one deliberately added section, "Device Permissions & Usage Access" (Play Store requirement for Cashback Guard), which renumbers the later sections. Needs product/legal sign-off. Content is static in the bundle (no remote version). | S |

### 27 - Transition pages, section 4439:291871

| Figma frame (node id) | Code | Status | Gap | Effort |
|---|---|---|---|---|
| error 404 / "Something didn't go as planned" (4367:243459) | — | Missing | No generic error screen, no ErrorBoundary, no Try Again. | M (shared `ScreenState` + cat assets) |
| Connection lost (4367:243565) | `HomeScreen.tsx:1766-1790` (inline "Couldn't load cards" + Retry only) | Missing | No offline detection (no NetInfo) and no full-page cat state. The other screens show plain "Couldn't load…" text. | M |
| Cards search / No result (4367:243584) | `HomeScreen.tsx:1797-1815` | Drift | Shows text only ("No cards match your filters / Try removing a filter or two"). The cat "NOPE" illustration and the "No matching results" copy are missing. | S |
| Credit card details / Redirection (4367:243603) | `HomeScreen.tsx:1448` `applyOutbound` → `lib/openUrl.ts` | Missing | Apply Now goes straight to `Linking.openURL`. There is no "Almost there · ₹X extra cashback awaits · Redirecting to <bank>" interstitial. | M |
| offer details / Redirection (4367:243622) | `OffersBrandAmazon.tsx:530` → `openUrl(withTrackingUser(...))` | Missing | Same: no redirect interstitial before the store opens. `assets/animations/cat-redirecting.riv` exists but is used only by `organisms/FilterTransitionOverlay.tsx:136` (Home "Apply Filter"), and only in dev/standalone builds (Expo Go shows a spinner). | (with above) |

---

### 3. Extras (code with no Figma frame in these sections)

| Code | Notes |
|---|---|
| `screens/MissingCashbackCategorySelect.tsx` (C1) | Live PUT `category`; "All other categories" goes to invoice upload. Built from the web prototype; no Figma frame (the header says so). |
| `screens/MissingCashbackInvoiceUpload.tsx` (C1-Other / C2) | Live multipart `raiseTicket` (`api/missingCashback.ts:241-270`). Content-Type is correctly left unset for FormData (`api/cashkaro.ts:84-85`). **Untested against staging.** The caption says ".pdf, .bmp · Max 2MB" (:174), but the picker is images-only and there is **no size check**. `expo-image-picker` is in `package.json` but not in the `app.json` plugins, so the iOS photo permission string is missing for production builds. |
| `screens/MissingCashbackResult.tsx` variants `queued` / `tracking` | No Figma frame (Figma has only the tracked sheet). |
| `screens/MissingCashbackTrack.tsx` | **Dead code.** Its header claims node 4129:23675, which is actually where-did-you-shop-v2. It is an "approximation" with hard-coded `TRACKABLE` data. The only routes to it come from the unreachable demo lists. The CTA `onPress` is empty (:142-145, TODO). PROJECT_STATE says it is "reached from the Did You Shop CTA". That is false: the CTA goes to `MissingCashbackHelp` (`MissingCashbackDidYouShop.tsx:254`). |
| `screens/MissingCashbackTicketStatusReview.tsx` | Registered but unreachable (nothing navigates to it). Data is hard-coded. `types.ts` calls it "Live claims list (3 tabs)", which is stale. |
| `screens/MissingCashbackTicketListClosed.tsx` | Unreachable demo. Upload CTA is inert (:86 TODO). The header says invoice upload is "not yet built", which is stale. |
| `screens/MissingCashbackTicketListTracked.tsx` | Unreachable demo. "View Details" is inert (:79 TODO). |
| `screens/CashbackGuardScreen.tsx` via Profile "Never Miss Cashback" row | No frame in the profile designs. |
| `organisms/FilterTransitionOverlay.tsx` | Reuses `cat-redirecting.riv` for the filter-apply transition. The design intends the cat art for redirect and error pages. |
| `screens/AccountSettingsScreen.tsx` CTA/label choices | Verify-identity CTA "Continue" instead of "Save Changes", and a 6-digit OTP. Deliberate deviations noted in the code comments; product should confirm. |

## Analytics coverage (these flows)

Screen views are auto-tracked globally (`App.js:87-99`, `onStateChange`).

Covered:
- `PROFILE_MENU_SELECT`, `HELP_TOPIC_SELECT`
- `MISSING_CASHBACK_START` (with store and group), `MISSING_CASHBACK_STEP` (intake yes/no, choose_date, order_id), `MISSING_CASHBACK_SUBMIT` (amount, group D, category, ticket), `MISSING_CASHBACK_FEEDBACK`
- `CONTACT_EDIT_START` / `CONTACT_EDIT_SUBMIT`, `ACCOUNT_DELETE_START` / `ACCOUNT_DELETE_SUBMIT`
- `REVIEW_START` / `REVIEW_SUBMIT`, `ORDER_SELECT`

Gaps:
- **No outcome event for a claim.** The result of `decideSubmitOutcome` (tracked, queued, auto-tracking, collect) is never logged, so claim-to-tracked conversion cannot be measured.
- No error events for validate, submit or upload failures.
- `MissingCashbackNewUserCheck` submit is not tracked.
- `MissingCashbackDidYouShop` tracks nothing: tab switch, resume CTA ("Add Details" / "Upload Screenshot"), "View Details", "Have more cashback" banner.
- No events from `MissingCashbackResult` or `MissingCashbackTicketSuccess`.
- `OrdersDetail` "Need Help" is not tracked.
- Name save and delete completion (`AccountDeleted` close) are not tracked.

## Doc claims checked against code

| Claim | Verdict |
|---|---|
| PROJECT_STATE:315: `MissingCashbackTrack.tsx:144` empty onPress | True (:142-145). |
| PROJECT_STATE:175: MissingCashbackTrack "Raise/track purchases step" reached from DidYouShop | False. Unreachable from the live path. |
| PROJECT_STATE:176/192: Ticket* demo screens off the live path | True. |
| PROJECT_STATE:182: AccountSettings "live" | Read-only live. There is no write path. |
| INTEGRATION.md / PROJECT_STATE:305: `raiseTicket` multipart untested | Still true. Header handling is correct; the size and type check is missing. |
| PROJECT_STATE:305: OrdersDetail help card static | True (`OrdersDetail.tsx:88-94, 253-280`). |
| FIGMA_RECONCILE: delayed step uses the saffron `brand` tone | Only on the demo path. The live `ordersMapper.ts:330-334` still uses `warning`. |

---

### 4. Top 5 issues by user and business impact

1. **Rejected claims vanish (M).**
   - Non-ticket rejected claims are filtered out of every tab (`missingCashbackMapper.ts:489-491`, `useMissingCashback.ts:153`).
   - There is no rejected or "not eligible" card and no rejection reason (Figma 4129:26811 / 26831).
   - Every Resolved claim renders as "Hurray! Cashback tracked" (`missingCashbackMapper.ts:331`).
   - Effect: users never learn why a claim failed, and may be told a claim succeeded when it did not. This is a direct driver of support load and lost trust.
2. **Account deletion does not delete (M).** `AccountDeletedScreen` only signs the user out, and the OTP gate accepts any code. The screen tells the user "Your account has been deleted". This is a Play Store account-deletion compliance and legal risk. Email/mobile change and name edit have the same problem: success UI with no API behind it, and changes are lost (the name edit is silently discarded).
3. **Missing-cashback dead ends and missing pre-check (M).**
   - No "already tracked for this date" check at date selection (4129:24114), so users complete a claim they did not need.
   - "Learn More" links do nothing (TicketSuccess :45, NewUserCheck :119).
   - Feedback sheets promise "team will get back within 48 hours", but the input only goes to analytics (`FeedbackAppreciatedSheet.tsx:97`).
   - OrdersDetail "Need Help" drops the user into the generic retailer picker with no order context (`OrdersDetail.tsx:277`).
   - 4 of 5 Get Help topics are inert.
4. **Invoice upload (C1-Other / C2) is the only way to raise a ticket for those groups and has not been verified (S–M).**
   - Multipart has not been tested against staging.
   - There is no 2MB size check, and PDF/BMP are advertised but cannot be picked.
   - The `expo-image-picker` config plugin and iOS permission string are absent from `app.json`, so a production iOS build may crash or be rejected on pick.
   - There are no failure analytics, so breakage would go unseen.
5. **No redirect, error or offline transition pages (M).** Apply Now and Shop go straight to the browser with no "Redirecting to <bank/store>" interstitial (section 27). That interstitial is the moment that reassures users cashback is being tracked, which reduces later "missing cashback" doubt. There is also no 404 or connection-lost page. Related gap: there is no claim-outcome analytics, so the funnel from click-out to tracked cashback cannot be measured.

Next tier: ticket-card copy and countdown vs date (S); empty-state illustrations (S); "Give Us Feedback" form not built (M); Review Us is static and discards submissions (M); Profile "Payment History" row is dead (S).

