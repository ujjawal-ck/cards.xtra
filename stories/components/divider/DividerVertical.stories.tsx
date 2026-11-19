import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { DividerVertical } from '../../../src/atoms/DividerVertical';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Divider/DividerVertical',
  component: DividerVertical,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/DividerVertical.tsx',
    docs: { description: { component: 'The vertical 1 px line between side-by-side blocks (for example between two stats): solid, fade, dashed or "or". Height defaults to 80.' } },
  },
  argTypes: {
    style: { control: 'select', options: ['solid', 'fade', 'dashed', 'or'] },
    height: { control: { type: 'number', min: 24, max: 200 } },
  },
  args: { style: 'solid', height: 80 },
} satisfies Meta<typeof DividerVertical>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: spacing[32] }}>
      {(['solid', 'fade', 'dashed', 'or'] as const).map((s) => (
        <Cell key={s} label={s}><DividerVertical style={s} /></Cell>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Shown: a custom height, and the divider used between two stats with rupee amounts. The "or" style needs at least about 56 px of height (two 24 px segments plus the word).' } } },
  render: () => (
    <View style={{ gap: spacing[24] }}>
      <Cell label="height 40"><DividerVertical height={40} /></Cell>
      <Cell label="between two stats">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16] }}>
          <View><Text variant="body12Regular" color={colors.text.secondary}>Earned</Text><Text variant="heading20SemiBold">₹1,00,000</Text></View>
          <DividerVertical style="fade" height={40} />
          <View><Text variant="body12Regular" color={colors.text.secondary}>Pending</Text><Text variant="heading20SemiBold">₹2,350</Text></View>
        </View>
      </Cell>
    </View>
  ),
};
