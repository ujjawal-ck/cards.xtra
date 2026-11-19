import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OfflineBanner } from '../../src/molecules/OfflineBanner';
import { ScreenState } from '../../src/organisms/ScreenState';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { Text } from '../../src/atoms/Text';
import { ComponentHarness } from '../../storybook/harness';
import { colors, spacing } from '../../src/tokens';
import { Board, Phone, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Offline',
  parameters: { layout: 'padded', docs: { description: { component: 'The global strip says the device is offline. Each screen must also say what is missing, never show a false empty or a false zero.' } } },
};
export default meta;
type Story = StoryObj;

/** Make the browser report offline while the example is mounted, then restore it. */
function ForceOffline({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const nav = window.navigator;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(nav), 'onLine');
    Object.defineProperty(nav, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
    setReady(true);
    return () => {
      delete (nav as any).onLine;
      if (desc && !('onLine' in nav)) Object.defineProperty(Object.getPrototypeOf(nav), 'onLine', desc);
      window.dispatchEvent(new Event('online'));
    };
  }, []);
  return ready ? <>{children}</> : null;
}

export const Banner: Story = {
  tags: ['live'],
  parameters: { source: 'src/molecules/OfflineBanner.tsx:16', docs: { description: { story: 'The real OfflineBanner. It renders only when NetInfo reports offline, so this story sets the browser online flag to false while it is mounted. It is pinned to the top of its frame.' } } },
  render: () => (
    <Board>
      <ComponentHarness>
        <ForceOffline>
          <View style={{ width: 390, height: 160, position: 'relative', overflow: 'hidden', backgroundColor: colors.surface.default }}>
            <OfflineBanner />
            <View style={{ padding: spacing[16], paddingTop: spacing[48] }}><Text variant="body14Medium">Data already loaded stays on screen.</Text></View>
          </View>
        </ForceOffline>
      </ComponentHarness>
    </Board>
  ),
};

export const ToolsOffline: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/tools/ToolResultsScreen.tsx:536', docs: { description: { story: 'The tools already handle paused queries: a ScreenState with "Try again". This is the copy the proposal reuses on every other screen.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};

export const StandardOfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md "Standard offline state"', docs: { description: { story: 'Proposed: the one offline state for Home, Offers, Orders, Claims, Cards you can get, Advisor and All card benefits. Today a paused query with no cache falls through to the empty branch and says "0 cards" or "No offers here yet". Needs a shared helper that maps "paused with no data" to an offline flag (engineering, see `src/query/useCardSavings.ts:124`). Open question: add the "Connection lost" illustration when it exists.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};

export const EarningsOfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 6 (Earnings, offline no cache)', docs: { description: { story: 'Proposed: Earnings offline with no cache shows Confirmed ₹0 and Pending ₹0 today (`src/screens/EarningsScreen.tsx:288`). Show the offline state in place of the masthead and rows. Never render ₹0 for "unknown". Open question: none.' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState title="You're offline" body="Your balance will show when you're back online." actionLabel="Try again" onAction={noop} />
    </Phone></Board>
  ),
};

export const LoginOfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 1 (Login sheet, offline when requesting OTP)', docs: { description: { story: 'Proposed: offline when requesting an OTP shows the raw API text today (`src/auth/LoginSheetProvider.tsx:466`). An InlineMessage in the warning tone.' } } },
  render: () => (
    <Board><Phone>
      <InlineMessage tone="warning" message="You're offline. Connect to get your OTP." />
    </Phone></Board>
  ),
};
