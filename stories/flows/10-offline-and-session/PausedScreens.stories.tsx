import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { HomeScreen } from '../../../src/screens/HomeScreen';
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { OffersScreen } from '../../../src/screens/OffersScreen';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { OrdersList } from '../../../src/screens/OrdersList';
import { OrdersDetail } from '../../../src/screens/OrdersDetail';
import { MissingCashbackDidYouShop } from '../../../src/screens/MissingCashbackDidYouShop';
import { MissingCashbackHelp } from '../../../src/screens/MissingCashbackHelp';
import { InlineMessage } from '../../../src/molecules/InlineMessage';
import { Skeleton } from '../../../src/atoms/Skeleton';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { tap } from './_dom';
import { ProposedPage, OfflineState } from './_proposed';

const meta: Meta = {
  title: 'Flows/10 Offline and session/Paused screens',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const R6 = 'R6 (inferred from code, not seen on a device): offline with no cache, React Query pauses the query, so `isLoading` and `isError` are both false and the screen falls to its loaded or empty layout. `api.offline()` reproduces the pause. The app also shows the warning strip on top (see the Offline banner story). ';
const off = (name: string, component: React.ComponentType<any>, extra: Partial<React.ComponentProps<typeof ScreenHarness>> = {}) => (
  <ScreenHarness name={name} component={component} auth="signedIn" api={api.offline()} {...(extra as object)} />
);

/** Home: no cards, no error, no message. */
export const HomeOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2244', docs: { description: { story: R6 + 'Home shows the masthead and filters with no cards.' } } },
  render: () => <ScreenHarness name="Home" component={HomeScreen} api={api.offline()} />,
};

/** Earnings: Confirmed and Pending read ₹0 (a wrong money figure). */
export const EarningsOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/EarningsScreen.tsx:96', docs: { description: { story: R6 + 'Balances read ₹0 (`?? \'₹0\'`). Users read it as "my cashback vanished". The headline counter renders "0" on web (harness limit).' } } },
  render: () => off('Earnings', EarningsScreen),
};

/** Offers: "No offers here yet". */
export const OffersOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OffersScreen.tsx:552', docs: { description: { story: R6 + 'Reads "No offers here yet" on a whole revenue tab.' } } },
  render: () => off('Offers', OffersScreen),
};

/** Orders list: "No orders yet". */
export const OrdersListOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OrdersList.tsx:425', docs: { description: { story: R6 } } },
  render: () => off('OrdersList', OrdersList),
};

/** Order detail: the body renders with empty values. */
export const OrderDetailOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/OrdersDetail.tsx:198', docs: { description: { story: R6 + 'Neither spinner nor error shows; the body shows dashes.' } } },
  render: () => off('OrdersDetail', OrdersDetail, { params: { id: '24600001' } }),
};

/** Claims list: the empty tab copy. */
export const ClaimsListOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackDidYouShop.tsx:168', docs: { description: { story: R6 + 'The user is told there is nothing under review.' } } },
  render: () => off('MissingCashbackDidYouShop', MissingCashbackDidYouShop, { params: { backTo: 'back' } }),
};

/** Missing cashback "Yes" offline: the paused lookup counts as "no visits" and goes to Oops. A play function taps Yes. */
export const MissingCashbackYesOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackHelp.tsx:72', docs: { description: { story: R6 + 'Reached by a tap on Yes. A real shopper is sent to "Oops" (stub page here) and told they have no visits.' } } },
  render: () => off('MissingCashbackHelp', MissingCashbackHelp),
  play: async () => { await tap('Yes'); },
};

/** Profile: blank name and contact. */
export const ProfileOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/ProfileScreen.tsx:64', docs: { description: { story: R6 } } },
  render: () => off('Profile', ProfileScreen),
};

// ── Proposed fixes: the standard offline state from ux-states.md ─────────────

const FIX = 'Fix for R6. Needs one shared helper that maps "paused with no data" to an offline flag (copied from `useCardSavings.ts:124`). Copy reuses the tool screens\' "You\'re offline" / "Check your connection and try again." Open question: no illustration until the "Connection lost" asset exists (DS gap 1).';

/** PROPOSED: Orders list offline with no cache. */
export const OrdersListOfflineFix: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: FIX } } },
  render: () => <ProposedPage title="Orders"><OfflineState /></ProposedPage>,
};

/** PROPOSED: Order detail offline with no cache. */
export const OrderDetailOfflineFix: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: FIX } } },
  render: () => <ProposedPage title="Order Details"><OfflineState /></ProposedPage>,
};

/** PROPOSED: Claims list offline with no cache. */
export const ClaimsListOfflineFix: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: FIX } } },
  render: () => <ProposedPage title="Missing Cashback"><OfflineState /></ProposedPage>,
};

/** PROPOSED: Earnings offline with no cache: no ₹0 figures. */
export const EarningsOfflineFix: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: FIX + ' Open question: with a cache, show the last known balance with a "last updated" label instead.' } } },
  render: () => <ProposedPage title="Earnings"><OfflineState /></ProposedPage>,
};

/** PROPOSED: Profile offline with no cache: skeleton lines and a warning. */
export const ProfileOfflineFix: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Copy from ux-states.md section 8: "You\'re offline. Your details will show when you\'re back online." Menu rows stay usable. Open question: same message for a failed (not offline) profile call, or a "Try again" variant.' } } },
  render: () => (
    <ProposedPage title="Profile" background={colors.background.muted}>
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Skeleton width="60%" height={spacing[24]} />
        <Skeleton width="40%" height={spacing[16]} />
        <InlineMessage tone="warning" message="You're offline. Your details will show when you're back online." />
        <Text variant="body14Regular" color={colors.text.secondary}>Menu rows follow here and stay usable.</Text>
      </View>
    </ProposedPage>
  ),
};
