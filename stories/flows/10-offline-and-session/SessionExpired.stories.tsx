import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { OrdersList } from '../../../src/screens/OrdersList';
import { EarningsScreen } from '../../../src/screens/EarningsScreen';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { GuestPrompt } from '../../../src/organisms/GuestPrompt';
import { spacing } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/10 Offline and session/Session expired',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const HOW = 'The harness answers every user call with 401 and the refresh call with 401 (code 2004). `AuthContext.expireSession` clears the cache, the status drops to `unauthenticated` and the login sheet opens by itself (source `session_expired`). The sheet is not yet seen in a visible browser. The sheet has one fixed title: it does not say the session ended (DS gap 4). No `onSuccess` is set, so after login the user stays where they were.';

/** Orders list when the refresh token is rejected: the login sheet rises over "No orders yet". */
export const OrdersListSessionExpired: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/AuthContext.tsx:193', docs: { description: { story: HOW + ' Behind the sheet the screen never reads auth, so it shows "No orders yet" (`OrdersList.tsx:425`) although the user has orders.' } } },
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="sessionExpired" api={api.ok()} />,
};

/** Earnings when the session ends: the sheet over the guest layout. */
export const EarningsSessionExpired: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/AuthContext.tsx:193', docs: { description: { story: HOW } } },
  render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="sessionExpired" api={api.ok()} />,
};

/** Profile when the session ends: the account card gives way to the guest prompt, the sheet opens. */
export const ProfileSessionExpired: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/AuthContext.tsx:193', docs: { description: { story: HOW } } },
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} auth="sessionExpired" api={api.ok()} />,
};

/** PROPOSED: Orders list shows a login prompt instead of a false "No orders yet". */
export const OrdersListLoginPrompt: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Copy from ux-states.md section 7: title "Log in to see your orders", body "Your orders and cashback are safe. Log in again to see them.", action "Log in". Open question: show this under the login sheet, or only after the user dismisses the sheet.' } } },
  render: () => (
    <ProposedPage title="Orders">
      <View style={{ padding: spacing[16] }}>
        <GuestPrompt title="Log in to see your orders" body="Your orders and cashback are safe. Log in again to see them." actionLabel="Log in" onLogin={() => {}} />
      </View>
    </ProposedPage>
  ),
};
