import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { NumberBadge } from '../../../src/atoms/NumberBadge';

const meta = {
  title: 'Components/Badge and Tag/NumberBadge',
  component: NumberBadge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/NumberBadge.tsx',
    docs: { description: { component: 'Unused today. A 16 px round count marker for tabs, carts and chips, dark or light. RankBadge is the 24 px ranked-list number.' } },
  },
  argTypes: {
    count: { control: { type: 'number', min: 0, max: 9999 } },
    tone: { control: 'select', options: ['dark', 'light'] },
    accessibilityLabel: { control: 'text' },
  },
  args: { count: 3, tone: 'dark' },
} satisfies Meta<typeof NumberBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
    <Text variant="caption10Medium" color={colors.text.tertiary}>{label}</Text>
    {children}
  </View>
);
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16], maxWidth: 520, alignItems: 'flex-start' }}>{children}</View>
);

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Cell label="dark"><NumberBadge count={3} tone="dark" /></Cell>
      <Cell label="light (on a white card it needs the border)"><NumberBadge count={3} tone="light" /></Cell>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Zero, double and large counts. The component does not cap a count ("99+"): open question for product, cap in the caller or add a rule. No disabled or loading state.' } } },
  render: () => (
    <Wrap>
      <Cell label="0"><NumberBadge count={0} /></Cell>
      <Cell label="12"><NumberBadge count={12} /></Cell>
      <Cell label="1,250"><NumberBadge count={1250} tone="light" /></Cell>
    </Wrap>
  ),
};
