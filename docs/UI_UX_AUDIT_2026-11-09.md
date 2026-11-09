# Cards.xtra — UI/UX audit vs Figma, production build (9 Nov 2026)

**Scope:** every screen reachable read-only on production (ckminapps.com + BankKaro PROD), on a Realme RMX5266 (Android 16, 360 dp wide, OS font size 130 %), compared against Figma `P7UcoZYBnfyefmJIA8wcM7` → "📌 Refined Flow". Builds on `docs/GAP_AUDIT.md` (3 Nov). Write flows (withdrawals, claims, account changes) were not exercised on production.

**Method:** 70+ device screenshots → three parallel reviews (Discovery, Money, Account/Help) against Figma frames + code → fixes → re-verified on the device.

## Root causes found

| Cause | Effect | Fix |
|---|---|---|
| `<StatusBar>` in mounted-but-hidden tab screens | Last-mounted screen's style won: dark icons on Home's blue hero, white icons on white sheets | `navigation/FocusAwareStatusBar.tsx` used by all 53 screens; Home switches light↔dark with its header; search, card detail, splash, onboarding set their own |
| Edge-to-edge without bottom insets | Splash footer, Filters footer, tab bar labels, Account Save, Privacy, Never Miss Cashback content under the nav bar | Inset-aware offsets (`navigation/floatingNav.ts`, SafeArea `bottom`) |
| Fixed heights + OS font scaling | Clipped benefit text, tags, chips, search rows, selector labels, masthead | `height` → `minHeight`, 2-line labels where needed. A `maxFontSizeMultiplier` cap was tried and **reverted**: on Android's new architecture capped text is measured and drawn at different sizes ("Yes Bank" → "Yes") |
| Android `adjustsFontSizeToFit` on buttons | "Apply Filter" rendered as "Apply" | Removed from the Button atom; single-line labels, smaller inset on full-width buttons |
| Three rupee formatters | ₹775.60 → "₹776" → "₹776.0"; 10.999 → "₹10.100"; −50 → "₹50" | `lib/money.ts` `formatINR`, exact amounts |

## Fixed and verified on device

**Discovery**
- Status bar readable on Home (hero + scrolled), search, card detail, splash, onboarding.
- Scrolled Home header: one 32-dp chip row, opaque lavender (no doubled chips, Eligibility no longer wraps).
- Card tile: fees visible beside Apply Now; badge "Flat ₹X Rewards" scales as one unit; sky-tone tags (Figma 1929:31753).
- Card detail (Android): pager can no longer rest between cards (misalignment + cross-card content overlap); solid top bar on scroll; fees Joining | Annual (same order as tile), top-aligned, Heading/24/SemiBold; benefit tiles Caption/10 and grow with text; eligibility disclaimer inside the card (Figma 3914:43713); Apply bar 44 dp (3914:43756); FAQ chevron is a token icon; "Recommended Cards", "Apply now and earn cashback."; title Heading/20/SemiBold.
- Filters: footer above nav bar, 44-dp buttons, saffron count strip (1791:4029), "Card Network" not truncated, copy "Select all the options…".
- Search: placeholder while active, Outfit font, "Popular searches" label, no-results state, one-line result rows in cashback colour.
- Share sheet: all tiles open the system share sheet.
- Splash footer above nav bar; login backdrop 90 % so the logo doesn't collide with the carousel headline.

**Money**
- Offers: no stray white capsule; designed error / empty states (`organisms/ScreenState.tsx`); pull-to-refresh; search ticker only when stores exist.
- Earnings: outline buttons per Figma (border #eeddd3, label #e55a0e); Get Help row works; Rewards sheet "₹0" not "₹0.0", rewards-specific legend, legend dots match badge colours; "No Cashback Yet!" copy (2898:164825).
- Withdraw: ₹250 minimum gate (API rejects below threshold); keyboard no longer covers Get Paid / Verify / T&C; inline errors (Invalid Email ID, Emails don't match, Invalid mobile number); correct subtitle for rewards/combined; no "Help text" placeholder under OTP; success resets the stack; Bank Transfer shown as "Coming soon".

**Account / Help**
- Profile: masked contact on one line (4448:23847), Edit Profile inside the card, Figma icon colour, Figma lock icon for Privacy and logout icon + left-aligned red Logout (exported from 4448:23861 / 4448:23863 as tintable `lock-outline` / `logout-outline`), Payment History row hidden (screen still shows sample data).
- Account Settings: mobile mask "620****902" (country code was merged), email shows from its start, Save above nav bar.
- Get Help: every tile works, brand casing "Cards.xtra", pinned back button, status bar handled; "How Cards.xtra works" sheet has no empty card slot.
- Missing Cashback: designed empty/error states, correct per-tab copy, one flow title "Did You Shop?", Back from result screens returns to the claims list (not the submitted form), dead "Learn More" links fixed, Figma copy on Enter Amount.
- Orders: designed empty / no-match / error states; reminder pip starts low so it doesn't cover content.
- Privacy: pinned header, white page; Never Miss Cashback: visible off-state switch, non-duplicate card title; Review Us caption "And Counting".

## Second pass (same day)

All verified on the device unless noted.

- **Notifications:** the static "Earn Rs. 50…" list and the permanent bell badge are gone. The screen shows an honest empty state ("You're all caught up") until a notifications API exists.
- **Figma assets exported:** Profile Get Help / Call Us use the Figma chat and phone glyphs (4448:23859); the Get Help tiles use the Figma glyphs and app logo (3632:194976). All are tintable `*-outline` icons.
- **Card detail:** the leading control is a collapse chevron (it dismisses downward), not a back arrow. The swipe-hint nudge plays once per session, not on every open. Back closes the detail and returns to Home.
- **Narrow screen / large font:** Home's filter row and the scrolled-header chip row scroll horizontally instead of clipping. Category tiles grow with 2-line labels. Fee labels wrap instead of shrinking.
- **Offers:** loading shows a 2-column skeleton instead of a spinner.
- **Earnings tooltip:** it is 247 wide (Figma 5820:27081). It now closes on tap and after 4 s; before, only re-tapping the 18-dp icon closed it.
- **Orders empty state:** the filter chips are hidden when there is nothing to filter. The "Never miss cashback" pip stays docked as the side notch, so it no longer covers the "No orders yet" copy, and expands only once orders exist.

## Third pass (same day)

Verified on the device unless noted.

- **Scrolled Home header:** the logo sat under the status-bar icons on Android (`paddingTop` was `insets.top − 48`, i.e. 0 on a 37-dp inset). It now uses the full inset and is fully opaque (Figma 1929:32667); at 90 % card text ghosted behind the time and battery. The chip row scrolls edge to edge instead of cutting the last chip 16 dp short.
- **Card tile fees:** at large OS font sizes "₹2,950" was cut to "₹2,9…" beside Apply Now. Fees now keep their full width and the button drops to its own line only when both can't fit.
- **Card detail fees:** ~100 production cards showed a bare "Not Applicable" bullet (and a few bare numbers like "720"); these are filtered out. An empty notes box no longer renders. Missing detail falls back to the card's own fees, never to the component's sample values (₹1,179 / "₹1,500 cashback…").
- **Eligibility sheet:** "Self-employed" split mid-word ("Self-emp / loyed"). The selector's 39-dp right padding (a Figma fixed-width leftover) is now 12, and titles break at the hyphen.
- **Copy:** card detail now says "Self-employed", matching the Home eligibility sheet (Figma 3914:64045 says "Self Employed").
- **Filters:** category tile labels wrap ("Food Ordering" was "Food Orde…").
- **Offers:** the "Shop as usual, earn cashback on the stores you love" promo no longer slides in over an empty or failed Offers page.
- **Home loading skeleton:** status-bar icons were white on the pale skeleton (time and battery invisible); the skeleton now sets dark icons. Not caught on the device: Home loaded from cache too fast.

**Checked, no issue:** Earnings Cashback / Rewards / Pending / Paid sheets (Figma copy), Back from card detail (tile and search entry), search result tap with keyboard up, search status bar.

## Offers pass (same day)

Verified on the device.

- **Search status bar (Offers and Home):** with search open, the time and battery were white on the white sheet. Cause: Android creates the search Modal's window with a copy of the screen's status-bar style, and the sheet's own "dark" setting arrived after that copy. The dark style is now set before the Modal mounts.
- **Search copy:** the Offers no-results hint said "Try a bank name like HDFC or SBI, or a card name" (Home's wording). It now suggests stores and categories. The bar and the open sheet both say "Search stores & categories" (they differed).
- **Empty Offers:** "No offers here yet" now has a way forward, an "Explore cards" button to Home, instead of a dead end.
- **Checked, no issue:** Back from Offers goes to Home; category switching re-tints the header; the promo stays away while there are no stores.

**Testing note:** a third-party cleaner app on the test phone (`com.phoneclean.sentrypro`) keeps bringing up Android's "Display over other apps" settings page over the app. Cards.xtra never requests that permission.

## Still open

**Needs Figma asset export** ("No Cashback Yet" and document-check illustrations). Pattern to follow: `download_assets` on the single-row node, centre the path in a 24 box with stroke #262626 so svgr makes it tintable — see `src/assets/icons/lock-outline.svg`.

**Needs a product decision**
1. Primary CTA colour: Figma uses Cobalt for Get OTP / Apply Filter / tile Apply Now; CLAUDE.md says Saffron is primary. Pick one rule.
2. Android card detail opens full screen; CLAUDE.md's non-negotiable is a ~55–60 % sheet that expands on scroll.
3. OTP length (app 6, Figma 4) — backend to confirm.
4. Home masthead is ~40 dp taller than Figma (status-bar height counted twice), pushing the first card's Apply below the fold. Fixing it reframes the hero video; needs design sign-off.
5. Static content: Review Us reviews (2023), sign-up auto-generated name + dummy email. (Notifications now show an empty state.)

**Needs backend**
- Offers on production (probed read-only against ckminapps.com with the Postman "ck-miniapp-apis" requests): the API is up and authenticates; `/offers/categories` returns 15 top-level categories. But no stores are mapped to the mini-app key: all 95 valid category paths return `total_records: 0`, the `miniapp` parent the app was built on returns 400 code 10003 "Invalid Category", and every store page (amazon, flipkart, myntra, ajio, nykaa) returns 400 code 10001 "Invalid Offer". CashKaro needs to map stores to this key (ideally under a `miniapp` parent). The staging host (ckapistaging.lmssecure.com) no longer resolves, so it can't stand in.
  - App side (done): when `miniapp` is rejected, the Offers strip is built from the real top-level categories (short labels, distinct icons) and each shows "No offers here yet" instead of "Couldn't load offers". Once stores are mapped, they appear with no code change; once a `miniapp` parent exists, the app switches back to it automatically.
- Payment History API mapping (`/payment/history`) before the Profile row returns.
- Coupon codes on brand pages; rejected-claim reasons.
- Write Review: the comment only goes to analytics and is discarded, yet the toast says it was submitted. Needs a feedback endpoint (or the toast copy changed).
- Notifications feed API (screen is an empty state until then).
- BankKaro data: Scapia Credit Card has fees "1" / "1" while its note says "no joining fee, it is lifetime free"; the app shows ₹1. Fix the record.

**Not tested on device:** login/OTP UI after these changes (would require logging out of the production test account), withdraw forms (₹0 account is gated before them), claim submission.
