import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { WithdrawScreen } from '../../../src/screens/WithdrawScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture } from '../../../storybook/fixtures';
import { sleep, tapText, waitFor } from './_interact';

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
const Methods = ({ a }: { a: ReturnType<typeof api.ok> }) => (
  <ScreenHarness name="WithdrawMethodSelect" component={WithdrawScreen} auth="signedIn" api={a} />
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
