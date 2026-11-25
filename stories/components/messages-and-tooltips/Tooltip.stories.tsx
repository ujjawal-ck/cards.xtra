import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Tooltip } from '../../../src/molecules/Tooltip';
import { Text } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Messages and tooltips/Tooltip',
  component: Tooltip,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/Tooltip.tsx',
    docs: { description: { component: 'A bubble with an arrow that explains one thing on demand. It only draws the bubble: the screen decides when it shows and where it sits.' } },
  },
  argTypes: {
    theme: { control: 'select', options: ['dark', 'light'] },
    position: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    size: { control: 'select', options: ['sm', 'md'] },
    arrowAlign: { control: 'select', options: ['start', 'center', 'end'] },
    icon: { control: 'select', options: [undefined, 'message-outline', 'clock-outline', 'desc-exclamation'] },
    title: { control: 'text' },
    supporting: { control: 'text' },
    maxWidth: { control: 'number' },
  },
  args: { title: 'Confirmed cashback', supporting: 'Cashback the store has approved. You can withdraw it.', theme: 'dark', position: 'top', size: 'sm', arrowAlign: 'center', maxWidth: 280 },
  decorators: [(Story) => <View style={{ padding: spacing[32], minHeight: 160 }}><Story /></View>],
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: string }) => (
  <Text variant="body12Medium" style={{ marginBottom: spacing[8] }}>{children}</Text>
);

/** On demand: tap the info target to show the tooltip. */
function OnDemand() {
  const [open, setOpen] = useState(true);
  return (
    <View style={{ padding: spacing[32], minHeight: 140, alignItems: 'flex-start' }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
        <Text variant="body14SemiBold">Pending cashback ⓘ (tap to toggle)</Text>
      </Pressable>
      {open ? <Tooltip title="Pending cashback" supporting="Waiting for Flipkart to confirm your order." position="bottom" arrowAlign="start" /> : null}
    </View>
  );
}

export const Playground: Story = {};

export const OnDemandToggle: Story = {
  name: 'On demand (toggle)',
  parameters: { docs: { description: { story: 'Tap the label to show or hide the tooltip. The app hides it after 4 s on the Earnings masthead.' } } },
  render: () => <OnDemand />,
};

export const Variants: Story = {
  render: () => (
    <View style={{ padding: spacing[24], gap: spacing[24] }}>
      {(['dark', 'light'] as const).map((theme) => (
        <View key={theme} style={{ gap: spacing[12] }}>
          <Label>{`theme: ${theme}`}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[24] }}>
            {(['top', 'bottom', 'left', 'right'] as const).map((position) => (
              <View key={position}>
                <Label>{`position: ${position}`}</Label>
                <Tooltip theme={theme} position={position} title="Cashback X%" supporting="On Amazon orders" />
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: spacing[24], flexWrap: 'wrap' }}>
        {(['sm', 'md'] as const).map((size) => (
          <View key={size}><Label>{`size: ${size}`}</Label><Tooltip size={size} title="Cashback X%" supporting="On Amazon orders" /></View>
        ))}
        {(['start', 'center', 'end'] as const).map((a) => (
          <View key={a} style={{ minWidth: 200 }}><Label>{`arrowAlign: ${a}`}</Label><Tooltip position="bottom" arrowAlign={a} title="Cashback X%" supporting="On Amazon orders" /></View>
        ))}
      </View>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Title only, title with icon, long text capped at maxWidth, and a large rupee amount.' } } },
  render: () => (
    <View style={{ padding: spacing[24], gap: spacing[16] }}>
      <Tooltip title="Pending" />
      <Tooltip icon="clock-outline" title="Pending" supporting="Store confirms in up to 90 days." />
      <Tooltip size="md" theme="light" title="Total earned: ₹1,00,000" supporting="Across SBI Cashback and HDFC Millennia, including rewards that are still locked until the store confirms every order, which can take up to ninety days after you shop at Myntra." maxWidth={280} />
    </View>
  ),
};
