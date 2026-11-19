import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { WithdrawScreen } from '../../../src/screens/WithdrawScreen';
import { ScreenState, Header } from '../../../src/organisms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture, reply } from '../../../storybook/fixtures';
import { sleep, tapText, waitFor } from './_interact';
import { ANDROID_360, earningsWith } from './_shared';

/**
 * Flow 7, step 3. MONEY STEP. Where the money goes: UPI, Bank Transfer (not built), or an Amazon / Flipkart gift card.
 * Which sections show depends on the confirmed balances: only cashback, only rewards, or both.
 * The route name is WithdrawMethodSelect; the screen is WithdrawScreen.
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Method select',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/WithdrawScreen.tsx';
const Methods = ({ a, width }: { a: ReturnType<typeof api.ok>; width?: number }) => (
  <ScreenHarness name="WithdrawMethodSelect" component={WithdrawScreen} auth="signedIn" api={a} width={width} />
);

/** Amount still loading: the headline and section amounts read "—". */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:185` },
  render: () => <Methods a={api.loading()} />,
};

/** Only cashback confirmed (₹1,240): one section "Cashback" with UPI, Bank Transfer ("Coming soon") and the gift card row. */
export const CashbackOnly: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:208` },
  render: () => <Methods a={api.ok({ earnings: earningsFixture.cashbackOnly })} />,
};

/** Only rewards confirmed (₹650): one section "Rewards", gift card only (rewards cannot go to UPI). */
export const RewardsOnly: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:208` },
  render: () => <Methods a={api.ok({ earnings: earningsFixture.rewardsOnly })} />,
};

/** Both confirmed (₹1,240 cashback + ₹350 rewards): two sections, "Cashback" (UPI, Bank Transfer, gift card) and "Cashback + Reward" (gift card only). */
export const CashbackAndRewards: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:208` },
  render: () => <Methods a={api.ok()} />,
};

/** R12. Bank Transfer is on screen today as a muted row with "Coming soon"; tapping it does nothing (the story taps it after mount). A user with no UPI can only take a gift card. Open question: hide the row until it works, or keep it as a promise? Owner: product owner. */
export const BankTransferComingSoon: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:243` },
  render: () => <Methods a={api.ok({ earnings: earningsFixture.cashbackOnly })} />,
  play: async ({ canvasElement }) => {
    await sleep(800);
    await tapText(canvasElement, 'Bank Transfer');
  },
};

/** The info circle next to a section amount opens a tooltip that explains which payout the bucket allows. Taps it after mount. */
export const TooltipOpen: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:120` },
  render: () => <Methods a={api.ok({ earnings: earningsFixture.cashbackOnly })} />,
  play: async ({ canvasElement }) => {
    await sleep(800);
    const info = await waitFor(() => canvasElement.querySelector<HTMLElement>('[aria-label="Cashback info"]'), 12000, 'info circle');
    info.click();
  },
};

// ── Edge cases (audit/edge-flows-7-10.md, 7.3) ──

/** 360 dp Android width with a very large balance: confirmed cashback ₹10,00,000. Checks the section amounts and the masthead in the narrow frame. */
export const Narrow360LargeAmount: Story = {
  tags: ['live'],
  globals: ANDROID_360,
  parameters: { source: `${SRC}:208` },
  render: () => (
    <Methods
      width={360}
      a={api.ok({ earnings: earningsWith(earningsFixture.cashbackOnly, { total_earned: '1000600.00', total_cashback_earned: '1000600.00', confirmed_cashback: '1000000.00' }) })}
    />
  ),
};

/** Gap G4, P2. The earnings call never answers, and the user taps "UPI payments" while the amount reads a dash. The next step opens with a draft amount of ₹0 (the stub "→ WithdrawEnterUPI" shows amount 0). The payout POST sends no amount, so this is a display and analytics error, not a ₹0 payout. Low reach: the entries pass the gate first. Taps after mount. */
export const TapWhileLoading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:224` },
  render: () => <Methods a={api.ok({ earnings: reply.hang() })} />,
  play: async ({ canvasElement }) => {
    await sleep(800);
    await tapText(canvasElement, 'UPI payments');
  },
};

/** The earnings call fails (HTTP 500, no cache). The screen reads only isLoading, so it shows ₹0 amounts and live rows, as if the user had no money. Reachable after a session expiry clears the cache, or a focus refetch that fails with no data. Shows after the app's own retries (1 to 2 s). */
export const EarningsError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:184` },
  render: () => <Methods a={api.ok({ earnings: reply.error(500) })} />,
};

/** PROPOSED. Earnings error as a state: no ₹0 amounts and no payout rows when the balance is unknown. */
export const EarningsErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the ₹0 layout at ${SRC}:184. Copy from audit/edge-flows-7-10.md 7.3. Open question: hide the rows (assumed), or keep them and block the tap? Owner: product owner.` } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <Header leading="back" title="Withdraw Cashback" />
        <View style={{ paddingTop: spacing[40] }}>
          <ScreenState
            image={images.screenstate.tracking}
            title="Couldn't load your balance"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => undefined}
          />
        </View>
      </View>
    </PhoneFrame>
  ),
};
