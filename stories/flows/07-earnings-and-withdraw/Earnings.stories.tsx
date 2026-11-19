import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { Text } from '../../../src/atoms';
import { ScreenState } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, earningsFixture, ordersFixture, reply } from '../../../storybook/fixtures';
import { sleep, tapText } from './_interact';
import { ANDROID_360, earningsWith } from './_shared';
import { queryClient } from '../../../src/query/queryClient';
import { qk } from '../../../src/query/keys';
import { mapEarnings } from '../../../src/api/earningsMapper';

/**
 * Flow 7, step 1. The Earnings tab: totals, Confirmed (Withdraw), Pending ("Know Why?"), transactions.
 * Known harness limit: the headline total (RollingAmount) renders "0" on web.
 */
const meta: Meta = {
  title: 'Flows/7 Earnings and withdraw/Earnings',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/EarningsScreen.tsx';
const Earnings = ({ a, auth = 'signedIn' as const, width, beforeMount }: { a: ReturnType<typeof api.ok>; auth?: 'guest' | 'signedIn'; width?: number; beforeMount?: () => void }) => (
  <ScreenHarness name="Earnings" component={EarningsScreen} auth={auth} api={a} width={width} beforeMount={beforeMount} />
);

/** Signed out: "See every rupee you earn" with a Log in button. No money figures. */
export const Guest: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:147` },
  render: () => <Earnings auth="guest" a={api.ok()} />,
};

/** First load: every amount and the transaction rows show skeletons. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:96` },
  render: () => <Earnings a={api.loading()} />,
};

/** Loaded, typical user: Confirmed ₹1,590 (cashback ₹1,240 + rewards ₹350), Pending ₹2,400, six transactions. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:83` },
  render: () => <Earnings a={api.ok()} />,
};

/** Loaded, very large amounts (doc fixture, about ₹14.5 lakh earned). Checks the long amount in the cards. */
export const LoadedLargeAmounts: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:83` },
  render: () => <Earnings a={api.ok({ earnings: earningsFixture.rich })} />,
};

/** New user: every balance ₹0. Withdraw is on screen and opens the "nothing to withdraw" sheet (see Withdraw gate). */
export const Zero: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:83` },
  render: () => <Earnings a={api.empty()} />,
};

/** Earnings call fails with HTTP 500 and nothing is cached: "Couldn't load your earnings" + Try again. Shows after the app's own retries (1 to 2 s). */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:199` },
  render: () => <Earnings a={api.ok({ earnings: reply.error(500) })} />,
};

/** Offline cold start with no cache. R6, inferred from code (TanStack v5 pauses the query, so it is neither loading nor error): the screen falls through to its loaded layout and shows Confirmed ₹0 and Pending ₹0. A user with money sees nothing to withdraw. */
export const OfflineShowsZero: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:288` },
  render: () => <Earnings a={api.offline()} />,
};

/** The recent transactions call fails (earnings load fine): "Couldn't load your transactions" + Try again. */
export const TransactionsError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:356` },
  render: () => <Earnings a={api.ok({ orders: reply.error(500) })} />,
};

/** No transactions at all: the empty line for the "All" chip. */
export const TransactionsEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:363` },
  render: () => <Earnings a={api.ok({ orders: ordersFixture.empty })} />,
};

/** "Know Why?" sheet for the pending amount. Taps the real button after mount. */
export const PendingSheet: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:304` },
  render: () => <Earnings a={api.ok()} />,
  play: async ({ canvasElement }) => {
    await sleep(800);
    await tapText(canvasElement, 'Know Why?');
  },
};

/** PROPOSED (R6 fix). Offline with no cache: the standard offline state in place of the masthead and rows. Never ₹0 for "unknown". Open question: engineering must add one shared helper that maps "paused with no data" to an offline flag (copy it from useCardSavings) before this can ship. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Replaces the ₹0 layout at src/screens/EarningsScreen.tsx:288. Copy from audit/ux-states.md flow 6. Open question: show the last known balance when a cache exists, or always hide it while offline?' } },
  },
  render: () => (
    <PhoneFrame background={colors.background.muted}>
      <ScrollView contentContainerStyle={{ paddingTop: spacing[16], paddingHorizontal: spacing[16], gap: spacing[16] }}>
        <Text variant="heading20SemiBold" color={colors.text.primary}>My Earnings</Text>
        <View>
          <ScreenState title="You're offline" body="Your balance will show when you're back online." actionLabel="Try again" />
        </View>
      </ScrollView>
    </PhoneFrame>
  ),
};

// ── Edge cases (audit/edge-flows-7-10.md, 7.1) ──

const tapCashbackCard = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await sleep(1500);
  await tapText(canvasElement, 'Cashback');
};

/** Offline with a cached balance (R6 variant). The balance was loaded earlier, then the connection dropped. The cached amounts show with no "last updated" cue, and the transactions list shows its empty line because orders were never cached: a second false empty. Open question Q3: show the age of the balance? */
export const OfflineWithCache: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:96` },
  render: () => (
    <Earnings
      a={api.offline()}
      beforeMount={() => {
        queryClient.setQueryData(qk.user.earnings(), mapEarnings(earningsFixture.typical));
      }}
    />
  ),
};

/** Partial response: the earnings call answers 200 but the confirmed and pending fields are null. The mapper reads each missing field as ₹0, so the user sees ₹0 for an unknown value (gap G6, never ₹0 for unknown). */
export const MissingAmountFields: Story = {
  tags: ['live'],
  parameters: { source: 'src/api/earningsMapper.ts:91' },
  render: () => (
    <Earnings
      a={api.ok({ earnings: earningsWith(earningsFixture.typical, { confirmed_cashback: null, pending_cashback: null, confirmed_rewards: null, pending_rewards: null }) })}
    />
  ),
};

/** The Cashback breakup sheet opened while the amounts still load (every call hangs). Gap G6: the sheet defaults every amount to ₹0, so Confirmed, Pending and Paid read ₹0. Taps the Cashback card after mount. */
export const BreakupSheetWhileLoading: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/EarningsBreakupSheet.tsx:174' },
  render: () => <Earnings a={api.loading()} />,
  play: tapCashbackCard,
};

/** The Cashback breakup sheet with loaded data: Confirmed, Pending and Paid cashback. Taps the Cashback card after mount. */
export const BreakupSheet: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:447` },
  render: () => <Earnings a={api.ok()} />,
  play: tapCashbackCard,
};

/** 360 dp Android width with very large amounts (doc fixture, about ₹14.5 lakh). Checks the rows and cards below the headline; the headline (RollingAmount) renders "0" on web. */
export const LargeAmounts360: Story = {
  tags: ['live'],
  globals: ANDROID_360,
  parameters: { source: `${SRC}:83` },
  render: () => <Earnings width={360} a={api.ok({ earnings: earningsFixture.rich })} />,
};

/** The earnings call answers HTTP 403 (gateway or bad key). Only 401 triggers a refresh, so the screen shows its generic "Couldn't load your earnings" and a retry cannot help. Open question Q12. Shows after the app's own retries (1 to 2 s). */
export const Forbidden403: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:199` },
  render: () => <Earnings a={api.ok({ earnings: reply.error(403) })} />,
};
