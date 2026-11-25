# Cards.xtra Storybook: flow inventory and information architecture (PM lens)

Last updated: 2026-11-19 [claude]. Role: product manager.
Checked against: `~/repos/cards.xtra-storybook`, branch `claude/storybook`. Code and docs read only. No build, no device run, no API call.
Docs older than the code: `GAP_AUDIT.md` (2026-11-03), `architecture.md` and `screen-flows.md` contain items the code has since fixed. Where a doc and the code disagree, this file follows the code and names the file.

## How to read this file

- State tags on every flow step and state: `[live]` reachable in a release build, `[hidden]` built but nothing links to it, `[demo]` reachable but no real API behind it, `[not built]` the Storybook must show it as a proposal, `[dev]` dev builds only.
- Auth: `guest` works signed out. `login` needs a CashKaro session. `gate` = a guest is asked to log in at that step.
- Money-sensitive steps are marked with `$`.
- Events are the constants in `src/analytics/events.ts`, written as GA4 names. "Defined, never fired" means the constant has no call site in `src/` or `App.js`.
- Frequency in part 2 is an estimate. No usage data exists (Firebase is a placeholder project). Scale: H, M, L.

---

## 1. Flow inventory

10 flows. Flow 3 has 3 branches and flow 4 has 4 tools plus one shared result folder, so the Storybook gets 16 flow folders.

App-wide on every flow: `app_open` and `screen_view` (from `App.js`), the `OfflineBanner` at the top while offline, and the session-expired login sheet (F10).

### F1. Launch, onboarding and login

- Goal: get into the app fast, as a guest or with a CashKaro account.
- Entry: app start. The login sheet also opens from any gate (Earnings, Profile, Get Help, "Log in to earn", session expiry).
- Steps:
  1. `Splash` [live]: Lottie, then `Onboarding` on first launch, else `MainTabs`. 7 s safety timer.
  2. `Onboarding` [live]: 3 slides, "Get Started" (guest) or "Log in".
  3. Login sheet (`LoginSheetProvider`, app-wide) [live]: phone step, then OTP step (6 boxes, 30 s resend). A new number also asks for a name on the OTP step (repo D16).
  4. `Greeting` [live]: only after a signup started from Onboarding. Then `MainTabs`.
  5. `NameInput` [hidden]: no route links to it since D16.
- Exit: `MainTabs` (Home), or back to the screen that opened the sheet (its `onSuccess` runs).
- Auth: guest to login.
- Money-sensitive: `$` OTP verify creates a real production account (signup sets a generated email, D16).
- Events: `onboarding_guest_start`, `login_sheet_open` (source), `otp_requested`, `otp_resend`, `otp_submitted`, `otp_failed`, `login`, `sign_up`, `login_prompt_tap`. `sign_up_name_set` fires only on the hidden `NameInput`.

### F2. Home and discovery

- Goal: find cards that fit me without knowing card names.
- Entry: Home tab.
- Steps:
  1. `MainTabs/Home` [live]: compact masthead (`HomeHeader`, search bar), `ToolsRow`, `FilterRow` (Category, Filters, Eligibility toggle), sections and card tiles, inline filter questions, `NeverMissCashbackNudge` (Android).
  2. Search (`SearchTopSheet`) [live]: popular searches, bank and card results, "no results" state, the advisor row (opens F5).
  3. Filters (`FilterMenu`) [live], with `FilterTransitionOverlay`.
  4. Eligibility toggle, then `EligibilityCheckerSheet` [live]: PIN, monthly income, salaried or self-employed. Home regroups into eligible, maybe and ineligible.
  5. Header bell to `Notifications` [live, always empty], help icon to `GetHelp`.
- States: skeleton, "Couldn't load cards" + Retry, "No cards match your filters" with the closest cards (`filter_no_match`), eligibility groups.
- Exit: card detail (F3), a tool (F4), advisor (F5), Notifications, Get Help.
- Auth: guest.
- Money-sensitive: none on this screen. The tile "Apply Now" starts F3.
- Events: `select_item`, `search`, `search_no_results`, `advisor_row_view`, `filter_apply`, `filter_clear`, `filter_inline_shown`, `filter_inline_tap`, `sort_change`, `category_filter`, `filter_no_match`, `eligibility_toggle`, `eligibility_check`, `tool_tile_tap`, `notification_open`. `search_result_select` is defined, never fired.

### F3. Card detail and apply

#### F3a. Apply

- Goal: check a card and go to the bank page with my cashback tracked.
- Entry: Home tile tap or tile "Apply Now"; search result; carousels; store page "Best cards to use here".
- Steps:
  1. Card detail [live]: `CardDetailSheet` on iOS (sheet), `CardDetailScreenAndroid` on Android (full screen, D18). Benefits, "View all benefits" to `AllCardBenefits` [live], "Learn how it works?" to `HowItWorksSheet` [live], `ShareSheet` [live], inline eligibility checker, sticky Apply. The tools, advisor, store page and "Cards you can get" open the same detail, so their Storybook folders link to this one.
  2. Apply gate: with no eligibility details and gate variant `mandatory` (code default), `EligibilityCheckerSheet` opens. Variant `skippable` goes straight to step 4.
  3. Result sheet: `EligibleSheet` ("Apply Now"), `MaybeSheet` ("Continue to Apply"), `IneligibleSheet` (F3b). Eligible and maybe show once per card; ineligible shows on every Apply.
  4. Click-out (`useClickOut`): guest gets `EarnLoginSheet` ("Log in to earn cashback" or apply without cashback; after login the click continues by itself). Signed in: user id resolved, link opened in the browser.
- Exit: bank page (outside the app). Back to Home, where the cross-sell rail may open (F3c).
- Auth: guest; `gate` at click-out (skippable).
- Money-sensitive: `$` click-out with attribution (user id, click id). `$` the eligibility verdict (a wrong "eligible" costs approval rate).
- Events: `view_item`, `card_view_all_benefits`, `card_apply` (gate_variant), `eligibility_check`, `eligibility_result`, `eligibility_error`, `login_sheet_open` (apply or shop), `click_out` (source), `share`. `card_apply_outbound` is defined, never fired, but the Play checklist names it as the A/B goal. `clickout_blocked` fires only in `useTrackedClickout`, which has no caller.

#### F3b. Rejection to "Cards you can get"

- Goal: I was told no; show me cards I can get.
- Entry: `IneligibleSheet` after a check says no.
- Steps:
  1. `IneligibleSheet` [live]: reason (income only, else a generic line), "Edit" (reopens the checker), 3 alternatives (closest, most Rewards, lifetime free), "See all N cards you can get", "Continue to Apply".
  2. `CardsYouCanGet` (source `rejection`) [live]: "You wanted X" strip, closest row (`CompareCard`), category chips, sort, card list.
  3. Card detail sheet, then click-out.
- Exit: bank page; back to Home.
- Auth: guest; `gate` at click-out.
- Money-sensitive: `$` click-out (source `rejection_pick` or `cards_you_can_get`). A pick tapped on the sheet opens the Home card detail, so its Apply runs the Home gate. Apply on the "Cards you can get" page skips that gate.
- Events: `rejection_sheet_view`, `rejection_pick_tap`, `rejection_edit_details`, `rejection_see_all`; on the page `select_item`, `view_item`, `category_filter`, `filter_apply`, `filter_clear`, `card_apply`, `card_view_all_benefits`, `click_out`.

#### F3c. Bounce to cross-sell rail

- Goal: I left a card without applying; show me a better-fitting one.
- Entry: closing a card detail opened from a Home tile, with no Apply.
- Steps:
  1. `CrossSellRail` under the tile [live, flag `crosssell_rail` = `rail` by default]: lens chips, up to 3 picks, "Check what I can get", Hide, "View all cards".
  2. `CardsYouCanGet` (source `bounce`) [live]: same page; copy does not promise eligibility when it is unknown.
- Exit: card detail (F3a) for a pick; bank page.
- Auth: guest.
- Money-sensitive: `$` click-out (source `crosssell_rail`).
- Events: `crosssell_impression`, `crosssell_lens`, `crosssell_tap`, `crosssell_collapse`, `crosssell_view_all`. The holdout arm logs nothing (PRD section 8). "Check what I can get" has no event.

### F4. The four Home tools

All four end on one league table (repo D27). Shared parts: `ToolResults` [live] (Quick view, By category, sort, find-in-list, "Lifetime free", "Include invite only", "Annual spends" pill), `SavingsBreakdownSheet` (the sum and Apply), `EditSpendsSheet`. Apply sits in the breakdown sheet only (`APPLY_ON_ROWS = false`). Rows for cards the app does not list have no Apply and no card page.

| Tool | Goal | Entry | Steps (routes) | Exit |
|---|---|---|---|---|
| F4a Best card for a category | Best card for where I spend | Tools row tile, rotating category word | `BestForCategory` (pick categories, answer their questions) → `ToolResults` | Breakdown sheet → card detail or click-out |
| F4b Beat my card | Is there a better card than mine? | Tools row tile | saved spends, else `SpendQuiz {next: 'beat'}` → `BeatMyCardPick` → `BeatMyCardResult` (podium, line table) → optional full `ToolResults` | Breakdown sheet → click-out (not for the user's own card) |
| F4c Find my ultimate card | Rank every card on my spends | Tools row tile | `SpendQuiz {next: 'ultimate'}` (21 questions, "Skip to results") → `ToolResults` | Breakdown sheet → click-out |
| F4d Best card for brands | Best card for the brands I use | Tools row tile, rotating brand word | `BestForBrands` (up to 5 of 13 brands, then monthly spend each) → `ToolResults` | Breakdown sheet → click-out |

- States (all four): skeleton with wait line, "You're offline" + retry, "Couldn't load your cards" + retry, "No cards came back for these spends", "No card matches these filters", "Enter at least one spend". Beat result verdicts: `best_wins`, `mine_wins`, `equal`, `not_found`.
- Auth: guest. Saved spends stay on the device; logout clears them.
- Money-sensitive: `$` click-out (source `tool_results` or `beat_my_card`). No eligibility gate on this path.
- Events: `tool_tile_tap`, `tool_start`, `tool_quiz_step`, `tool_quiz_complete`, `tool_result_view`, `tool_result_error`, `tool_result_select`, `beat_result_view`, `card_apply`, `click_out`. No spend amount is sent.

### F5. Card advisor chat

- Goal: answer a few taps and get three cards that fit, with an option to check eligibility.
- Entry: the advisor row in `SearchTopSheet` (empty query or no results).
- Steps:
  1. `Advisor` [live]: mascot intro (first time in a session), opener question, one question at a time, reveal of 3 cards after the first answer, quick tips.
  2. Eligibility bridge and one form (`AdvisorEligibilityForm`): "Likely to qualify" after the API answers.
  3. End menu: "See all N cards", "Check which cards I can get", "Change an answer" (`AdvisorChangeAnswerSheet`), "Start over" (confirm).
  4. `AdvisorResults` [live]: header, answer chips, note when the list was widened, sort (Recommended, Lowest fee), "Free cards only".
  5. Card detail sheet, then click-out.
- States: catalogue loading, "Couldn't load cards", "No cards are available right now", eligibility error, relaxed results ("what was set aside"), rewind warning.
- Exit: card detail, click-out, back.
- Auth: guest.
- Money-sensitive: `$` click-out (source `advisor`). Income and pincode never go to params or analytics.
- Events: `advisor_row_view`, `advisor_start`, `advisor_question_view`, `advisor_answer`, `advisor_reveal`, `advisor_tip_view`, `advisor_eligibility_bridge`, `advisor_eligibility_error`, `advisor_card_tap`, `advisor_card_action`, `advisor_rewind`, `advisor_menu_tap`, `advisor_results_view`, `advisor_results_sort`, `advisor_exit`, `click_out`.

### F6. Offers and store click-out

- Goal: shop at a store through CashKaro and earn cashback.
- Entry: Offers tab.
- Steps:
  1. `MainTabs/Offers` [live]: header, category strip, 2-column store grid, `PromoTopSheet` (once per session, only with stores), search.
  2. `OffersBrandAmazon` (store page, any slug) [live]: about, cashback rates, benefits or how-to, timelines, terms, best cards (`StoreBestCards`), similar stores, FAQ, sticky "Earn Cashback on <Brand>".
  3. Click-out (`useClickOut`, kind `store`).
- States: skeleton, "Couldn't load offers" + Try again, "No offers here yet" + Explore cards (production today, D11, not re-checked since 2026-11-09), "Couldn't load this store" + Try again.
- Exit: store site or app (outside), card detail from best cards.
- Auth: guest; `gate` at click-out.
- Money-sensitive: `$` click-out (source `store_page`, `store_best_cards`).
- Events: `offer_category_select`, `select_content`, `offer_shop`, `share`, `click_out`.

### F7. Earnings and withdraw

- Goal: see what I earned and move it to my UPI or a gift card.
- Entry: Earnings tab; Profile "Withdraw".
- Steps:
  1. `MainTabs/Earnings` [live]: total, Cashback and Rewards, Confirmed (Withdraw), Pending ("Know why?"), Paid; recent transactions; My Order Details, Missing Cashback, Get Help. Sheets: `EarningsBreakupSheet`, `EarningStatusSheet`.
  2. Withdraw gate (`useWithdrawGate`) [live]: `PaymentProcessingSheet` (payout settling), `CashbackNotConfirmedSheet` (nothing withdrawable, or below the minimum of ₹250 from the API threshold).
  3. `WithdrawStack/WithdrawMethodSelect` [live]: UPI, Bank Transfer ("Coming soon", not built), Amazon or Flipkart gift card; Cashback and Cashback + Rewards sections.
  4. Details [live]: `WithdrawEnterUPI`, `WithdrawGiftCard` → `WithdrawAmazon` or `WithdrawFlipkart`; T&C consent → `WithdrawTerms`.
  5. `WithdrawVerifyOTP` [live]: OTP, then the payout POST.
  6. `WithdrawSuccess` [live, no swipe back] → Home.
- States: skeleton, "Couldn't load your earnings" + Try again, guest `GuestPrompt` ("See every rupee you earn"), "Couldn't load your balance", "Could not send OTP", "Connection problem", "Payment failed", "Session expired, request a new OTP", "Couldn't confirm your withdrawal" (unknown outcome, resubmit blocked).
- Exit: Home after success; Earnings after an unknown outcome.
- Auth: login (`gate` on the tab).
- Money-sensitive: `$` the whole flow. Real payouts on production CashKaro (readiness doc B4, dropped by the owner).
- Events: `login_prompt_tap`, `order_select`, `withdraw_start`, `withdraw_method_select`, `withdraw_submit`, `withdraw_otp_resend`, `withdraw_success`.

### F8. Orders and missing cashback

- Goal: find my order and claim cashback that did not track.
- Entry: Earnings "My Order Details" and "Missing Cashback"; Profile "Missing Cashback"; Get Help topic (guest `gate`); Orders "Don't see your order here?"; Order detail "Need Help".
- Steps, orders:
  1. `OrdersList` [live]: filters (`OrdersFilterMenu`), order cards, `CashbackPip` (Android).
  2. `OrdersDetail` [live]: status masthead, amount, order ID, timeline, "Need Help" → `MissingCashbackWhereDidYouShop` (no order context passed).
- Steps, claim intake:
  1. `MissingCashbackDidYouShop` [live]: the claims list (tabs In Review, Closed, Others), `MissingCashbackSummarySheet`, `TrackMoreBanner`.
  2. `MissingCashbackHelp` [live]: "Did you shop?" Yes or No. No → `WhatWentWrongFeedbackSheet` → `FeedbackAppreciatedSheet`.
  3. `MissingCashbackWhereDidYouShop` [live] (stores visited in 30 days) or `MissingCashbackOops` [live] (no visits).
  4. `MissingCashbackChooseDate` → `MissingCashbackEnterOrderId` → `MissingCashbackEnterAmount` [live].
  5. Outcome by store group: `MissingCashbackResult` (tracked, queued, tracking) [live]; B1 `MissingCashbackNewUserCheck`; C1 `MissingCashbackCategorySelect`; C1-Other and C2 `MissingCashbackInvoiceUpload` → `MissingCashbackTicketSuccess` [live].
  6. Back from any outcome returns to the claims list (`useExitToClaims`).
- Hidden routes: `MissingCashbackTrack`, `MissingCashbackTicketStatusReview`, `MissingCashbackTicketListClosed`, `MissingCashbackTicketListTracked`.
- States: "Couldn't load your orders", "No matching results", "No orders yet", "Couldn't load this order" + Retry, "Couldn't load your claims", per-tab empty, lookup failed (retry alert), order-ID format errors, invoice permission and "add at least one screenshot".
- Auth: login.
- Money-sensitive: `$` claim submit, `$` invoice upload (ticket).
- Events: `order_select`, `orders_filter_apply`, `missing_cashback_start`, `missing_cashback_step`, `missing_cashback_submit`, `missing_cashback_feedback`.

### F9. Profile, account and help

- Goal: manage my account and get help.
- Entry: Profile tab; Home help icon; Earnings Get Help.
- Steps:
  1. `MainTabs/Profile` [live]: name, masked contact, Edit Profile; My Earnings, Withdraw, Missing Cashback; Never Miss Cashback, Get Help, Call Us; Privacy Policy; Logout. Guest: `GuestPrompt`.
  2. `AccountSettings` [demo]: Save Changes saves nothing.
  3. `EditContactVerifyIdentity` → `EditContactEnterNew` → `EditContactVerifyNew` [demo]: any 6-digit code passes; success shows on `AccountSettings`.
  4. `DeleteAccount` → `DeleteAccountOtp` → `AccountDeleted` [hidden, demo] (D23).
  5. `LogoutConfirmSheet` [live] → Home as guest.
  6. `GetHelp` [live]: topics; missing cashback is gated for guests.
  7. `CashbackGuard` (Never Miss Cashback) [live on Android; iOS shows "Android only"].
  8. `Notifications` [live, always "You're all caught up"], `PrivacyPolicy` [live].
  9. Hidden: `ProfilePaymentHistory*` (D4), `ReviewUs`, `WriteReview` (D14).
- Auth: login for account rows; Get Help, Privacy and Never Miss Cashback work as guest.
- Money-sensitive: `$` contact change (it is the login and payout identity), `$` delete account.
- Events: `profile_menu_select`, `login_prompt_tap`, `contact_edit_start`, `contact_edit_submit`, `logout`, `help_topic_select`, `notification_select`. `cashback_guard_toggle` is defined, never fired. `account_delete_*` and `review_*` fire only on hidden screens.

### F10. Offline and session expiry (cross-cutting)

- Goal: never lose my place or think my money is gone because the network or session failed.
- Offline:
  - `OfflineBanner` [live] at the top while NetInfo says offline. React Query pauses queries (`src/lib/network.ts`).
  - Only the tool screens read `isOffline` and show "You're offline" (`useCardSavings`). Other screens test only `isLoading` and `isError`. A paused query has neither, so Home, Earnings, Offers and Orders fall through to their loaded or empty layout (see risk R6).
- Session expiry:
  - Access token (about 15 min) refreshes silently.
  - A rejected refresh token ends the session (`AuthContext.expireSession`): cache cleared, status `unauthenticated`, and the login sheet opens by itself with source `session_expired`. No `onSuccess` is set, so after login the user stays where they were.
  - A mid-flow return (withdraw OTP, claim draft, invoice upload) is not defined [not built].
- Events: `login_sheet_open` (session_expired); `api_error` from the HTTP monitor (`src/api/http/monitor.ts`, wired in `App.js`) for failed calls.

---

## 2. Missing-state risks (product lens)

Ranked by frequency x severity (H=3, M=2, L=1). Frequency is my estimate; there is no usage data. Ties: higher severity first, then evidence traced in code before evidence inferred or taken from docs, then money-sensitive first. "Evidence" is what I read on 2026-11-19.

| # | Missing or weak state | Who hits it | Freq | Sev | Score | Cost | Evidence |
|---|---|---|---|---|---|---|---|
| R1 | Return from a bank or store page: the app shows the same screen. No "what happens next", no pending Rewards record, no way to say "I applied". The app saves the applied card only to stop cross-sell rails for it. | Every user who clicks out | H | H | 9 | Lost trust, "where is my ₹X Rewards" tickets, missing-cashback claims | Traced: `useClickOut.launch` opens the URL; `addAppliedCard` is read only by `useCrossSellRail.ts`. PRD section 6: bank decisions are invisible. Readiness doc section 4: approval link not confirmed |
| R2 | Closing the eligibility checker during Apply drops the Apply. No bank page, no message. | Every first Apply without saved details, gate `mandatory` | H | H | 9 | Lost click-out on the highest-value tap | Traced: `HomeScreen.tsx` checker `onDismiss` sets `applyPendingCard` to null; `src/experiments/index.ts` `DEFAULTS.eligibility_gate = 'mandatory'` |
| R3 | Blocked click-out is silent. Empty URL: the CTA does nothing. User id not resolved: an OS alert, no retry, no event. | Cards or stores with no link; users right after login on slow networks | M | H | 6 | Lost click-out; invisible in analytics | Traced: `useClickOut.openClickOut` returns on an empty URL; the user-id alerts log nothing; `useTrackedClickout` (logs `clickout_blocked`) has no caller |
| R4 | After a withdrawal, no per-payout record exists. Success goes to Home. Payment History is hidden. Earnings shows a Paid total and a "payout settling" sheet only. The time-out alert says "check Earnings". | Every user who withdraws | M | H | 6 | Money confusion, payout tickets | Traced: D4; `WithdrawSuccess.tsx` → Home; `WithdrawVerifyOTP.tsx` unknown-outcome alert; `useWithdrawGate.tsx` |
| R5 | Edit Profile and contact change say "saved" but save nothing; any OTP passes. | Users who fix a name, email or number (more likely for R9 users) | M | H | 6 | False success on the login and payout identity | Traced: "Demo" comments in `AccountSettingsScreen.tsx` and `EditContactVerify*Screen.tsx`; reachable from Profile |
| R6 | Offline cold start. Home: the timed skeleton ends, then "0 cards" and empty sections. Earnings: ₹0 balances. Offers: "No offers here yet". Orders: "No orders yet". Only the top banner says offline. | Users who open the app on a weak network | M | H | 6 | Money confusion (₹0), wrong "no orders" message, tickets | Branches traced in `HomeScreen.tsx` (`noResults` needs a filter), `EarningsScreen.tsx` (`?? '₹0'`), `OffersScreen.tsx`, `OrdersList.tsx`. Inferred: TanStack v5 marks a paused query neither loading nor error. Not seen on a device |
| R7 | Tool league table: top rows can be cards the app cannot sell (no Apply, no card page). In one test the rank 1 card was not in the app, so the top row had no Apply. No "why can't I apply" state. | Most tool users | H | M | 6 | Lost click-out at peak intent; trust | D27 directional (`SHOW_CARDS_NOT_IN_APP` true); STATE.md tools open item (e) |
| R8 | No "Redirecting to <bank or store>, cashback is tracked" step and no pre-apply terms to accept (finish in one session, claim window). The tracking timeline exists only behind the optional "Learn how it works?" link. | Every click-out | H | M | 6 | Untracked orders and applications, later claims | Traced: no "Redirecting" or "Accept" sheet in `src/`; `HowItWorksSheet.tsx` steps. Figma frames named in `GAP_AUDIT.md` (5873:27578, section 27) |
| R9 | New users get a generated placeholder email. Profile shows it masked. Payout, claim and reset emails never reach them. | Every new signup | H | M | 6 | Lost communication, confusion at a strange email | Repo D16; `ProfileScreen.tsx` shows `maskEmail(profile.email)` |
| R10 | Offers tab may be empty on production: "No offers here yet" on every visit. | Every Offers visitor, if stores are still unmapped | H | M | 6 | A whole revenue tab looks broken; lost store click-outs | Doc only: D11; readiness doc D-a. Not re-checked since 2026-11-09 |
| R11 | Apply from tools, advisor, "Cards you can get" and store best cards skips the eligibility gate that Home runs. Same card, different friction, no verdict. | Users on those surfaces | M | M | 4 | Approval quality, mixed experience | Traced: `useCardDetailSheet.tsx` sends `eligibility_known: false` and opens the click-out; `HomeScreen.handleApply` gates |
| R12 | Bank Transfer is "Coming soon" on the method screen. Users with no UPI can only take a gift card. | Users without UPI | M | M | 4 | Money trust, payout tickets | Traced: `WithdrawScreen.tsx` Bank Transfer row |
| R13 | A claim that was not tracked shows the backend comment or a generic line, then says "raise a ticket from Get Help". Get Help's missing-cashback topic restarts the same intake. | Users whose claim fails | M | M | 4 | Loop, support tickets | Traced: `missingCashbackMapper.ts` `claimReason`; `GetHelpScreen.tsx` → `MissingCashbackHelp`. The queue API refuses the Rejected filter (`useMissingCashback.ts`) |
| R14 | Order detail "Need Help" restarts the claim from store choice; the order's store, date and ID are not carried. | Users who start from a missing order | M | M | 4 | Re-entry effort, wrong-store claims | Traced: `OrdersDetail.tsx` navigates to `MissingCashbackWhereDidYouShop` with no params |
| R15 | Rejection sheet with zero alternatives (low income). What the sheet shows then is not designed. | Low-income users who get a "no" | M | M | 4 | Dead end at the planned recovery moment | Doc only: STATE.md (cause unknown); PRD section 9 (4 eligible cards at ₹15,000 a month) |
| R16 | A user who wants to delete the account has no path (entry hidden). | Users leaving the app | L | H | 3 | Store compliance and legal risk | Traced: D23; hidden link in `AccountSettingsScreen.tsx` |
| R17 | Session expires during a money step (withdraw OTP, claim submit, invoice upload). The login sheet opens, the cache clears, and the return to the step is not defined. | Users with a long-idle session | L | H | 3 | Lost payout or claim attempt, double submits | Traced: `AuthContext.expireSession`; `LoginSheetProvider` opens with no `onSuccess`; withdraw screens read only `accessToken`. The screen result is inferred, not seen |
| R18 | Invoice above about 4.4 MB fails at the BFF, but the app allows 6 MB. The error copy for this case is not designed. | C1-Other and C2 claimants with large files | L | H | 3 | Ticket cannot be raised | Doc only: readiness doc section 4 (Vercel body limit) |
| R19 | Notifications always says "You're all caught up". The bell suggests a feature that does not exist. | Every user who taps the bell | H | L | 3 | Small trust cost | Traced: `NotificationsScreen.tsx`; no API |
| R20 | OTP rate limit (5 per number, 10 per IP in 10 minutes) shows the raw API message, with no time to retry. | Users on shared networks, repeat requesters | L | M | 2 | Blocked login | Readiness doc section 4; `LoginSheetProvider` shows `e.message` |

Consciously not covered (beyond 20, or lower score):
- Cross-sell rail opens below the visible area and looks like nothing happened (PRD section 9, open UX item).
- Advisor went back to its first question and closed, seen once (D28, cause unknown).
- iOS swipe-back from the full ranking shows old spends after an edit (STATE.md tools open item a).
- A card with no alias is always "maybe" (`classifyCardEligibility`).
- Similar stores on the store page do not open a store (`screen-flows.md` gap 7, not re-checked).
- Never Miss Cashback is Android-only; iOS shows a notice.
- No force-update or maintenance state (OTA updates only).
- Home has no empty state when the catalogue returns 0 cards with no filters (`screen-flows.md` gap 3); partly the same as R6.
- Stale doc claims I checked and found fixed in code: the dropped click after "Log in to earn" (now continues), Earnings ₹0 on a load error (now an error state), silent income fallback on eligibility error (now an error message), store placeholder coupons (now hidden), "Learn More" no-ops (now wired), combined balance forced to gift card (now both sections).

---

## 3. Storybook information architecture

### 3.1 Top level

```
Introduction            how to use, state tags, the pick-table rule
Foundations
Components/<family>
Patterns
Flows/<flow>/<step>
```

### 3.2 Foundations

```
Foundations/
  Explaining tokens     src/tokens/index.ts, semantic vs raw, the D17 Saffron rule
  Colors                src/tokens/colors.ts, gradients.ts, src/theme/gradients.ts
  Typography            src/tokens/typography.ts (Outfit, 5 weights), D7 no font caps
  Values                src/tokens/spacing.ts (spacing, radius, borderWidth), opacity.ts
  Sizes                 src/tokens/spacing.ts (iconSize, avatarSize, mediaSize, sizing)
  Shadows               src/tokens/elevation.ts
  Icons                 src/assets/icons; story links to Components/Media/Icon
  Imagery               src/assets/images, logos.ts; links to Components/Media
  Animations            src/tokens/motion.ts, src/assets/animations; links to Components/Motion
```

### 3.3 Components

Rules: each `.tsx` file in `src/atoms` (40), `src/molecules` (38) and `src/organisms` (68) appears once below. A file with several exports is one entry; its other exports become stories of that page. `PICK` = the family page needs a "pick the right one in 5 seconds" table. `(unused)` = no screen uses it today. `(not in reference)` = a family the reference site does not have.

```
Components/
  Buttons                                   PICK (variant x tone table, D17)
    `atoms/Button`
  Badge and Tag                             PICK
    `atoms/Badge`
    `atoms/Tag`
    `atoms/StatusBadge`
    `atoms/CashbackBadge`
    `atoms/CashbackTag`
    `atoms/CardTypeTag`
    `atoms/WalletTag`                       (unused)
    `atoms/RankBadge`
    `atoms/NumberBadge`                     (unused)
    `atoms/TestimonialSavingsTag`           (unused)
  Input fields                              PICK
    `atoms/Input`
    `atoms/TextArea`
    `atoms/OtpInput`
    `atoms/OtpBox`                          (unused)
    `molecules/AmountInput`
    `molecules/SpendCard`
    `molecules/SearchBar`                   stories: SearchBar, SearchResults
  Selections                                PICK
    `atoms/Chip`
    `atoms/Selector`
    `atoms/Checkbox`
    `atoms/Radio`
    `atoms/DateSelection`
    `atoms/MonthSelector`
    `atoms/Rating`
    `molecules/Choice`
    `molecules/FilterRow`
    `molecules/InlineFilterQuestion`
    `molecules/TermsAndConditions`
  Switches
    `atoms/Switch`
  Tab bar                                   PICK
    `organisms/BottomNav`
    `molecules/TabPrimary`
    `molecules/TabsSecondary`
  Header and titles                         PICK (read with Mastheads)
    `organisms/Header`
    `organisms/HomeHeader`
    `organisms/MastheadHeader`
  Mastheads                                 PICK (read with Header and titles)
    `organisms/Masthead`                    stories: Masthead, OffersCategoryStrip
    `organisms/CardDetailMasthead`
    `organisms/EligibilityMasthead`
    `organisms/MissingCashbackMasthead`
  Messages and tooltips                     PICK
    `molecules/InlineMessage`
    `molecules/StripAlert`
    `molecules/Toast`
    `molecules/Tooltip`
    `molecules/OfflineBanner`
    `molecules/TrackMoreBanner`
  Cards                                     PICK (two tables: credit card displays, content cards)
    Credit card displays
      `molecules/CardTile`                  legacy tile; home of the CardModel type
      `organisms/CardTile`                  current tile (Figma 3762:85548)
      `molecules/CompareCard`
      `molecules/GainBand`
      `molecules/RankedCardRow`
      `molecules/LeagueCardRow`
      `molecules/CardFeeStrip`
    Content cards
      `molecules/PartnerCard`               (unused)
      `molecules/BigAmountCard`             (unused)
      `molecules/HelpTicketCard`
      `molecules/PaymentRecordCard`         (screen hidden, D4)
      `molecules/ReviewCard`                (screen hidden, D14)
      `organisms/OrderCard`
  Tables
    `molecules/CompareTable`
    `molecules/BreakdownTable`
  Steppers                                  PICK
    `atoms/StepIndicator`
    `atoms/StepProgress`
    `molecules/Stepper`
    `organisms/ProcessSteps`
    `organisms/Timeline`
    `organisms/QuizStep`                    (unused in screens; DS gallery only)
  Accordions
    `molecules/Accordion`
  Gamification                              no component yet
  Lists                                     PICK
    `molecules/ListRow`
    `molecules/AmountActionRow`
    `molecules/DiscBulletList`
    `organisms/OrderRow`
  Avatar
    `organisms/CreditCardAdvisorAvatar`     parts: creditCardAdvisorAvatar/Body, Face, useAvatarMotion
  Grids
    `organisms/Grid`
  Carousels                                 PICK
    `organisms/Carousels`                   stories: CreditCardOffer, CategoryTiles, HowItWorks, MilestoneStat, PromoBanner, CardCarousel, BestForSpending
    `organisms/CrossSellRail`
    `organisms/ToolsRow`
    `molecules/CategoryCircle`              (unused)
    `atoms/Indicator`
  Footers
    `organisms/Footer`
    `organisms/FooterButtons`
  Divider
    `atoms/Divider`
    `atoms/DividerVertical`
  Text and numbers                          (not in reference)
    `atoms/Text`
    `atoms/GradientText`
    `atoms/RollingAmount`
    `atoms/StatDelta`
    `atoms/Timer`
  Media                                     PICK (logo look-alikes) (not in reference)
    `atoms/Icon`
    `atoms/InfoCircleGlyph`
    `atoms/RemoteImage`
    `atoms/BrandLogoTile`
    `atoms/LogoContainer`
    `molecules/BrandLogo`                   stories: BrandLogo, BrandLogoGrid
    `organisms/CardArt`
  Charts                                    PICK (not in reference)
    `molecules/BarBreakdown`
    `molecules/StackedBar`
    `molecules/PodiumCompare`
  Loading                                   PICK (not in reference)
    `atoms/Skeleton`
    `atoms/AmountSkeleton`
    `organisms/HomeSkeleton`                stories: HomeSkeleton, CardListSkeleton
  Empty and error                           (not in reference)
    `organisms/ScreenState`
    `organisms/GuestPrompt`
  Motion                                    (not in reference)
    `organisms/StaggeredEntrance`
    `organisms/FilterTransitionOverlay`
  Sheets                                    PICK per sub-group (not in reference)
    Shell
      `organisms/BottomSheet`
      `organisms/BottomSheetHeader`
      `organisms/BottomSheetBody`
    Auth
      `organisms/EarnLoginSheet`
      `organisms/LoginSheet`                (unused; the app uses LoginSheetProvider's own UI)
      `organisms/LogoutConfirmSheet`
    Eligibility
      `organisms/EligibilityCheckerSheet`
      `organisms/EligibleSheet`
      `organisms/MaybeSheet`
      `organisms/IneligibleSheet`
    Money
      `organisms/EarningsBreakupSheet`
      `organisms/EarningStatusSheet`
      `organisms/CashbackNotConfirmedSheet`
      `organisms/PaymentProcessingSheet`
    Claims
      `organisms/MissingCashbackSummarySheet`
      `organisms/WhatWentWrongInfoSheet`
      `organisms/WhatWentWrongFeedbackSheet`
      `organisms/FeedbackAppreciatedSheet`
    Filters and pickers
      `organisms/FilterMenu`
      `organisms/OrdersFilterMenu`
      `organisms/SelectMonthSheet`
    Card and share
      `organisms/HowItWorksSheet`           stories: HowItWorksSheet, OrnamentLabel
      `organisms/ShareSheet`
    Tools
      `organisms/SavingsBreakdownSheet`
      `organisms/EditSpendsSheet`
    Search and promo
      `organisms/SearchTopSheet`            stories: SearchTopSheet, SearchTopSheetProvider
      `organisms/PromoTopSheet`
  Page sections                             (not in reference)
    Card detail
      `organisms/CardDetailSheet`           iOS card detail
      `organisms/CardDetailScreenAndroid`   Android card detail (D18)
    Store page
      `organisms/StoreAboutBrand`
      `organisms/StoreCashbackDetails`
      `organisms/StoreOfferDetails`
      `organisms/StoreBenefitDetails`
      `organisms/HowToGetOfferCard`
      `organisms/StoreCashbackTimelines`
      `organisms/StoreTermsConditions`
      `organisms/StoreBestCards`
      `organisms/StoreSimilarStore`
      `organisms/StoreFaq`
    Never Miss Cashback prompts
      `organisms/NeverMissCashbackNudge`
      `organisms/CashbackPip`
```

### 3.4 Pick-the-right-one tables needed

Each table lists the look-alikes, the job of each, and the one question that picks it. Screen-local look-alikes appear in the table only, not in the Components tree.

| Family page | Look-alikes the table must separate | Deciding question |
|---|---|---|
| Cards: credit card displays | `molecules/CardTile`, `organisms/CardTile`, `RankedCardRow`, `LeagueCardRow`, `CompareCard`; screen-local `HomeCardTile` (`HomeScreen.tsx`), `AdvisorCardTile` (`screens/advisor`) | Browse list, ranked result, league row with a sum, or a comparison against a card the user left? |
| Badge and Tag | `Badge`, `Tag`, `StatusBadge`, `CashbackBadge`, `CashbackTag`, `WalletTag`, `CardTypeTag`, `RankBadge`, `NumberBadge`, `TestimonialSavingsTag` | Status, money amount, card type, rank or count? |
| Messages and tooltips | `InlineMessage`, `StripAlert`, `Toast`, `Tooltip`, `OfflineBanner`, `TrackMoreBanner` | In-flow, attached to a strip, transient, on demand, app-wide or promotional? |
| Selections | `Chip`, `Selector`, `Choice`, `Checkbox`, `Radio`, `FilterRow`, `InlineFilterQuestion` | One or many, filter or answer, inline or in a sheet? |
| Input fields | `Input`, `AmountInput`, `SpendCard`, `OtpInput`, `OtpBox`, `SearchBar` | Text, rupees, OTP or search? |
| Header and titles + Mastheads | `Header`, `HomeHeader`, `MastheadHeader`, `Masthead`, `CardDetailMasthead`, `EligibilityMasthead`, `MissingCashbackMasthead` | Plain screen, Home, or a hero block? |
| Steppers | `StepIndicator`, `StepProgress`, `Stepper`, `ProcessSteps`, `Timeline`, `QuizStep`, `atoms/Indicator` (steps variant) | Progress through a flow, explanation of steps, or status history? |
| Lists | `ListRow`, `AmountActionRow`, `DiscBulletList`, `OrderRow` | Menu row, amount with a CTA, bullet copy or an order? |
| Tab bar | `BottomNav`, `TabPrimary`, `TabsSecondary` | App navigation, page tabs or a segment control? |
| Carousels | `Carousels` exports, `CrossSellRail`, `ToolsRow`, `CategoryCircle` | Content rail, recovery rail or tools entry? |
| Media (logos) | `BrandLogoTile`, `LogoContainer`, `BrandLogo` | Which frame size and where (grid, order row, store)? |
| Charts | `BarBreakdown`, `StackedBar`, `PodiumCompare` | Ranked items, parts of one total, or two cards head to head? |
| Loading | `Skeleton`, `AmountSkeleton`, `HomeSkeleton`/`CardListSkeleton` | Generic block, amount, or a whole layout? |
| Sheets: Eligibility | `EligibleSheet`, `MaybeSheet`, `IneligibleSheet` vs the inline `EligibilityResultBanner` in `CardDetailSheet` | Verdict after Apply, or a result inside the detail? |
| Sheets: Auth | `EarnLoginSheet`, `LoginSheet` (unused), the `LoginSheetProvider` UI | Earn prompt before a click-out, or the real login? |
| Buttons | `Button` variants and tones, `FooterButtons`, withdraw `methodRow` (screen-local) | Solid (Saffron only, D17), outline, link, or sticky footer? |

### 3.5 Patterns

Each pattern page shows the rule, then links to the components and to the flow steps where it appears. It does not list components again.

```
Patterns/
  Loading                 skeleton first, wait line for long calls (tools), no spinner on money values
  Empty                   ScreenState: empty, no results, no match with closest cards
  Error and retry         ScreenState error + Try again; inline errors (eligibility, OTP)
  Offline                 OfflineBanner + paused queries; tools "You're offline"; [not built] for R6 screens
  Guest gate              GuestPrompt (tabs), EarnLoginSheet (click-out), login sheet (Get Help)
  Session expiry          auto-open login sheet; [not built] return to a money step (R17)
  Toast and feedback      Toast, InlineMessage success, FeedbackAppreciatedSheet, haptics
  Click-out               one attributed path (D13): guest, signed in, blocked; [not built] redirect step (R8), return state (R1)
  OTP entry               6 boxes (D19), resend timer, error, rate limit (R20)
  Eligibility verdict     one classifier (eligible, maybe, ineligible), error state, reason rules (D22)
  Money confirmation      unknown-outcome rule (no resubmit), success with no swipe back
```

### 3.6 Flows

Each step is a page with its states as stories. Tags follow "How to read this file".

```
Flows/
  1 Launch and login/
    Splash                          default, session loading
    Onboarding                      slides, guest start
    Login sheet                     phone, phone error, OTP, OTP wrong, resend, rate limit [not built], new-number name, success
    Greeting                        signup only
  2 Home and discovery/
    Home                            loading, loaded guest, loaded with eligibility groups, no match + closest, load error, offline [not built], empty catalogue [not built]
    Search                          popular, results, no results + advisor row
    Filters                         menu, applied, transition
    Eligibility checker             empty, validation errors, checking, error
    Notifications                   always empty (R19)
  3a Card detail and apply/
    Card detail (iOS sheet)         loading benefits, loaded, inline result banners (4, 5, 6 and 3b link here)
    Card detail (Android screen)    same states
    Apply gate                      checker opened by Apply, dismissed (drops Apply, R2)
    Result sheets                   eligible, maybe, ineligible
    Click-out                       guest earn prompt, signed in, user id missing, empty URL [no state today, R3], redirect [not built, R8], return [not built, R1]
    All card benefits               loading, loaded, error, not available
    How it works sheet              tracking steps (opt-in link)
    Share sheet                     tiles
  3b Rejection/
    Rejection sheet                 income reason, generic reason, 3 picks, zero picks [not built, R15]
    Cards you can get (rejection)   loading, loaded, filters, no match, error
  3c Bounce/
    Cross-sell rail                 lenses, viewed pick, hidden, off screen (not covered)
    Cards you can get (bounce)      eligibility unknown copy, known copy
  4a Best for category/             category pick, questions, results
  4b Beat my card/                  spends from saved or quiz, pick list, result (4 verdicts), full ranking
  4c Ultimate card/                 quiz step, skip, results
  4d Best for brands/               brand pick, limit reached, spends, results
  4 Shared result/
    League table                    loading, loaded, by category, offline, error, empty, no filter match, row not in app (R7)
    Savings breakdown sheet         sellable card, not-in-app card, user's own card
    Edit spends sheet               edit, saved
  5 Card advisor/
    Chat                            intro, question, reveal, tip, eligibility bridge, form, likely to qualify, eligibility error, relaxed, end menu, change answer, start-over confirm, catalogue error
    Results                         loaded, sorted, free only, no cards
  6 Offers/
    Offers tab                      loading, loaded, promo sheet, empty "No offers here yet" (R10), error
    Store page                      loading, loaded, error, best cards, share
  7 Earnings and withdraw/
    Earnings                        guest, loading, loaded, error, offline ₹0 [not built fix, R6]
    Withdraw gate                   settling, nothing to withdraw, below minimum, balance error
    Method select                   cashback, cashback + rewards, both, Bank Transfer coming soon (R12)
    Details (UPI, Amazon, Flipkart) empty, invalid, consent, OTP send error
    Verify OTP                      entry, wrong, resend, connection problem, payment failed, unknown outcome, session expired (R17)
    Success                         per method; payout record after success [not built, R4]
  8 Orders and missing cashback/
    Orders list                     loading, loaded, filters, no results, no orders, error
    Order detail                    pending, delayed, cancelled, confirmed, paid, error; Need Help without context (R14)
    Claims list                     tabs, per-tab empty, error, not tracked, Get Help loop (R13)
    Did you shop                    yes, no + feedback
    Where did you shop              list, Oops no visits, lookup error
    Date, order ID, amount          validation, server error
    Outcomes                        tracked, queued, auto-tracking, new-user check, category, invoice upload, file too large [not built, R18], ticket raised
  9 Profile and account/
    Profile                         guest, loaded, masked placeholder email (R9)
    Account settings                [demo] save, contact change success (R5)
    Edit contact                    [demo] verify identity, enter new, verify new
    Delete account                  [hidden, demo] (R16)
    Logout                          confirm sheet
    Get Help                        topics, guest gate
    Never Miss Cashback             Android setup steps, iOS notice
    Privacy policy
    Hidden screens                  Payment History (D4), Review Us and Write Review (D14), shown for reference only
  10 Offline and session/           offline banner, paused screens, session-expired sheet, mid-flow return [not built]
```

---

## 4. Open product questions the Storybook will surface

Owners are roles. None of these is settled here.

1. Home Apply gate: keep `mandatory` eligibility before the first Apply, or ship `skippable`? Owner: product owner (A/B setup: analytics owner).
2. Should Apply from tools, advisor, "Cards you can get" (bounce door) and store best cards run the same gate as Home? Owner: product owner.
3. When the user closes the checker opened by Apply, drop the Apply (today) or continue to the bank without a verdict? Owner: product owner.
4. League table scope (D27, directional): show cards the app cannot sell, loss-making and discontinued cards, and keep Apply only in the breakdown sheet (`APPLY_ON_ROWS`)? Owner: product owner.
5. What does the user see before and after a click-out (redirect step, T&C, a "did you apply" return state), given bank approvals are not visible? Owner: product owner with the CashKaro tracking team.
6. `crosssell_rail` default: `rail` (today) or `holdout` before any release? Owner: product owner.
7. Demo account flows (Edit Profile save, contact change): hide them until the CashKaro profile APIs exist, or keep them? Owner: product owner with the CashKaro mini-app backend team.
8. New users get a generated email (D16): collect a real email, and at which step (signup, first withdrawal, first claim)? Owner: product owner.
