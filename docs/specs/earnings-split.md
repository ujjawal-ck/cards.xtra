# Spec: Earnings page, Paytm "My Cashback" layout

Date: 2026-11-17 (v2, replaces the two-section version). Owner: Anmol (PM).
Build class: production path (tests required).
Reference: `~/repos/ck_paytm_frontend/src/features/cashback/` (`pages/MyCashbackPage.tsx`,
`components/EarningsOverview.tsx`, `components/CashbackListItem.tsx`). Read it first.

## Problem
The Earnings page shows two tall stacks (Cashback and Rewards, each with
Confirmed / Pending / Paid rows) and hides the transactions behind
"My Order Details". The user wants Paytm's structure: money summary on top,
transactions on the same page.

## Page, top to bottom
1. **Banner (keep as is):** `Masthead variant="earnings"`: all-time total,
   with the Cashback and Rewards stat cards inside it (each opens its
   `EarningsBreakupSheet`, which already shows that type's Confirmed / Pending /
   Paid). This is the only place cashback and rewards are split.
2. **Small balance card** (replaces both vertical stacks). One card, two compact
   parts side by side, like Paytm's pending card:
   - Left: "Confirmed" + combined confirmed amount (`combined`) + "Withdraw"
     button (solid, main, small size). Uses the existing `useWithdrawGate`
     with no type (combined). Withdraw opens the existing WithdrawScreen,
     which already lets the user pick Cashback, Rewards or both.
   - Right: "Pending" + combined pending (pending cashback + pending rewards) +
     "Know Why?" (outline, small) -> existing `EarningStatusSheet` (pending).
   - Paid is not shown here (it is in the breakup sheets and the list filter).
   - Build from existing atoms/molecules (`Text`, `Button`, `Icon`,
     `DividerVertical`, card styling copied from the existing card containers
     on this screen). If `AmountActionRow` has a compact size, use it instead.
3. **"Don't see your order here?" prompt**: one tappable row (existing
   `ListRow` menu-option, `StripAlert` or `InlineMessage`, whichever fits) with
   body "Tell us where you shopped & we'll add your Cashback" and a chevron.
   Opens the Missing Cashback flow (same target as today's "Missing Cashback" row).
4. **Transactions, on the page** (Paytm list):
   - Filter chips (existing `Chip` atom, single-select): All, Pending,
     Confirmed, Paid. Map to the orders API status filter the same way
     `OrdersList.tsx` does (`ORDER_STATUS_OPTIONS`; Pending = pending+delayed).
   - Data: existing `useOrders(filters)` hook. Show the first 10 rows.
   - Rows: existing `OrderRow`, mapped exactly as `OrdersList.tsx` maps them
     (the row type already labels each row "Cashback:" or "Rewards:"). If the
     mapping lives inside `OrdersList.tsx`, move it to a shared helper and use
     it in both places; do not duplicate it. Tapping a row opens order detail
     as in OrdersList.
   - Group rows under month headings (newest first), like Paytm `groupByMonth`.
   - Below the rows: "View all orders" link -> `OrdersList` screen.
   - Empty state per filter: All "Your cashback and rewards will show up here";
     Pending "No pending earnings"; Confirmed "No confirmed earnings"; Paid
     "No paid earnings".
   - Loading: existing `Skeleton` rows; error: existing `ScreenState` with retry.
5. **Get Help** row at the bottom (keep). Remove the "My Order Details" and
   "Missing Cashback" menu rows (replaced by 3 and 4).

Logged-out and full-error states: unchanged.

## Keep from the previous commits
- Mapper fix: `rewardsNum` = confirmed rewards, `combinedNum` = confirmed
  cashback + confirmed rewards, per-type fields and their tests.
- Withdraw gate: payout minimum checked against cashback + rewards combined;
  `earning_type` in `WITHDRAW_START`. The gate's per-type entry stays supported;
  this page uses the no-type (combined) entry.
- `EarningStatusSheet` / `CashbackNotConfirmedSheet` `earningType` props stay.

## Remove
- The "Cashback" and "Rewards" section titles and their six `AmountActionRow`s.
- The per-type pending/paid sheet instances only those rows used.

## Non-goals
No new components, no new tokens, no masthead change, no BFF change, no
infinite scroll on this page (the full list stays on OrdersList).

## Acceptance criteria
1. `npx tsc --noEmit -p .` and `npx jest` pass in the worktree.
2. Unit test for the month-grouping helper (and the shared row mapper if extracted).
3. No hex, raw font sizes or raw spacing numbers in changed code.
4. Report any spot where an existing component did not fit and what you used.
