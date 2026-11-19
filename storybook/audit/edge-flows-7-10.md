# Edge and loader audit: flows 7 to 10

Audited 2026-11-19 [claude] on branch `claude/storybook` (worktree `cards.xtra-storybook`). Read-only code audit, PM + UX lens. Nothing was run in a browser or on a device. Line numbers are from this branch.

## How to read this file

- Status tokens (exactly one per row): `STORY` (an existing story shows it), `LIVE-NO-STORY` (the app handles it, file:line, no story yet), `MISSING` (no code path; design proposed from existing DS parts and tokens only), `N/A` (does not apply, reason given).
- A `STORY` row can still show an app bug. The bug is in the evidence column.
- `LIVE-NO-STORY` means the app has a code path for the edge (correct or buggy) and no story shows it. The proposal column says one of three things: a story to add, "covered by" another story, or "not renderable" / "no story" with the reason.
- Story ids drop the flow prefix. Prefixes: flow 7 `flows-7-earnings-and-withdraw-`, flow 8 `flows-8-orders-and-missing-cashback-`, flow 9 `flows-9-profile-and-account-`, flow 10 `flows-10-offline-and-session-`.
- Harness shorthand: `ok{x: y}` = `api.ok({ x: y })`. `seed(qk, data)` = `beforeMount: () => queryClient.setQueryData(qk, data)` (stories may import `queryClient`, `qk` and mappers from `src/`; they do not edit `src/`). `w360` = `ScreenHarness width={360}`.
- Proposals reuse the copy in `ux-states.md` where one exists. Proposals do not repeat the 22 proposed stories that already exist (`proposed-states.md`).
- Money and attribution edges are listed first in each table.

## 0. Cross-cutting rows (logged once, not repeated per screen)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Pull to refresh (Earnings, Orders, Claims, Profile) | `MISSING` | No `RefreshControl` in any in-scope screen (grep of `src/screens`). Refresh happens only on focus (`src/query/useRefetchOnFocus.ts`). | RN `RefreshControl` with `tintColor={colors.action.primary.default}` on the four ScrollViews. No copy. Not renderable on react-native-web: gap G13, no story. |
| Slow network, >5 s, any call | `MISSING` | Per-attempt deadline 15 s (`src/api/http/client.ts:50`), payouts 30 s (`src/api/payments.ts:210`), GET retries 2 times (`client.ts:196`). No screen shows a "still working" line. | Money steps only: see Verify OTP and Invoice upload rows. Elsewhere the existing spinner or skeleton is enough. |
| Offline at cold start, no cache | `STORY` | `paused-screens--*-offline` (8 screens) and their `*-offline-fix` proposals | Add only the screens not covered: Choose date (8.6), Method select (7.3). |
| Native `Alert` used for an error | `STORY` | Preview shim draws it (`storybook/.storybook/preview.tsx:3`). | No change. Each Alert row below names its replacement or says one exists. |
| 360 dp width | `LIVE-NO-STORY` | `ScreenHarness` takes `width` (harness README section 2). Valid only where the layout does not read `useWindowDimensions` (README section 8). | `w360` stories on Verify OTP, Earnings (large amount), Orders list (long names), Method select. |
| 403 on a user call (gateway or bad key) | `LIVE-NO-STORY` | Only 401 triggers a refresh (`src/api/http/tokenManager.ts:199`-`200`); 403 is not expiry (`:166`-`168`). Screens show their generic error. | Story `Forbidden403` (Earnings): `ok{earnings: reply.error(403)}`. Same "Couldn't load your earnings"; a retry cannot help. Open question Q12. |
| 130% font, soft keyboard, Android hardware back, camera and file picker | `N/A` | Web build: no font scale, no keyboard, `BackHandler` stubbed (`storybook/.storybook/preview.tsx:6`), `expo-image-picker` is the real web module (`storybook/.storybook/main.ts:75`) and cannot be seeded or denied. | Device QA list in "Gaps and unsupported" (G9, G10, G11, G12). |

---

## Flow 7. Earnings and withdraw

### 7.1 Earnings (`src/screens/EarningsScreen.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Guest | `STORY` | `earnings--guest` | |
| First load skeleton | `STORY` | `earnings--loading` | |
| Server 5xx, no cache | `STORY` | `earnings--load-error` (`EarningsScreen.tsx:199`) | |
| Offline cold start, no cache: ₹0 | `STORY` | `earnings--offline-shows-zero`, `earnings--offline-proposed`, `paused-screens--earnings-offline-fix` | |
| Offline with cache (stale balance, no "last updated") | `LIVE-NO-STORY` | `loading = isLoading && !earnings` (`EarningsScreen.tsx:96`): cached values show with no staleness cue; only the banner says offline. The harness uses the app's `queryClient` singleton (`storybook/harness/ScreenHarness.tsx:20`), so a seed works. | Story `OfflineWithCache`: `seed(qk.user.earnings(), mapEarnings(earningsFixture.typical))` + `api.offline()`. Orders are not seeded, so the transactions list shows its empty line: a second false empty, part of the state. Open question Q3. |
| Partial response: null amount fields read ₹0 | `LIVE-NO-STORY` | `money(confirmed ?? 0)` and siblings (`src/api/earningsMapper.ts:91`-`107`) | Story `MissingAmountFields`: earnings body cloned from `earningsFixture.typical` with the confirmed and pending fields set to `null`. Design: gap G6 (never ₹0 for unknown). |
| Session restoring: ₹0 flash | `N/A` | Harness `signedIn` seeds tokens at once; the restore window cannot be held. Already in `ux-states.md` flow 6. | |
| Huge amounts (₹14.5 lakh) | `STORY` | `earnings--loaded-large-amounts`. `RollingAmount` renders "0" on web (README section 8), so the headline is not checked. | Story `LargeAmounts360`: `ok{earnings: earningsFixture.rich}` + `w360`, for the cards below the headline. |
| Zero earnings | `STORY` | `earnings--zero` | |
| Pending "Know why?" sheet (`EarningStatusSheet`) | `STORY` | `earnings--pending-sheet` | |
| Cashback or Rewards breakup sheet opened while amounts load: ₹0 rows | `LIVE-NO-STORY` | Stat cards open the sheet at any time (`EarningsScreen.tsx:276`-`277`); the sheet defaults every amount to ₹0 (`src/organisms/EarningsBreakupSheet.tsx:174`). | Story `BreakupSheet`: `api.ok()`, play taps the Cashback stat card. Story `BreakupSheetWhileLoading`: `api.loading()`, same play. Gap G6. |
| Transactions: loading, error, empty | `STORY` | `earnings--transactions-error`, `earnings--transactions-empty`; loading inside `earnings--loading` | |
| Session expires on this screen | `STORY` | `session-expired--earnings-session-expired` | |
| Pull to refresh | `MISSING` | Section 0 | |

### 7.2 Withdraw gate (`src/screens/withdraw/useWithdrawGate.tsx`; sheets `CashbackNotConfirmedSheet`, `PaymentProcessingSheet`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Payout already settling (5002) | `STORY` | `withdraw-gate--settling` (`useWithdrawGate.tsx:100`) | |
| Payout settling but the 5002 answer has no `requested_earnings`: sheet shows ₹0 | `LIVE-NO-STORY` | `parseFloat(...) \|\| 0` (`src/api/payments.ts:74`), shown at `useWithdrawGate.tsx:128`. | Story `SettlingNoAmount`: `ok{paymentInfo: reply.code(400, '5002', 'A payment request from you is already pending.')}` (no meta), play taps Withdraw. Gap G6. |
| Nothing confirmed | `STORY` | `withdraw-gate--nothing-to-withdraw` (`:103`) | |
| Below minimum | `STORY` | `withdraw-gate--below-minimum` (`:106`) | |
| Exactly the minimum (₹250 combined) passes | `LIVE-NO-STORY` | `combined < minimum` (`:106`): equal proceeds. | Story `ExactlyMinimum`: earnings cloned from `earningsFixture.belowThreshold` with confirmed ₹250 and rewards ₹0; `paymentInfo` default (threshold 250). Expect the WithdrawStack stub. |
| Earnings say "enough", payment info says 5003 (below threshold) | `LIVE-NO-STORY` | `belowThreshold` is set (`src/query/usePaymentInfo.ts:86`) but no screen reads it (grep). The gate compares earnings only (`:92`, `:106`), so the user proceeds and fails after the OTP. | Story `PaymentInfoSaysBelowThreshold`: `ok{paymentInfo: paymentInfoFixture.belowThreshold}` with default earnings (₹1,590). Expect the stub. Gap G3, P1. |
| Balance cannot load | `STORY` | `withdraw-gate--balance-error`, `withdraw-gate--balance-error-proposed` | |
| Slow balance (tap before payment info resolves) | `LIVE-NO-STORY` | Tap awaits `refetch` (`:59`-`70`) with no feedback; up to 3 x 15 s. | Story `SlowBalance`: `ok{paymentInfo: reply.delay(8000, paymentInfoFixture.default)}`, play taps Withdraw at 800 ms. |
| Slow balance, design | `MISSING` | `AmountActionRow` has `loading` for the amount only (`src/molecules/AmountActionRow.tsx:76`), not for its action. | Proposed `CheckingBalanceProposed`: `Toast` tone `info`, message "Checking your balance…", no action. Needs DS gap G1 (action loading) or the toast host (ux-states DS gap 2). |
| Double tap on Withdraw | `LIVE-NO-STORY` | No re-entry guard in `startWithdraw` (`:51`). Two taps can present a sheet twice or push the stack twice. | Low. In "Consciously not covered". |
| Offline with cache | `N/A` | Gate uses cached data and proceeds; the failure surfaces at Send OTP (7.4). | |

### 7.3 Method select (`src/screens/WithdrawScreen.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Amount loading "—" | `STORY` | `method-select--loading` (`WithdrawScreen.tsx:195`) | |
| Rows tappable while loading: draft amount ₹0 | `LIVE-NO-STORY` | `rowsFor` ignores `loading` (`:224`, `:248`, `:267`); `amountNum` returns 0 before data (`:188`). Low reach: the only entries (`EarningsScreen.tsx:138`, `ProfileScreen.tsx:79`) pass the gate, which loads earnings into the shared cache first. The payout POST sends no amount (`src/query/mutations/withdraw.ts:57`-`59`), so ₹0 is a display and analytics error, not a ₹0 payout. | Story `TapWhileLoading`: `ok{earnings: reply.hang()}`, play taps "UPI payments". The stub shows `amount: 0`. Gap G4, P2. |
| Earnings error: ₹0 and live rows | `LIVE-NO-STORY` | Screen reads only `isLoading` (`:184`); an error gives `loading=false`, amounts ₹0. Reachable when the cache is cleared after the gate (session expiry clears it, `src/auth/AuthContext.tsx:202`) or a focus refetch fails with no data. | Story `EarningsError`: `ok{earnings: reply.error(500)}`. |
| Earnings error, design | `MISSING` | | Proposed `EarningsErrorProposed`: `ScreenState` title "Couldn't load your balance", body "Check your connection and try again.", actionLabel "Try again". Rows hidden. |
| Cashback only, rewards only, both | `STORY` | `method-select--cashback-only`, `--rewards-only`, `--cashback-and-rewards` | |
| Bank transfer not available | `STORY` | `method-select--bank-transfer-coming-soon` | |
| Payment method ids missing: silent default ids | `LIVE-NO-STORY` | `extractPaymentMethodIds` falls back to built-in ids and only reports (`src/api/payments.ts:132`). Nothing visible. | No story (no visible state). Gap G5, P0. |
| 360 dp, huge amount | `LIVE-NO-STORY` | Masthead `payment` variant. | Story `Narrow360LargeAmount`: earnings with confirmed ₹10,00,000 + `w360`. |

### 7.4 Details: UPI, Amazon, Flipkart, gift card chooser (`src/screens/withdraw/`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Empty, invalid, mismatch, consent, sending | `STORY` | `details--upi-*`, `details--amazon-*`, `details--flipkart-*` | |
| Send OTP 5xx | `STORY` | `details--upi-send-otp-failed`, `details--upi-send-otp-failed-proposed` | |
| Send OTP dropped connection | `LIVE-NO-STORY` | Same Alert, transport message (`WithdrawEnterUPI.tsx:75`) | Story `UpiSendOtpOffline`: `ok{sendOtp: reply.network()}`, same play as `UpiSendOtpFailed`. |
| Send OTP 429 rate limit: raw server text, no wait time | `LIVE-NO-STORY` | `Alert('Could not send OTP', e.message)` (`WithdrawEnterUPI.tsx:75`, `WithdrawAmazon.tsx:99`, `WithdrawFlipkart.tsx:92`) | Story `UpiSendOtpRateLimited`: `ok{sendOtp: sendOtpFixture.rateLimited}`. |
| Send OTP 429, design | `MISSING` | | Proposed `UpiSendOtpRateLimitedProposed`: `InlineMessage` tone `warning`, message "Too many OTP requests. Please try again in a few minutes." Get Paid disabled. Open question Q5 (wait time). |
| Session ended on the form: Get Paid does nothing | `LIVE-NO-STORY` | `if (!accessToken \|\| sending) return;` (`WithdrawEnterUPI.tsx:59`, `WithdrawAmazon.tsx:83`, `WithdrawFlipkart.tsx:76`): silent no-op. | Story `UpiSessionEnded`: `auth="sessionExpired"`, play types `user@upi`, ticks, taps Get Paid. Design: reuse `mid-flow-return--withdraw-otp-session-ended`. |
| Double tap Get Paid | `LIVE-NO-STORY` | State guard `sending` only (`:59`); a same-frame double tap can send 2 OTPs. Harmless (OTP, not money). | Not covered. |
| First withdrawal vs returning | `N/A` | No saved payout details: every withdrawal starts with an empty UPI id, mobile or email (`WithdrawEnterUPI.tsx:48`). Nothing differs for a returning user. | Open question Q11. |
| Long UPI id or email | `N/A` | `Input` single line; device check only. | |
| Keyboard over the footer | `N/A` | Fixed with `useKeyboardPadding` (`WithdrawEnterUPI.tsx:44`); device only. | |
| Gift card chooser | `STORY` | `details--gift-card-chooser`, `--gift-card-chooser-combined` | |

### 7.5 Terms (`src/screens/withdraw/WithdrawTerms.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| UPI, Amazon, Flipkart, Bank | `STORY` | `terms--upi`, `--amazon`, `--flipkart`, `--bank` | |
| Network, server, data, loaders | `N/A` | Static content (`termsContent.ts`). `mailto:` has no catch (`WithdrawTerms.tsx:76`): no mail app means nothing happens. | Low. Not covered. |

### 7.6 Verify OTP (`src/screens/withdraw/WithdrawVerifyOTP.tsx`, `src/query/mutations/withdraw.ts`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Payout 502/503/504: treated as a final failure | `LIVE-NO-STORY` | Only `timeout` and `network` count as unknown (`withdraw.ts:86`). A 5xx from a gateway is shown as `Alert('Payment failed')` (`WithdrawVerifyOTP.tsx:177`) and invites a retry, while the payout may have landed. | Story `PayoutGateway504`: `ok{payment: reply.error(504)}`, play types the code. Gap G2, P0. |
| Payout timeout, re-check finds the payout (5002) | `LIVE-NO-STORY` | `submitted_after_recheck` (`withdraw.ts:88`-`91`) then success (`WithdrawVerifyOTP.tsx:162`) | Story `RecheckFoundPayout`: `ok{payment: reply.network(), paymentInfo: paymentInfoFixture.inProcess}`. Expect the WithdrawSuccess stub. |
| Payout refused because one is already pending (5002 on submit) | `LIVE-NO-STORY` | 400 is "final" (`withdraw.ts:86`) so the user reads "Payment failed" with the server text, while a payout is in fact pending. | Story `PayoutAlreadyPending`: `ok{payment: paymentFixture.alreadyPending}`. |
| Payout already pending, design | `MISSING` | | Proposed `PayoutAlreadyPendingProposed`: `ScreenState` image `screenstate.tracking`, title "A withdrawal is already in progress", body "You can request a new one after it settles.", actionLabel "Go to Earnings". |
| Payout timeout, unknown outcome | `STORY` | `verify-otp--unknown-outcome`, `verify-otp--unknown-outcome-proposed` | |
| Resend after an unknown outcome gets past the guard | `LIVE-NO-STORY` | The guard is per `otpGuid` (`:114`). Resend sets a fresh guid (`:199`), so the same draft can be paid again. Only the server 5002 rule stops a second payout. | Story `ResendAfterUnknownOutcome`: same setup as `verify-otp--unknown-outcome` (`ok{payment: reply.network()}`); play types, taps "OK" on the dialog, waits 31 s, taps "Resend OTP", types again. Watch the console for a second `POST /payment/paymentV1`. Open question Q1. |
| Payout rejected (400) | `STORY` | `verify-otp--payment-failed`, `verify-otp--payment-failed-proposed` | |
| Verify 5xx reads as "Enter a valid OTP" | `LIVE-NO-STORY` | Every non-status-0 error sets `invalid` (`:133`-`137`). | Story `VerifyServerError`: `ok{verifyOtp: reply.error(500)}`. App bug B1. |
| Verify 429 reads as wrong OTP | `STORY` | `verify-otp--rate-limited` (bug noted there) | |
| Session dies at verify (token alive at mount) | `LIVE-NO-STORY` | 401 then refresh 401 gives `SessionExpiredError` (status 401, `src/api/http/tokenManager.ts:169`-`171`), so the screen says "Enter a valid OTP" (`:136`) while the login sheet opens. Differs from the existing story, which has no token at mount. | Story `SessionEndsOnVerify`: `auth="signedIn"`, `ok{verifyOtp: reply.error(401), refreshToken: reply.error(401)}`. App bug B1. |
| Session dies at payout | `LIVE-NO-STORY` | Same error reaches `Alert('Payment failed', 'Your session has expired…')` (`:177`). Outcome is known (401 means not accepted). | Story `SessionEndsOnPayout`: `ok{payment: reply.error(401), refreshToken: reply.error(401)}`. Design: `mid-flow-return--withdraw-otp-session-ended`. |
| Session already dead when typing | `STORY` | `verify-otp--session-expired`, `verify-otp--session-expired-proposed` | |
| Verify dropped connection | `STORY` | `verify-otp--connection-problem`, `--connection-problem-proposed` | |
| Slow payout (>5 s, up to 30 s) | `STORY` | `verify-otp--verifying` (spinner, input blocked by overlay `:304`) | |
| Slow payout, reassurance | `MISSING` | No line while the 30 s payout runs. | Proposed `SlowPayoutProposed`: busy footer plus `InlineMessage` tone `info`, message "Still working on it. Please don't close the app or go back." shown after 5 s. |
| Wrong OTP once | `STORY` | `verify-otp--wrong-otp` | |
| Wrong OTP N times | `N/A` | No client counter; the server answers 429 (row above). | Open question Q5. |
| Resend timer | `STORY` | `verify-otp--resend-ready` (timer paused while busy, `:73`-`77`) | |
| Resend fails (5xx or 429) | `LIVE-NO-STORY` | `Alert('Could not resend OTP', e.message)` (`:204`) | Story `ResendFailed`: `ok{sendOtp: reply.error(500)}`, play waits 31 s, taps "Resend OTP". Story `ResendRateLimited`: same with `sendOtpFixture.rateLimited`. |
| Resend fails, design | `MISSING` | | Proposed `ResendFailedProposed`: `OtpInput` `resend="ready"` plus `InlineMessage` tone `warning`, message "We couldn't send a new OTP. Please try again." |
| Android back while paying | `N/A` | No `BackHandler` guard (none in `src/screens/withdraw/`). The overlay blocks the header back only. Web cannot press hardware back. | Gap G9, device QA. |
| 360 dp | `LIVE-NO-STORY` | 6 boxes plus the "OTP sent to … / Edit details" row (`:247`-`270`). | Story `Narrow360`: `w360`. |
| Keyboard over the footer | `N/A` | `useKeyboardPadding` (`:58`); device only. | |

### 7.7 Success (`src/screens/withdraw/WithdrawSuccess.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| UPI, Amazon, Flipkart | `STORY` | `success--upi`, `--amazon`, `--flipkart` | |
| No payout record (R4) | `STORY` | `success--payout-record-proposed` | |
| Success after re-check | `LIVE-NO-STORY` | Same screen, same copy (`WithdrawVerifyOTP.tsx:162`). | Covered by `RecheckFoundPayout` (7.6). |
| Huge amount at 360 dp | `LIVE-NO-STORY` | Title builds from `params.amount` (`WithdrawSuccess.tsx:118`). | Story `LargeAmount360`: params amount 1000000, `w360`. |
| Back from success | `N/A` | Stack reset to success only (`WithdrawVerifyOTP.tsx:162`), `gestureEnabled: false` (`src/navigation/WithdrawStack.tsx:54`). | |

### 7.8 Payment history (hidden, D4)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| List, details, empty | `STORY` | `payment-history--list`, `--details`, `--empty` | |
| Loading, error, many records, pagination | `N/A` | Sample data, no API (`ux-states.md` flow 6). Design when the API lands. | |

---

## Flow 8. Orders and missing cashback

### 8.1 Orders list (`src/screens/OrdersList.tsx`, `src/query/useOrders.ts`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Loaded, filters, no match, no orders, error | `STORY` | `orders-list--loaded`, `--filters-open`, `--filter-applied`, `--no-matching-results`, `--no-orders`, `--load-error` | |
| First load (bare spinner) | `STORY` | `orders-list--loading` (`OrdersList.tsx:403`) | |
| First load, skeleton | `MISSING` | | Proposed `LoadingProposed`: 3 `Skeleton` `height={spacing[80]}` `radius="lg"` (ux-states flow 7). |
| Pagination loader | `LIVE-NO-STORY` | `onScroll` near end calls `fetchNextPage` (`:203`-`208`); spinner (`:454`). | Story `NextPageLoading`: orders answer `(req) => page 1: 20 rows, meta.total_records 45; page 2: reply.hang()` (read `req.query.get('page[number]')`); rows built in the story by cloning `ordersFixture.typical` rows with ids `CKORDER0001…`. Play scrolls the frame to the end. |
| Next page fails: whole list replaced | `LIVE-NO-STORY` | `isError` is checked before the rows (`:407`). | Story `NextPageFailedLive`: same answer, page 2 `reply.error(500)`. Pairs with `orders-list--next-page-failed` (proposed). |
| End of list (500+ orders) | `MISSING` | `getNextPageParam` stops (`useOrders.ts:36`-`39`); nothing tells the user the list ended. ScrollView renders every row (`:435`-`458`), no virtualisation. | Proposed `EndOfListProposed`: under the last card, `Text` `body12Regular` `colors.text.secondary` centred, "That's all your orders." Perf: gap G14. |
| Brand filter covers loaded pages only | `LIVE-NO-STORY` | Client-side filter over loaded rows (`:276`-`279`): a store on page 3 gives "No matching results". | Gap G7, P1. No story (needs 3 pages and scroll). |
| One order | `LIVE-NO-STORY` | | Story `OneOrder`: `ok{orders}` with one row of `ordersFixture.typical`. |
| Very long store name | `LIVE-NO-STORY` | `numberOfLines={1}` (`src/organisms/OrderCard.tsx:218`) | Story `LongStoreName360`: one row with a 60-character `merchant_name`, `w360`. |
| Store logo fails to load: blank tile | `LIVE-NO-STORY` | `LogoContainer` is a plain `Image` without `onError` (`src/atoms/LogoContainer.tsx:52`). Missing URL already falls back (`src/api/ordersMapper.ts:136`). | Story `LogoFailed`: one row with `merchant_image_url: 'https://storybook.invalid/logo.png'`. Gap G8, P2. |
| Unknown status string shows "Pending" | `LIVE-NO-STORY` | `default: return 'pending'` (`ordersMapper.ts:193`) | Story `UnknownStatus`: one row with `cashback_status: 'On Hold'`. Open question Q7. |
| Null cashback amount shows ₹0 | `LIVE-NO-STORY` | `if (!isFinite(n)) return '₹0'` (`ordersMapper.ts:103`) | Story `NullAmount`: one row with `cashback_amount: null`. Gap G6. |
| Offline cold start | `STORY` | `paused-screens--orders-list-offline`, `--orders-list-offline-fix` | |
| Session expires | `STORY` | `session-expired--orders-list-session-expired`, `--orders-list-login-prompt` | |
| Pull to refresh | `MISSING` | Section 0 | |

### 8.2 Order detail (`src/screens/OrdersDetail.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Pending, delayed, cancelled, confirmed, paid | `STORY` | `order-detail--pending`, `--delayed`, `--cancelled`, `--confirmed`, `--paid` | |
| Loading (bare spinner) | `STORY` | `order-detail--loading` (`OrdersDetail.tsx:213`) | |
| Loading, skeleton | `MISSING` | | Proposed `LoadingProposed`: `Skeleton` `height={spacing[128]}` masthead + 3 `Skeleton` `height={spacing[48]}` (ux-states flow 7). |
| 5xx (text + Retry link) | `STORY` | `order-detail--load-error` (`:199`, `:222`) | |
| 5xx, design | `MISSING` | Off-pattern text link. | Proposed `LoadErrorProposed`: `ScreenState` title "Couldn't load this order", body "Check your connection and try again.", actionLabel "Try again" (ux-states flow 7). |
| 404 (order id unknown) | `LIVE-NO-STORY` | Same generic error (`:199`); "Try again" cannot help. | Story `NotFound`: `ok{orderDetail: reply.error(404)}`. Proposal: `ScreenState` title "We couldn't find this order", body "It may have been removed. Check your orders list.", actionLabel "Go to orders". |
| Offline cold start (empty body) | `STORY` | `paused-screens--order-detail-offline`, `--order-detail-offline-fix` | |
| "Need help" loses order context (R14) | `STORY` | `order-detail--need-help-without-context` | |
| Unknown status, null amount | `LIVE-NO-STORY` | Same mapper defaults as 8.1 (`ordersMapper.ts:286`, `:340`). | Covered by 8.1 stories; not repeated. |

### 8.3 Claims list (`src/screens/MissingCashbackDidYouShop.tsx`, `useClaims`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| In review, closed, others, summary sheet, not tracked | `STORY` | `claims-list--in-review`, `--closed`, `--others`, `--others-summary-sheet`, `--not-tracked-with-reason` | |
| Empty per tab | `STORY` | `claims-list--empty-in-review`, `--empty-closed`, `--empty-others` | |
| Loading (bare spinner) | `STORY` | `claims-list--loading` (`:202`) | |
| Loading, skeleton | `MISSING` | | Proposed `LoadingProposed`: 3 `Skeleton` `height={spacing[80]}` `radius="lg"`. |
| 5xx | `STORY` | `claims-list--load-error` | |
| Others tab: one of its two fetches fails, the list shows half with no notice | `LIVE-NO-STORY` | Others fetches Pending and Resolved with `allSettled` and keeps whatever succeeds (`src/query/useMissingCashback.ts:111`-`121`). | Story `OthersPartialFailure`: `mcQueue: (req) => req.query.get('filter[status]') === 'Pending' ? reply.error(500) : mcQueueFixture.resolved`; play taps "Others". |
| A tab answers 404: shown as empty | `LIVE-NO-STORY` | 404 is mapped to an empty tab on purpose (`useMissingCashback.ts:170`-`172`). | Covered by the per-tab empty stories (same render). |
| Hidden ticket screens (sample data) | `STORY` | `claims-list--hidden-ticket-list-closed`, `--hidden-ticket-list-tracked`, `--hidden-ticket-status-review`, `--hidden-track`. Network, data and loader edges: N/A (static data). | |
| Offline cold start | `STORY` | `paused-screens--claims-list-offline`, `--claims-list-offline-fix` | |
| Session expires on the list | `LIVE-NO-STORY` | Account query disabled with no token; empty tab behind the login sheet (as Orders). | Story `SessionExpired`: `auth="sessionExpired"`. Design: reuse `session-expired--orders-list-login-prompt` with title "Log in to see your claims". |
| Pull to refresh | `MISSING` | Section 0 | |

### 8.4 Did you shop? and feedback sheets (`src/screens/MissingCashbackHelp.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Question, checking, yes with/without visits, No sheet, thanks sheet | `STORY` | `did-you-shop--question`, `--checking-store-visits`, `--yes-with-visits`, `--yes-without-visits`, `--no-feedback-sheet`, `--feedback-appreciated` | |
| Lookup failed (native Alert) | `LIVE-NO-STORY` | `Alert('Couldn't check your store visits')` (`MissingCashbackHelp.tsx:60`) | Story `LookupFailedAlert`: `ok{mcRetailers: reply.error(500)}`, play waits 2 s, taps Yes. Design exists: `did-you-shop--lookup-failed`. |
| Offline: routed to Oops | `STORY` | `paused-screens--missing-cashback-yes-offline` | |

### 8.5 Where did you shop? and Oops (`MissingCashbackWhereDidYouShop.tsx`, `MissingCashbackOops.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| List, all groups, tapped, loading, error, no stores, Oops | `STORY` | `where-did-you-shop--store-list`, `--store-list-all-groups`, `--store-tapped`, `--loading`, `--lookup-error`, `--no-stores`, `--oops-no-visits` | |
| Loading skeleton, error as `ScreenState` | `MISSING` | ux-states flow 7 has the copy. | Low (same pattern as 8.2). In "Consciously not covered". |
| Long store names, missing logo | `N/A` | Retailer names are short brand names; logo fallback via `str()` (`missingCashbackMapper.ts:135`). | |

### 8.6 Choose date (`src/screens/MissingCashbackChooseDate.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Dates, recent, loading, error, no dates | `STORY` | `date-order-id-amount--choose-date`, `--choose-date-recent`, `--choose-date-loading`, `--choose-date-error`, `--choose-date-no-dates` | |
| Offline cold start: false "no recent visits" | `LIVE-NO-STORY` | Paused query falls to the empty branch (`:92`). Not in Paused screens. | Story `ChooseDateOffline`: `api.offline()`, params `mcDraftFixture.start`. |
| Offline, design | `MISSING` | | Proposed `ChooseDateOfflineProposed`: `ScreenState` title "You're offline", body "Check your connection and try again.", actionLabel "Try again". |

### 8.7 Enter order ID (`src/screens/MissingCashbackEnterOrderId.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Empty, format error, server refuses | `STORY` | `date-order-id-amount--order-id-empty`, `--order-id-format-error`, `--order-id-server-error` | |
| Checking (button loading) | `LIVE-NO-STORY` | `loading={busy}` (`:169`), ref guard (`:51`, `:76`) | Story `OrderIdChecking`: `ok{mcValidate: reply.hang()}`, play types a valid id and taps Continue. |
| Dropped connection: raw transport text | `LIVE-NO-STORY` | `setError(msg)` with the error message (`:107`) | Story `OrderIdNetworkError`: `ok{mcValidate: reply.network()}`. Copy fix: G15. |
| Group D posts the claim here: unknown outcome | `LIVE-NO-STORY` | Same POST and same risk as 8.8. | Covered by 8.8 stories. |

### 8.8 Enter amount: claim submit (`src/screens/MissingCashbackEnterAmount.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Timeout or dropped connection, then retry, then duplicate | `LIVE-NO-STORY` | POST, no retry, 15 s (`src/api/missingCashback.ts:203`, `client.ts:196`). The catch shows the raw message (`:76`). A retry can hit 400/6001 "already exists" though the first claim landed. | Story `SubmitTimeoutThenDuplicate`: `ok{mcSubmit: reply.sequence(reply.network(), mcSubmitFixture.duplicate)}`; play types 1299, taps Submit twice (second after the error). Gap G2b, P1. |
| Unknown outcome, design | `MISSING` | | Proposed `SubmitUnknownOutcomeProposed`: `InlineMessage` tone `warning`, title "We couldn't confirm your claim", message "Check your claims list before you submit again.", primaryActionLabel "View claims". |
| Duplicate (400/6001) | `STORY` | `date-order-id-amount--amount-submit-error`. The fixture is 400, not 409. | |
| Submitting | `STORY` | `date-order-id-amount--amount-submitting` | |
| Double submit | `LIVE-NO-STORY` | Ref guard (`:49`, `:55`). | No story needed (guard has no visible state). |
| Invalid amount | `STORY` | `date-order-id-amount--amount-invalid` | |
| Huge amount (₹10,00,00,000) accepted | `LIVE-NO-STORY` | Regex has no upper bound (`:57`-`58`). | Story `HugeAmount`: play types 100000000 and taps Submit; mock answers `pending`. Open question Q8. |
| Session ended | `STORY` | `mid-flow-return--claim-submit-session-ended` (proposed). Live text is "Please log in to continue." (`useMissingCashback.ts:188`). | |
| Keyboard over Submit on Android | `N/A` | `KeyboardAvoidingView` behaviour `undefined` on Android (`:87`; same at `MissingCashbackEnterOrderId.tsx:118`). Device only. | Gap G10. |

### 8.9 New user check, B1 (`src/screens/MissingCashbackNewUserCheck.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Question | `STORY` | `outcomes--new-user-check` | |
| Submit error | `LIVE-NO-STORY` | `setError(e.message …)` (`:96`); buttons disabled while busy (`:153`, `:162`) | Story `NewUserCheckSubmitError`: `ok{mcUpdate: reply.error(500)}`, play taps "New User". |
| Submitting | `LIVE-NO-STORY` | `loading={busy === 'New'}` (`:152`) | Story `NewUserCheckSubmitting`: `ok{mcUpdate: reply.hang()}`. |
| Missing queue id | `LIVE-NO-STORY` | `:86` | Low. Not covered. |
| "Learn more" is a native Alert | `LIVE-NO-STORY` | `:127` | Low. Not covered. |

### 8.10 Category select, C1 (`src/screens/MissingCashbackCategorySelect.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Categories | `STORY` | `outcomes--category-select` | |
| Submit error | `LIVE-NO-STORY` | `:66` | Story `CategorySelectSubmitError`: `ok{mcUpdate: reply.error(500)}`, play picks a category and taps Submit. |
| Submitting | `LIVE-NO-STORY` | `loading={submitting}` (`:166`) | Story `CategorySelectSubmitting`: `ok{mcUpdate: reply.hang()}`. |
| Double submit | `LIVE-NO-STORY` | State guard only (`disabled={submitting}`, `:167`); no ref. A PUT, so a repeat is mostly harmless. | Not covered. |

### 8.11 Invoice upload, C1-Other and C2 (`src/screens/MissingCashbackInvoiceUpload.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| No file, Submit disabled | `STORY` | `outcomes--invoice-upload` | |
| Upload over a slow network | `MISSING` | One POST, 15 s deadline, no retry (`src/api/missingCashback.ts:268`, `client.ts:50`). Several photos on 3G can time out every time. Only a button spinner (`:237`). | Proposed `UploadingProposed`: `StepProgress` `value={1}` `total={3}` `label="Uploading 1 of 3"` `showCount={false}` above the Submit button, plus `InlineMessage` tone `info` "Keep the app open until the upload finishes." Gap G16, P0. |
| Upload timeout: unknown outcome, duplicate ticket on retry | `MISSING` | Catch shows the raw message (`:130`). No ref guard (state `submitting` only, `:238`). | Proposed `UploadUnknownOutcomeProposed`: `InlineMessage` tone `warning`, title "We couldn't confirm your upload", message "Check the Others tab in your claims before you upload again.", primaryActionLabel "View claims". |
| Upload failed (server) | `LIVE-NO-STORY` | `:130` | Not renderable: files cannot be seeded (local state, web picker). Gap G11. |
| File too large, wrong type | `STORY` | `outcomes--invoice-file-too-large` (proposed). Open question Q6 (2 MB copy vs 6 MB app vs ~4.4 MB BFF). | |
| Copy promises PDF, picker allows images only | `LIVE-NO-STORY` | `mediaTypes: Images` (`:63`) vs "Allowed: … .pdf …" (`:174`). | No story (copy). Gap G17, P2. |
| Permission denied | `STORY` | `outcomes--invoice-photo-permission-denied` (proposed) | |
| Many files (no maximum) | `LIVE-NO-STORY` | `allowsMultipleSelection` with no cap (`:64`). | Open question Q6. Not renderable (G11). |
| Session ended mid-upload | `STORY` | `mid-flow-return--invoice-upload-session-ended` (proposed) | |
| Android back while uploading | `N/A` | No guard. Device only (G9). | |

### 8.12 Result and ticket success (`MissingCashbackResult.tsx`, `MissingCashbackTicketSuccess.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Tracked, queued, auto-tracking, ticket raised | `STORY` | `outcomes--tracked`, `--queued`, `--auto-tracking`, `--ticket-raised` | |
| Ticket number never shown | `LIVE-NO-STORY` | `ticketId` param is never read in `MissingCashbackTicketSuccess.tsx` (grep). | No story. Gap G18, P2. |
| Tracked with a huge cashback value | `N/A` | Copy is a sentence; wraps. | |

### 8.13 Cashback guard (`src/screens/CashbackGuardScreen.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Not available (iOS and web) | `STORY` | `never-miss-cashback--not-available` | |
| Android permission states | `N/A` | Android-only branch; harness `Platform.OS` is `web` (README section 8). | Device QA. |

---

## Flow 9. Profile and account

### 9.1 Profile (`src/screens/ProfileScreen.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Guest, signed in, placeholder email | `STORY` | `profile--guest`, `--signed-in`, `--placeholder-email` | |
| Loading, failed, long name | `STORY` | `profile--profile-loading`, `--profile-failed`, `--long-name` | |
| Loading and failed, design | `STORY` | `paused-screens--profile-offline-fix` covers the loading skeleton. | |
| Failed, design | `MISSING` | No proposed story for the error yet. | Proposed `ProfileFailedProposed`: `InlineMessage` tone `warning` under the masthead, message "Couldn't load your details.", primaryActionLabel "Try again". Menu rows stay usable (ux-states flow 8). |
| Withdraw row (gate) | `STORY` | Gate stories (7.2) cover the same hook (`ProfileScreen.tsx:183`). | |
| Call Us fails (no dialer) | `LIVE-NO-STORY` | `Linking.openURL(SUPPORT_PHONE_URL)` with no catch (`:240`). Get Help swallows it (`GetHelpScreen.tsx:99`). | Gap G19, P2. Not renderable (harness logs every click-out). |
| Offline, session expired | `STORY` | `paused-screens--profile-offline`, `session-expired--profile-session-expired` | |
| 360 dp | `LIVE-NO-STORY` | | Story `SignedIn360`: `w360`, long display name. |

### 9.2 Logout (`LogoutConfirmSheet`, `AuthContext.signOut`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Confirm sheet, from profile | `STORY` | `logout--confirm-sheet`, `--from-profile` | |
| Slow server logout: no feedback for up to 15 s | `LIVE-NO-STORY` | The sheet dismisses first (`LogoutConfirmSheet.tsx:68`), then `signOut` awaits the server call before clearing (`src/auth/AuthContext.tsx:274`-`279`). The screen stays signed in. | Story `SlowLogout`: `ok{logout: reply.delay(8000, authFixture.logout)}`, same play as `FromProfile` then taps "Yes". |
| Slow logout, design | `MISSING` | | Proposed `LoggingOutProposed`: the sheet stays open, "Yes" shows `FooterButtons` `primaryLoading`, no copy. The other option (sign out locally at once) is a code change: open question Q9. |
| Logout offline | `LIVE-NO-STORY` | Network error is swallowed (`AuthContext.tsx:277`); local sign-out proceeds. | Low. Not covered. |

### 9.3 Account settings and edit contact (demo)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Loaded, changed, loading, all edit steps, invalid, already registered | `STORY` | `account-settings--*`, `edit-contact--*` | |
| Save, wrong OTP, verifying, network | `N/A` | Demo: no write API, any 6 digits pass (`ux-states.md` flow 8, R5). Design when the API lands. | |

### 9.4 Delete account (hidden, D23)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Landing, ticked, OTP, deleted | `STORY` | `delete-account--*` | |
| Account deleted, then the app reopens | `N/A` | Hidden, no API. A deleted account would end as a dead refresh token, which is session expiry (10.3). Open question Q10. | |

### 9.5 Get help (`src/screens/GetHelpScreen.tsx`)

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Topics signed in and guest, guest gate, missing cashback topic, how it works | `STORY` | `get-help--*` | |
| Call cannot open | `LIVE-NO-STORY` | Swallowed (`:99`). | Gap G19. |

### 9.6 Notifications, privacy, review

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Always "all caught up" | `STORY` | `notifications--all-caught-up`, `--offers-tab` | |
| Privacy policy | `STORY` | `privacy-policy--policy` | |
| Review us, write review (hidden) | `STORY` | `hidden-screens--review-us`, `--review-us-submitted-toast`, `--write-review` | |
| Network, data, loaders | `N/A` | Static or no API. | |

---

## Flow 10. Offline and session

| Edge | Status | Evidence | Proposal / story to add |
|---|---|---|---|
| Offline banner over Orders and Profile | `STORY` | `offline-banner--banner-over-orders`, `--banner-over-profile` | |
| Paused screens (8) and fixes (5) | `STORY` | `paused-screens--*` | |
| Back online: paused queries resume | `LIVE-NO-STORY` | `onlineManager` resumes paused queries (`src/lib/network.ts:23`-`25`). | Story `ReconnectResumes` (Paused screens): `api.offline({ earnings: earningsFixture.typical })`; play waits 1 s, then `onlineManager.setOnline(true)`. Earnings goes from ₹0 to real values. The banner reads NetInfo, so it stays (harness limit). |
| Connection drops mid-request (not cold start) | `LIVE-NO-STORY` | The fetch fails and the screen's error state shows (ux-states, systemic finding). | Covered by every `reply.network()` story above. |
| Session expired on Orders, Earnings, Profile | `STORY` | `session-expired--*` | |
| Session expired, sheet title per reason | `STORY` | Patterns / Session expiry `per-reason-title-proposed` | |
| Session expires on a withdraw form | `LIVE-NO-STORY` | Silent Get Paid (7.4). | Covered by `UpiSessionEnded`. |
| Session expires at verify or payout | `LIVE-NO-STORY` | 7.6. | Covered by `SessionEndsOnVerify`, `SessionEndsOnPayout`. |
| Mid-flow return (withdraw OTP, claim submit, invoice) | `STORY` | `mid-flow-return--*` (proposed) | |
| Another user logs in on a withdraw screen after expiry | `N/A` | Route params keep the old `amount` and draft (`WithdrawVerifyOTP.tsx:60`). OTP goes to the old number, so the payout cannot complete. | Open question Q2. |

---

## Stories to add

Row counts: `STORY` 82, `LIVE-NO-STORY` 70 (47 add a story below, 7 are covered by another story, 16 get no story: not renderable or low), `MISSING` 23, `N/A` 21.

Ranked inside each file by frequency x severity. Global rank number in brackets (1 = first to build). `L` = live, `P` = proposed. Harness: `auth` + `api`.

### `stories/flows/07-earnings-and-withdraw/VerifyOTP.stories.tsx`
- [1] `PayoutGateway504` L: signedIn, `ok{payment: reply.error(504)}`, play types code.
- [2] `RecheckFoundPayout` L: signedIn, `ok{payment: reply.network(), paymentInfo: paymentInfoFixture.inProcess}`, play types code.
- [3] `PayoutAlreadyPending` L: signedIn, `ok{payment: paymentFixture.alreadyPending}`, play types code.
- [4] `PayoutAlreadyPendingProposed` P: `ProposedOtp` with `ScreenState` (copy in 7.6).
- [5] `VerifyServerError` L: signedIn, `ok{verifyOtp: reply.error(500)}`, play types code.
- [6] `SessionEndsOnVerify` L: signedIn, `ok{verifyOtp: reply.error(401), refreshToken: reply.error(401)}`, play types code.
- [7] `ResendAfterUnknownOutcome` L: signedIn, `ok{payment: reply.network()}`, play types, taps "OK" on the dialog, waits 31 s, taps Resend, types again.
- [9] `SessionEndsOnPayout` L: signedIn, `ok{payment: reply.error(401), refreshToken: reply.error(401)}`, play types code.
- [10] `SlowPayoutProposed` P: `ProposedOtp` busy + `InlineMessage` info.
- [23] `ResendFailed` L: signedIn, `ok{sendOtp: reply.error(500)}`, play waits 31 s, taps Resend.
- [24] `ResendRateLimited` L: signedIn, `ok{sendOtp: sendOtpFixture.rateLimited}`, play waits 31 s, taps Resend.
- [25] `ResendFailedProposed` P: `ProposedOtp` `resend="ready"` + `InlineMessage` warning.
- [36] `Narrow360` L: signedIn, `api.ok()`, `w360`.

### `stories/flows/07-earnings-and-withdraw/MethodSelect.stories.tsx`
- [37] `Narrow360LargeAmount` L: signedIn, earnings with confirmed ₹10,00,000, `w360`.
- [52] `TapWhileLoading` L: signedIn, `ok{earnings: reply.hang()}`, play taps "UPI payments".
- [53] `EarningsError` L: signedIn, `ok{earnings: reply.error(500)}`.
- [54] `EarningsErrorProposed` P: `PhoneFrame` + `Header` + `ScreenState` (copy in 7.3).

### `stories/flows/07-earnings-and-withdraw/WithdrawGate.stories.tsx`
- [8] `PaymentInfoSaysBelowThreshold` L: signedIn, `ok{paymentInfo: paymentInfoFixture.belowThreshold}`, play taps Withdraw.
- [13] `ExactlyMinimum` L: signedIn, earnings confirmed ₹250 + rewards ₹0, `api.ok()` otherwise, play taps Withdraw.
- [14] `SlowBalance` L: signedIn, `ok{paymentInfo: reply.delay(8000, paymentInfoFixture.default)}`, play taps Withdraw at 800 ms.
- [15] `SettlingNoAmount` L: signedIn, `ok{paymentInfo: reply.code(400, '5002', 'A payment request from you is already pending.')}`, play taps Withdraw.
- [16] `CheckingBalanceProposed` P: `PhoneFrame` + `Toast` info "Checking your balance…".

### `stories/flows/07-earnings-and-withdraw/Details.stories.tsx`
- [11] `UpiSessionEnded` L: `auth="sessionExpired"`, `api.ok()`, play types, ticks, taps Get Paid.
- [17] `UpiSendOtpRateLimited` L: signedIn, `ok{sendOtp: sendOtpFixture.rateLimited}`, same play.
- [18] `UpiSendOtpRateLimitedProposed` P: UPI layout + `InlineMessage` warning, Get Paid disabled.
- [26] `UpiSendOtpOffline` L: signedIn, `ok{sendOtp: reply.network()}`, same play.

### `stories/flows/07-earnings-and-withdraw/Earnings.stories.tsx`
- [12] `OfflineWithCache` L: signedIn, `seed(qk.user.earnings(), mapEarnings(earningsFixture.typical))`, `api.offline()`.
- [19] `MissingAmountFields` L: signedIn, `ok{earnings}` with null confirmed and pending.
- [20] `BreakupSheetWhileLoading` L: signedIn, `api.loading()`, play taps the Cashback stat card.
- [38] `LargeAmounts360` L: signedIn, `ok{earnings: earningsFixture.rich}`, `w360`.
- [64] `BreakupSheet` L: signedIn, `api.ok()`, same play.
- [66] `Forbidden403` L: signedIn, `ok{earnings: reply.error(403)}`.

### `stories/flows/07-earnings-and-withdraw/Success.stories.tsx`
- [43] `LargeAmount360` L: params amount 1000000, method upi, `w360`.

### `stories/flows/08-orders-and-missing-cashback/DateOrderIdAmount.stories.tsx`
- [21] `SubmitTimeoutThenDuplicate` L: signedIn, `ok{mcSubmit: reply.sequence(reply.network(), mcSubmitFixture.duplicate)}`, play types 1299, Submit, Submit.
- [22] `SubmitUnknownOutcomeProposed` P: amount layout + `InlineMessage` warning with "View claims".
- [31] `ChooseDateOffline` L: signedIn, `api.offline()`, params `mcDraftFixture.start`.
- [32] `ChooseDateOfflineProposed` P: `ScreenState` offline copy.
- [39] `OrderIdChecking` L: signedIn, `ok{mcValidate: reply.hang()}`, play types a valid id, taps Continue.
- [40] `OrderIdNetworkError` L: signedIn, `ok{mcValidate: reply.network()}`, same play.
- [47] `HugeAmount` L: signedIn, `api.ok()`, play types 100000000, taps Submit.

### `stories/flows/08-orders-and-missing-cashback/Outcomes.stories.tsx`
- [27] `UploadingProposed` P: invoice layout with 3 thumbnails + `StepProgress` + `InlineMessage` info.
- [28] `UploadUnknownOutcomeProposed` P: invoice layout + `InlineMessage` warning with "View claims".
- [41] `NewUserCheckSubmitError` L: signedIn, `ok{mcUpdate: reply.error(500)}`, play taps "New User".
- [42] `CategorySelectSubmitError` L: signedIn, `ok{mcUpdate: reply.error(500)}`, play picks a category, taps Submit.
- [48] `NewUserCheckSubmitting` L: signedIn, `ok{mcUpdate: reply.hang()}`, play taps "New User".
- [49] `CategorySelectSubmitting` L: signedIn, `ok{mcUpdate: reply.hang()}`, play picks, taps Submit.

### `stories/flows/08-orders-and-missing-cashback/OrdersList.stories.tsx`
- [29] `NextPageFailedLive` L: signedIn, orders function answer (page 1: 20 rows, total 45; page 2: `reply.error(500)`), play scrolls to the end.
- [30] `NextPageLoading` L: same, page 2 `reply.hang()`.
- [33] `LoadingProposed` P: 3 `Skeleton`.
- [34] `NullAmount` L: one row, `cashback_amount: null`.
- [35] `UnknownStatus` L: one row, `cashback_status: 'On Hold'`.
- [44] `EndOfListProposed` P: last cards + end line.
- [45] `LogoFailed` L: one row, logo on `storybook.invalid`.
- [46] `LongStoreName360` L: one row, 60-character name, `w360`.
- [55] `OneOrder` L: one row.

### `stories/flows/08-orders-and-missing-cashback/OrderDetail.stories.tsx`
- [50] `NotFound` L: signedIn, `ok{orderDetail: reply.error(404)}`.
- [51] `NotFoundProposed` P: `ScreenState` (copy in 8.2).
- [56] `LoadErrorProposed` P: `ScreenState` (copy in 8.2).
- [57] `LoadingProposed` P: `Skeleton` masthead + rows.

### `stories/flows/08-orders-and-missing-cashback/ClaimsList.stories.tsx`
- [58] `OthersPartialFailure` L: signedIn, `mcQueue` function (Pending 500, else `mcQueueFixture.resolved`), play taps Others.
- [59] `SessionExpired` L: `auth="sessionExpired"`, `api.ok()`.
- [60] `LoadingProposed` P: 3 `Skeleton`.

### `stories/flows/08-orders-and-missing-cashback/DidYouShop.stories.tsx`
- [61] `LookupFailedAlert` L: signedIn, `ok{mcRetailers: reply.error(500)}`, play waits 2 s, taps Yes.

### `stories/flows/09-profile-and-account/Logout.stories.tsx`
- [62] `SlowLogout` L: signedIn, `ok{logout: reply.delay(8000, authFixture.logout)}`, play taps Logout, then Yes.
- [65] `LoggingOutProposed` P: sheet with `FooterButtons` `primaryLoading`.

### `stories/flows/09-profile-and-account/Profile.stories.tsx`
- [63] `ProfileFailedProposed` P: masthead + `InlineMessage` warning "Couldn't load your details." + menu rows.
- [67] `SignedIn360` L: signedIn, long display name, `w360`.

### `stories/flows/10-offline-and-session/PausedScreens.stories.tsx`
- [68] `ReconnectResumes` L: signedIn Earnings, `api.offline({ earnings: earningsFixture.typical })`, play `onlineManager.setOnline(true)` after 1 s.

Total: 68 stories (50 live, 18 proposed).

### Consciously not covered (tail)
- Withdraw gate double tap (7.2). Low frequency, no money moves.
- Get Paid double tap sends two OTPs (7.4). Harmless.
- Terms `mailto:` with no mail app (7.5).
- Where did you shop loading skeleton and `ScreenState` error (8.5): same pattern as 8.2, add with it later.
- New user check and category select "missing queue id" (8.9, 8.10): needs a broken draft; rare.
- New user check "Learn more" native Alert (8.9).
- Category select double submit (8.10): a PUT.
- Logout offline (9.2): works.
- Earnings rewards-only and cashback-only layouts on the tab (fixtures exist; Method select covers them).
- Payment history loading and error (hidden, D4).
- Edit contact and delete account API errors (demo or hidden).
- Earnings session-restoring ₹0 flash (harness cannot hold the restore window).

---

## Gaps and unsupported

| # | Gap | Evidence | Severity |
|---|---|---|---|
| G1 | `AmountActionRow` has no loading state for its action, so "Withdraw" cannot show that the balance is being checked. | `src/molecules/AmountActionRow.tsx:76` (amount only) | P1 |
| G2 | Payout 5xx (502/503/504) is treated as a final failure. The user reads "Payment failed" and may retry while the payout landed. Only timeout and network trigger the re-check. | `src/query/mutations/withdraw.ts:86`; `WithdrawVerifyOTP.tsx:177` | P0 |
| G2b | Claim submit and invoice upload have no unknown-outcome handling: a timeout shows a raw error, a retry can duplicate. | `MissingCashbackEnterAmount.tsx:76`; `MissingCashbackInvoiceUpload.tsx:130`; `src/api/missingCashback.ts:203`, `:268` | P1 |
| G3 | `belowThreshold` from payment info is never read. Earnings above the minimum with a 5003 answer lets the user through UPI and OTP to a late "Payment failed". | `src/query/usePaymentInfo.ts:86`; `useWithdrawGate.tsx:92`, `:106` | P1 |
| G4 | Method rows are live while earnings load or fail; the next screen gets `amount: 0` (display and analytics only; the payout POST sends no amount). Low reach: the gate loads earnings first. | `src/screens/WithdrawScreen.tsx:188`, `:224`; `src/query/mutations/withdraw.ts:57`-`59` | P2 |
| G5 | Missing payment method ids fall back to built-in ids silently (reported only). A payout can go to the wrong method on a backend with other ids. | `src/api/payments.ts:132` | P0 |
| G6 | Mappers and sheets turn a null, missing or unparsable amount into ₹0 (earnings, orders, breakup sheet, processing sheet). A partial response reads as "no money". DS has no "amount unknown" display rule. | `src/api/earningsMapper.ts:91`-`107`; `src/api/ordersMapper.ts:103`; `src/organisms/EarningsBreakupSheet.tsx:174`; `src/api/payments.ts:74` | P1 |
| G7 | Orders Brand filter works on loaded pages only; false "No matching results" for long histories. | `src/screens/OrdersList.tsx:276`-`279` | P1 |
| G8 | `LogoContainer` has no image error fallback; a dead logo URL is a blank tile. `BrandLogoTile` has one (`src/atoms/BrandLogoTile.tsx:86`). | `src/atoms/LogoContainer.tsx:52` | P2 |
| G9 | No Android hardware-back guard during payout, claim submit or upload. Unsupported in Storybook (BackHandler stubbed). Device QA. | No `BackHandler` in `src/screens/withdraw/` or claim screens; `storybook/.storybook/preview.tsx:6` | P1 |
| G10 | Claim amount and order-id forms use `KeyboardAvoidingView` with no Android behaviour; the withdraw forms fixed this with `useKeyboardPadding`. Device QA. | `MissingCashbackEnterAmount.tsx:87`; `MissingCashbackEnterOrderId.tsx:118` | P2 |
| G11 | Picked invoice files are local state and the web picker is real, so upload failure, many files, too large and denied cannot be rendered live. Proposed stories only. | `MissingCashbackInvoiceUpload.tsx:52`; `storybook/.storybook/main.ts:75` | Harness |
| G12 | 130% font scale cannot be emulated on react-native-web. Device QA on Verify OTP, Earnings cards, Order card, Method select. | Harness README section 8 | Harness |
| G13 | No pull to refresh on Earnings, Orders, Claims, Profile. `RefreshControl` does not render on web, so no story. | grep of `src/screens` | P2 |
| G14 | Orders list renders every loaded row in a `ScrollView` (no virtualisation). 500+ orders = 25 pages in memory. | `src/screens/OrdersList.tsx:435`-`458` | P2 |
| G15 | Error lines on claim steps show raw transport or server text (`e.message`). | `MissingCashbackEnterOrderId.tsx:107`; `MissingCashbackEnterAmount.tsx:76`; `MissingCashbackNewUserCheck.tsx:96`; `MissingCashbackCategorySelect.tsx:66` | P2 |
| G16 | Invoice upload: one 15 s attempt for several images, no progress. Likely to fail on slow networks, so the claim cannot be raised. Inferred, not measured. | `src/api/missingCashback.ts:268`; `src/api/http/client.ts:50` | P0 |
| G17 | Invoice copy says PDF is allowed; the picker is images only. | `MissingCashbackInvoiceUpload.tsx:63`, `:174` | P2 |
| G18 | Ticket success never shows the ticket number the API returned. | `MissingCashbackTicketSuccess.tsx` (param unread) | P2 |
| G19 | Call Us: Profile has no catch on `Linking.openURL`; Get Help swallows the failure. No toast (DS gap 2, no app-level toast host). | `ProfileScreen.tsx:240`; `GetHelpScreen.tsx:99` | P2 |
| B1 | App bug: Verify OTP maps every non-network error (5xx, 401 session end) to "Enter a valid OTP". | `WithdrawVerifyOTP.tsx:133`-`137` | P1 |
| B2 | App bug: withdraw forms return silently when the token is gone. | `WithdrawEnterUPI.tsx:59`; `WithdrawAmazon.tsx:83`; `WithdrawFlipkart.tsx:76` | P1 |

## Open product questions (not decided here)

1. Q1. After an unknown payout outcome, should Resend and "Edit details" be blocked until a re-check clears, or is the server 5002 rule enough? Owner: product owner with the CashKaro payments team.
2. Q2. If a different user logs in over a withdraw screen after expiry, restart the withdraw stack or keep the draft? Owner: product owner.
3. Q3. Offline with a cached balance: show the last known balance with a "last updated" line, or hide amounts? Owner: product owner.
4. Q4. Should a 5xx on the payout POST be treated as "unknown" (re-check first) like a timeout? Owner: engineering with the CashKaro payments team.
5. Q5. OTP rate limits: what wait time does the API give, and should the app count wrong OTPs before the server 429? Owner: product owner with the CashKaro auth team.
6. Q6. Invoice limits: one number for size (copy 2 MB, app 6 MB, BFF about 4.4 MB), file types (PDF or not) and file count. Owner: product owner with the BFF owner.
7. Q7. Unknown order status strings: show as "Pending", or a neutral "Processing" badge? Owner: product owner.
8. Q8. Claim amount: add an upper bound or a confirm step for very large values? Owner: product owner with the missing-cashback ops team.
9. Q9. Logout: clear local state first and call the server in the background, or wait with a loading state? Owner: engineering.
10. Q10. What does a user whose account was deleted server-side see on the next launch? Owner: product owner (D23 still hides delete).
11. Q11. Prefill the last-used UPI id or gift-card email for a returning withdrawer? It saves typing but adds a stored payout identity. Owner: product owner.
12. Q12. A 403 on a user call: show the generic error, or a distinct "Something is wrong on our side" state with no retry? Owner: engineering with the CashKaro gateway team.
