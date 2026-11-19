import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EarningsScreen } from '../../src/screens/EarningsScreen';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { OrdersList } from '../../src/screens/OrdersList';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { LogoutConfirmSheet, type LogoutConfirmSheetRef } from '../../src/organisms/LogoutConfirmSheet';
import { ScreenHarness, SheetHarness } from '../../storybook/harness';
import { api, earningsFixture } from '../../storybook/fixtures';

/**
 * Proof stories for the shared harness. Each one names what must be visible.
 * docs.story.inline false: harness stories share one fetch mock and one query
 * cache, so they must not render side by side on a docs page.
 */
const meta: Meta = {
  title: 'Harness/Check',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/** Signed in, typical earnings: total ₹4,860, confirmed ₹1,240 (non-zero amounts, no login prompt). */
export const EarningsSignedInOk: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok()} />,
};

/** Signed in, rich earnings (doc fixture): ₹14.5 lakh total. */
export const EarningsSignedInRich: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok({ earnings: earningsFixture.rich })} />,
};

/** Signed in, network down: queries paused (offline state, no data). */
export const EarningsSignedInOffline: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.offline()} />,
};

/** Session expired: the user calls answer 401, refresh answers 401, the login sheet opens itself. */
export const EarningsSessionExpired: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Earnings" component={EarningsScreen} auth="sessionExpired" api={api.ok()} />,
};

/** Guest, all data: 10 cards (HDFC Regalia Gold, SBI Cashback, HSBC Live+ …) with local card art. */
export const HomeGuestOk: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Home" component={HomeScreen} api={api.ok()} />,
};

/** Signed in, no orders: the "No orders yet" empty state. */
export const OrdersListSignedInEmpty: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={api.empty()} />,
};

/** Signed in, 6 orders, one per status. */
export const OrdersListSignedInOk: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="OrdersList" component={OrdersList} auth="signedIn" api={api.ok()} />,
};

/** Guest: no account card, no earnings, no logout row. */
export const ProfileGuest: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} api={api.ok()} />,
};

/** Signed in with a display name: "Test User" in the account card. */
export const ProfileSignedIn: Story = {
  tags: ['live'],
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} auth="signedIn" displayName="Test User" api={api.ok()} />,
};

/** A gorhom sheet presented on mount inside the 390x844 frame. */
export const SheetLogoutConfirm: Story = {
  tags: ['live'],
  render: () => (
    <SheetHarness<LogoutConfirmSheetRef>>
      {(ref) => <LogoutConfirmSheet ref={ref} onConfirm={() => console.log('[storybook] logout confirmed')} />}
    </SheetHarness>
  ),
};
