import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OfflineBanner } from '../../../src/molecules/OfflineBanner';
import { ComponentHarness } from '../../../storybook/harness';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Messages and tooltips/OfflineBanner',
  component: OfflineBanner,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/OfflineBanner.tsx',
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'App-wide strip pinned to the top of the app while the device has no internet. It takes no props: it reads connectivity from NetInfo and renders nothing while online.',
      },
    },
  },
} satisfies Meta<typeof OfflineBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Static replica with the same tokens as the component, so the offline look is always visible. */
function Replica() {
  return (
    <View style={{ paddingTop: spacing[4], paddingBottom: spacing[4], paddingHorizontal: spacing[16], backgroundColor: colors.feedback.warning.subtle, borderBottomWidth: 1, borderBottomColor: colors.feedback.warning.border, alignItems: 'center' }}>
      <Text variant="body12SemiBold" color={colors.feedback.warning.text} align="center">You're offline. We'll refresh when you're back online.</Text>
    </View>
  );
}

function ForceOffline({ children }: { children: React.ReactNode }) {
  useEffect(() => { try { window.dispatchEvent(new Event('offline')); } catch { /* ignore */ } }, []);
  return <>{children}</>;
}

export const Playground: Story = {
  parameters: {
    docs: { description: { story: 'The real component inside a phone-sized frame. It shows only when NetInfo reports offline. On web NetInfo reads the browser online state, so switch the browser to offline in devtools (Network, Offline) to see it. The story also dispatches a window "offline" event on mount; this is not verified to work in every browser. The next story shows the same look drawn from the same tokens.' } },
  },
  render: () => (
    <ComponentHarness>
      <ForceOffline>
        <View style={{ width: 390, height: 200, position: 'relative', backgroundColor: colors.surface.default }}>
          <OfflineBanner />
          <View style={{ padding: spacing[16], paddingTop: spacing[48] }}><Text variant="body14Medium">Earnings: ₹1,250 confirmed</Text></View>
        </View>
      </ForceOffline>
    </ComponentHarness>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Replica of the offline strip (same tokens, copy and layout, without the top safe-area inset). Online state: the component renders nothing.' } } },
  render: () => (
    <View style={{ width: 390, gap: spacing[16] }}>
      <Text variant="body12Medium">Offline (replica)</Text>
      <Replica />
      <Text variant="body12Medium">Online: nothing renders</Text>
      <View style={{ height: spacing[32] }} />
    </View>
  ),
};

export const Variants: Story = { ...States, name: 'Variants (one look)', parameters: { docs: { description: { story: 'OfflineBanner has no variants: one strip, one message.' } } } };
