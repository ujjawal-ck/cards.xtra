import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { Toast } from '../../../src/molecules';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture, paymentInfoFixture, reply } from '../../../storybook/fixtures';
import { logNativeAlerts, sleep, tapText } from './_interact';
import { earningsWith } from './_shared';
import { colors, spacing } from '../../../src/tokens';

/**
 * Flow 7, step 2. MONEY STEP. The gate (useWithdrawGate) runs when the user taps Withdraw on Earnings,
 * before any payout screen opens. Each story mounts the real Earnings screen and taps its real
 * Withdraw button after mount (play function). The gate is a hook, so the sheets belong to Earnings.
 * Passing the gate opens the method list (next step).
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Withdraw gate',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/withdraw/useWithdrawGate.tsx';
const Gate = ({ a }: { a: ReturnType<typeof api.ok> }) => (
  <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={a} />
);
const tapWithdraw = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  logNativeAlerts();
  await sleep(800);
  await tapText(canvasElement, 'Withdraw');
};

/** A payout is already settling (payment info answers 400 / 5002, ₹20 requested). The "Payment Is Processing" sheet opens; only one payout may be in flight. */
export const Settling: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:100` },
  render: () => <Gate a={api.ok({ paymentInfo: paymentInfoFixture.inProcess })} />,
  play: tapWithdraw,
};

/** Nothing withdrawable: confirmed is ₹0 and only pending exists. The "Cashback not confirmed" sheet opens and names the pending amount. */
export const NothingToWithdraw: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:103` },
  render: () => <Gate a={api.ok({ earnings: earningsFixture.pendingOnly })} />,
  play: tapWithdraw,
};

/** Below the minimum: confirmed ₹120 against the API minimum of ₹250 (payment info 400 / 5003). The same sheet, with the "earn ₹X more" copy. */
export const BelowMinimum: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:106` },
  render: () => <Gate a={api.ok({ earnings: earningsFixture.belowThreshold, paymentInfo: paymentInfoFixture.belowThreshold })} />,
  play: tapWithdraw,
};

/** Balance error: the payment info call fails (HTTP 500) so the gate cannot decide. The app calls a native Alert "Couldn't load your balance" and does not open any sheet. The preview draws the Alert as a plain dialog; no sheet opens. Shows after the app's own retries. */
export const BalanceError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:72` },
  render: () => <Gate a={api.ok({ paymentInfo: reply.error(500) })} />,
  play: tapWithdraw,
};

/** PROPOSED. Balance error as an error Toast with Try again, in place of the native Alert. Open question: Toast has no app-level host today (it is mounted per screen), so this needs one mounted on Earnings. */
export const BalanceErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the native Alert at ${SRC}:72. Copy from audit/ux-states.md flow 6. Open question: should a failed balance also block the Withdraw button until a retry works?` } } },
  render: () => (
    <PhoneFrame background={colors.background.muted}>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing[16] }}>
        <Toast tone="error" message="Couldn't load your balance. Check your connection and try again." action="single" actionLabel="Try again" />
      </View>
    </PhoneFrame>
  ),
};

// ── Edge cases (audit/edge-flows-7-10.md, 7.2) ──

/** MONEY. Payment info says 5002 (a payout is settling) but the answer has no requested amount. The app reads it as ₹0 and the "Payment Is Processing" sheet shows ₹0 (gap G6). Taps Withdraw after mount. */
export const SettlingNoAmount: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:128` },
  render: () => <Gate a={api.ok({ paymentInfo: reply.code(400, '5002', 'A payment request from you is already pending.') })} />,
  play: tapWithdraw,
};

/** Payment info with a ₹250 minimum (the default fixture says ₹100). The gate reads the minimum from payment info. */
const paymentInfoMin250 = (() => {
  const body = JSON.parse(JSON.stringify(paymentInfoFixture.default)) as { data: { attributes: Record<string, unknown> } };
  body.data.attributes.payment_threshold = '250.00';
  return body;
})();

/** Exactly the minimum: confirmed cashback ₹250 and rewards ₹0 against a ₹250 minimum (payment info threshold set to 250). The gate compares with "less than", so ₹250 passes and the method list opens (the stub "→ WithdrawMethodSelect" shows). Taps Withdraw after mount. */
export const ExactlyMinimum: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:106` },
  render: () => <Gate a={api.ok({ paymentInfo: paymentInfoMin250, earnings: earningsWith(earningsFixture.belowThreshold, { total_earned: '690.00', total_cashback_earned: '690.00', confirmed_cashback: '250.00' }) })} />,
  play: tapWithdraw,
};

/** MONEY. Gap G3, P1. Earnings say ₹1,590 is confirmed, but payment info answers 400 / 5003 (below threshold). Nothing reads that flag, so the gate lets the user through and the failure comes after the OTP. The method list opens (stub). Taps Withdraw after mount. */
export const PaymentInfoSaysBelowThreshold: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:92` },
  render: () => <Gate a={api.ok({ paymentInfo: paymentInfoFixture.belowThreshold })} />,
  play: tapWithdraw,
};

/** Slow balance: the payment info call takes 8 s. The user taps Withdraw at 0.8 s and gets no feedback until it answers (the tap waits for the refetch, up to 3 tries of 15 s). After 8 s the method list opens. */
export const SlowBalance: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:59` },
  render: () => <Gate a={api.ok({ paymentInfo: reply.delay(8000, paymentInfoFixture.default) })} />,
  play: tapWithdraw,
};

/** PROPOSED. Slow balance: an info Toast while the balance check runs, in place of silence. Needs DS gap G1 (action loading on the row) or a Toast host. */
export const CheckingBalanceProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Adds feedback to the wait at ${SRC}:59. Copy from audit/edge-flows-7-10.md 7.2. Open question: Toast (needs an app-level host) or a loading state on the Withdraw button (needs DS gap G1)? Owner: product owner.` } } },
  render: () => (
    <PhoneFrame background={colors.background.muted}>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing[16] }}>
        <Toast tone="info" message="Checking your balance…" />
      </View>
    </PhoneFrame>
  ),
};
