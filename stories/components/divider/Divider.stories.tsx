import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Divider } from '../../../src/atoms/Divider';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const STYLES = ['solid', 'dashed', 'fade', 'or', 'text-count', 'section'] as const;

const meta = {
  title: 'Components/Divider/Divider',
  component: Divider,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Divider.tsx',
    docs: { description: { component: 'The horizontal line between content: 6 styles from a hairline to a thick full-bleed section band. It fills the width of its parent.' } },
  },
  decorators: [(Story) => <View style={{ width: 320 }}><Story /></View>],
  argTypes: {
    style: { control: 'select', options: [...STYLES] },
    label: { control: 'text' },
    counter: { control: 'text' },
    showCounter: { control: 'boolean' },
    color: { control: 'color' },
  },
  args: { style: 'solid', label: 'Your cards', counter: 3, showCounter: true },
} satisfies Meta<typeof Divider>;
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
    <View style={{ gap: spacing[24], width: 320 }}>
      <Cell label="solid"><View style={{ width: 320 }}><Divider style="solid" /></View></Cell>
      <Cell label="dashed"><View style={{ width: 320 }}><Divider style="dashed" /></View></Cell>
      <Cell label="fade"><View style={{ width: 320 }}><Divider style="fade" /></View></Cell>
      <Cell label="or"><View style={{ width: 320 }}><Divider style="or" /></View></Cell>
      <Cell label="text-count"><View style={{ width: 320 }}><Divider style="text-count" label="Your cards" counter={3} showCounter /></View></Cell>
      <Cell label="section (8 px band)"><View style={{ width: 320 }}><Divider style="section" /></View></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Dividers have no disabled, loading or error state. Shown here: text-count without a counter, a long label, a counter that is a rupee total, and a custom stroke colour (solid and dashed only honour color).' } } },
  render: () => (
    <View style={{ gap: spacing[24], width: 320 }}>
      <Cell label="text-count, no counter"><View style={{ width: 320 }}><Divider style="text-count" label="Recommended for you" /></View></Cell>
      <Cell label="text-count, long label"><View style={{ width: 320 }}><Divider style="text-count" label="HDFC Millennia, SBI Cashback and 14 more cards" counter={16} showCounter /></View></Cell>
      <Cell label="text-count, amount as counter"><View style={{ width: 320 }}><Divider style="text-count" label="Total earned" counter="₹1,00,000" showCounter /></View></Cell>
      <Cell label="solid with color override"><View style={{ width: 320 }}><Divider style="solid" color={colors.border.strong} /></View></Cell>
      <Cell label="dashed with color override"><View style={{ width: 320 }}><Divider style="dashed" color={colors.border.strong} /></View></Cell>
    </View>
  ),
};
