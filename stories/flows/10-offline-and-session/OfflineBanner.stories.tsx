import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { OfflineBanner } from '../../../src/molecules/OfflineBanner';
import { OrdersList } from '../../../src/screens/OrdersList';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { ComponentHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/10 Offline and session/Offline banner',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/**
 * The banner reads NetInfo. In the browser NetInfo follows `navigator.onLine`, so this
 * wrapper makes it report offline while the story is mounted, and restores it on unmount.
 */
function ForceOffline({ children }: { children: React.ReactNode }) {
  useState(() => {
    try {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      window.dispatchEvent(new Event('offline'));
    } catch { /* leave the browser state alone */ }
  });
  useEffect(() => () => {
    try {
      delete (navigator as { onLine?: boolean }).onLine;
      window.dispatchEvent(new Event('online'));
    } catch { /* ignore */ }
  }, []);
  return <>{children}</>;
}

const NOTE = 'App.js mounts the banner above the navigator, so it sits over every screen. Here the banner and the real screen share one frame; the browser is told it is offline while the story is mounted, and `api.offline()` pauses the queries like NetInfo does in the app. Not yet seen in a visible browser (the NetInfo web shim is the risk): if the strip is missing, report it.';

/** The warning strip at the top of the screen while the device is offline. Under it, Orders list shows its loaded or empty layout. */
export const BannerOverOrders: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/molecules/OfflineBanner.tsx:16',
    docs: { description: { story: NOTE + ' With no cache, the screen under the strip says "No orders yet" (R6): the banner is the only offline signal.' } },
  },
  render: () => (
    <ForceOffline>
      <ComponentHarness auth="signedIn" api={api.offline()}>
        <View style={{ flex: 1 }}>
          <OrdersList />
          <OfflineBanner />
        </View>
      </ComponentHarness>
    </ForceOffline>
  ),
};

/** The same strip over the Profile tab: name and contact empty under it. */
export const BannerOverProfile: Story = {
  tags: ['live'],
  parameters: { source: 'src/molecules/OfflineBanner.tsx:16', docs: { description: { story: NOTE } } },
  render: () => (
    <ForceOffline>
      <ComponentHarness auth="signedIn" api={api.offline()}>
        <View style={{ flex: 1 }}>
          <ProfileScreen />
          <OfflineBanner />
        </View>
      </ComponentHarness>
    </ForceOffline>
  ),
};
