import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Timeline, type TimelineStep, type TimelineTone } from '../../../src/organisms/Timeline';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const PAID: TimelineStep[] = [
  { iconName: 'cart-outline', title: 'Order placed', date: '19 Sep 2026', fill: 'soft', tone: 'success' },
  { iconName: 'check-circle-outline', title: 'Cashback tracked', date: '19 Sep 2026', fill: 'soft', tone: 'success' },
  { iconName: 'wallet-filled', title: 'Cashback paid', date: '2 Oct 2026', fill: 'solid', tone: 'success' },
];
const CANCELLED: TimelineStep[] = [
  { iconName: 'cart-outline', title: 'Order placed', date: '19 Sep 2026', fill: 'soft', tone: 'success' },
  { iconName: 'check-circle-outline', title: 'Cashback tracked', date: '19 Sep 2026', fill: 'soft', tone: 'success' },
  { iconName: 'close', title: 'Order cancelled', date: '24 Sep 2026', fill: 'solid', tone: 'error' },
];

const meta = {
  title: 'Components/Steppers/Timeline',
  component: Timeline,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/Timeline.tsx',
    docs: { description: { component: 'Vertical status history for an order: 44 px tone circles, a dashed connector and a date per step.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: { steps: { control: 'object' }, style: { control: false } },
  args: { steps: PAID },
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

const TONES: TimelineTone[] = ['success', 'warning', 'error', 'brand'];

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Tone (success, warning, error, brand) crossed with fill (soft for a past step, solid for the current or final one).' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[8] }}>
      {TONES.map((tone) => (
        <Block key={tone} title={`tone ${tone}: soft, then solid`}>
          <Timeline
            style={{ paddingVertical: spacing[8] }}
            steps={[
              { iconName: 'cart-outline', title: 'Order placed', date: '19 Sep 2026', fill: 'soft', tone },
              { iconName: 'clock-outline', title: 'Cashback pending', date: '20 Sep 2026', fill: 'solid', tone },
            ]}
          />
        </Block>
      ))}
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[8] }}>
      <Block title="paid"><Timeline steps={PAID} /></Block>
      <Block title="cancelled"><Timeline steps={CANCELLED} /></Block>
      <Block title="one step"><Timeline steps={PAID.slice(0, 1)} /></Block>
      <Block title="long title"><Timeline steps={[{ iconName: 'cart-outline', title: 'Order of ₹10,00,000 placed on the partner store through the CashKaro app', date: '19 Sep 2026', fill: 'solid', tone: 'brand' }]} /></Block>
    </View>
  ),
};
