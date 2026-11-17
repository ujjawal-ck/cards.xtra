# Spec: Earnings page split into Cashback and Rewards

Date: 2026-11-17. Owner: Anmol (PM). Build class: production path (tests required).

## Problem
Cashback and rewards are two different money types with two different payout
routes (cashback: UPI or gift card; rewards: gift card only). The Earnings page
mixes them:
- The "Confirmed / Withdraw" row shows confirmed cashback + **total** rewards
  (`earningsMapper.ts`), so pending and already-paid rewards look withdrawable.
- The mapper comment says the API has no rewards status split. That is wrong:
  `GET /users/earnings` returns `confirmed_rewards`, `pending_rewards`,
  `paid_rewards` (see `~/repos/api-knowledgebase/MINI APP DOCUMENTATION/02_users.md`).

## Outcome
A user sees, separately for Cashback and for Rewards, what is confirmed
(withdrawable), pending and paid, and can withdraw each through its own route.

## Scope (in)
1. **Mapper** (`src/api/earningsMapper.ts`): add per-type fields.
   - Cashback: `confirmed_cashback`, `pending_cashback`, `paid_cashback`,
     total `total_cashback_earned`.
   - Rewards: `confirmed_rewards`, `pending_rewards`, `paid_rewards`,
     total `total_rewards_earned`.
   - `rewardsNum` must become **confirmed rewards** (withdrawable), not total.
   - `combinedNum` = confirmed cashback + confirmed rewards.
   - Keep `toAmount` parsing rules. Keep exact amounts (no rounding).
   - Keep existing field names that other screens use (WithdrawScreen reads
     `confirmedNum`, `rewardsNum`, `combinedNum`); fix their meaning, do not
     rename them.
2. **Earnings screen** (`src/screens/EarningsScreen.tsx`), logged-in state only:
   - Masthead: unchanged (total earned, Cashback stat, Rewards stat, each stat
     opens its `EarningsBreakupSheet`).
   - Replace the single Confirmed / Pending / Paid row group with **two
     sections**, in this order: "Cashback", then "Rewards".
   - Each section: a section title (Text atom, existing heading token), then
     three `AmountActionRow`s for that type only:
     - Confirmed → button "Withdraw" (solid, main) → withdraw for that type.
     - Pending → button "Know Why?" (outline) → existing `EarningStatusSheet`
       (pending variant) with that type's pending amount.
     - Paid → button "View" (outline) → existing `EarningStatusSheet` (paid
       variant) with that type's paid amount.
   - Rewards section: if all three reward amounts are 0, still show it (users
     should learn rewards exist). Do not hide it.
   - Bottom menu card (My Order Details, Missing Cashback, Get Help):
     unchanged.
   - Logged-out and error states: unchanged.
3. **Withdraw routing**: two routes, one per type.
   - Cashback Withdraw → withdraw flow pre-set to the cashback bucket.
   - Rewards Withdraw → withdraw flow pre-set to the rewards bucket
     (gift card only, existing `WithdrawGiftCard variant='rewards'`).
   - Both still go through `useWithdrawGate` (₹0 → `CashbackNotConfirmedSheet`;
     payout in progress → `PaymentProcessingSheet`). The gate must check the
     amount of the type the user tapped, not the combined total.
   - Pass the chosen bucket as a navigation param (for example
     `WithdrawStack: { bucket?: 'cashback' | 'rewards' }`). With no param,
     WithdrawScreen keeps today's behaviour (Profile entry point).
4. **Breakup sheets**: `EarningsBreakupSheet` variant `rewards` must show the
   real rewards confirmed / pending / paid (not cashback numbers or zeros).

## Non-goals
- No in-page transaction list, filter chips, or month grouping (Paytm pattern)
  in this change.
- No masthead redesign, no new Figma, no copy rewrite beyond section titles.
- No change to the Orders screen, Missing Cashback, or Profile.
- No BFF change (`/ck/users/earnings` is already allowlisted).

## Components (reuse only; do not create new ones)
`Masthead` (variant earnings), `AmountActionRow`, `EarningStatusSheet`,
`EarningsBreakupSheet`, `CashbackNotConfirmedSheet`, `PaymentProcessingSheet`,
`ListRow`, `Divider`, `Text`, `StaggeredEntrance`, `useWithdrawGate`.
Icons: reuse `desc-withdrawcash`, `desc-pendingcash`, `desc-paid`.
All values from `src/tokens` (see repo `CLAUDE.md`, "TOKENS ARE LAW"). If a
needed token or component is missing, stop and report it; do not improvise.

## Edge cases (handled)
| Case | Expected |
|---|---|
| Both types ₹0 | Both sections show ₹0; Withdraw opens CashbackNotConfirmedSheet |
| Cashback > 0, rewards 0 | Rewards Withdraw opens CashbackNotConfirmedSheet (copy may say cashback; log as known gap) |
| Rewards fields missing in API | Treat as 0; `hasData` still true if cashback fields present |
| Negative amount (reversal) | Show signed, as today |
| Loading | `AmountActionRow loading` skeletons in both sections |

Consciously unhandled: rewards-specific "not confirmed" copy, analytics event
split per type (log in the report if you notice it).

## Acceptance criteria
1. Mapper unit tests (new, in `src/api/__tests__/`): a response with
   confirmed/pending/paid for both types maps every field correctly;
   `rewardsNum` equals `confirmed_rewards`; `combinedNum` equals confirmed
   cashback + confirmed rewards; missing reward fields map to 0.
2. Earnings screen shows two sections with the right amounts for a test
   response (snapshot or render test if the repo has a pattern for it).
3. Tapping Cashback Withdraw lands on the withdraw flow showing the Cashback
   bucket; Rewards Withdraw lands on the Rewards bucket.
4. Profile → Withdraw Cashback still works as before (no param).
5. `npm run typecheck` and `npm test` pass.
6. No hardcoded hex, font size or spacing number in changed code.
