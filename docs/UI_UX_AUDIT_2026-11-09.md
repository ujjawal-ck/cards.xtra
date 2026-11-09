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

## Still open

**Needs Figma asset export** (phone icon for "Call Us"; Help-tile glyphs; "No Cashback Yet" and document-check illustrations). Pattern to follow: `download_assets` on the single-row node, centre the path in a 24 box with stroke #262626 so svgr makes it tintable — see `src/assets/icons/lock-outline.svg`.

**Needs a product decision**
1. Primary CTA colour: Figma uses Cobalt for Get OTP / Apply Filter / tile Apply Now; CLAUDE.md says Saffron is primary. Pick one rule.
2. Android card detail opens full screen; CLAUDE.md's non-negotiable is a ~55–60 % sheet that expands on scroll.
3. OTP length (app 6, Figma 4) — backend to confirm.
4. Home masthead is ~40 dp taller than Figma (status-bar height counted twice), pushing the first card's Apply below the fold. Fixing it reframes the hero video; needs design sign-off.
5. Static content: notifications ("Earn Rs. 50…" + permanent badge), Review Us reviews (2023), sign-up auto-generated name + dummy email.

**Needs backend**
- Offers on production: `miniapp` category missing, categories empty, store pages 400.
- Payment History API mapping (`/payment/history`) before the Profile row returns.
- Coupon codes on brand pages; rejected-claim reasons; feedback endpoint.

**Not tested on device:** login/OTP UI after these changes (would require logging out of the production test account), withdraw forms (₹0 account is gated before them), claim submission.
