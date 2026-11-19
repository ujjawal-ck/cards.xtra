import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { Toast } from '../../../src/molecules';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture, paymentInfoFixture, reply } from '../../../storybook/fixtures';
import { logNativeAlerts, sleep, tapText } from './_interact';
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

/** Balance error: the payment info call fails (HTTP 500) so the gate cannot decide. The app calls a native Alert "Couldn't load your balance" and does not open any sheet. The Alert is not rendered on web (see console), so the screen looks unchanged. Shows after the app's own retries. */
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
