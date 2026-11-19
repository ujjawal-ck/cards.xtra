import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AmountSkeleton } from '../../../src/atoms/AmountSkeleton';
import { Text } from '../../../src/atoms';
import { Block, Stack, inr } from '../carousels/_chrome';
import { colors, spacing, radius } from '../../../src/tokens';

const meta = {
  title: 'Components/Loading/AmountSkeleton',
  component: AmountSkeleton,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/AmountSkeleton.tsx',
    docs: { description: { component: 'A pulsing bar that stands in for a money amount while it loads, so a screen never shows a fake default value.' } },
  },
  argTypes: {
    width: { control: 'text', description: 'Match the rough width of the amount. Default 88.' },
    height: { control: { type: 'number', min: 8, max: 64 }, description: 'Match the text line height. Default 16.' },
    tone: { control: 'inline-radio', options: ['default', 'onDark'], description: 'onDark for a dark hero such as the Earnings masthead.' },
    style: { control: false },
  },
  args: { width: 88, height: 16, tone: 'default' },
} satisfies Meta<typeof AmountSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="Body amount (88 by 16, default)"><View style={{ paddingHorizontal: spacing[16] }}><AmountSkeleton /></View></Block>
      <Block label="Display headline (160 by 40)"><View style={{ paddingHorizontal: spacing[16] }}><AmountSkeleton width={160} height={40} /></View></Block>
      <Block label="onDark, on a dark hero">
        <View style={{ marginHorizontal: spacing[16], padding: spacing[16], borderRadius: radius.lg, backgroundColor: colors.surface.dark }}>
          <AmountSkeleton tone="onDark" width={160} height={40} />
        </View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Loading versus loaded: the loaded row shows the real figures. Pattern rule: no spinner on money values, and never a default ₹0 while loading.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Loading, then loaded">
        <View style={{ gap: spacing[12], paddingHorizontal: spacing[16] }}>
          {[['Confirmed', 8450], ['Pending', 0], ['Lifetime', 1000000]].map(([label, v]) => (
            <View key={label as string} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body14Regular" color={colors.text.secondary}>{label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16] }}>
                <AmountSkeleton width={72} />
                <Text variant="body14SemiBold" color={colors.text.primary}>{inr(v as number)}</Text>
              </View>
            </View>
          ))}
        </View>
      </Block>
    </Stack>
  ),
};
