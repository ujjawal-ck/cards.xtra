import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { StatDelta } from '../../../src/atoms/StatDelta';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Text and numbers/StatDelta',
  component: StatDelta,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/StatDelta.tsx',
    docs: { description: { component: 'A number with a stated direction ("₹590, down ₹2,360 less") and an optional reference line. Direction is always shown by icon and word, never by colour alone. Used by CompareCard.' } },
  },
  decorators: [(Story) => <View style={{ width: 320 }}><Story /></View>],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    delta: { control: 'text' },
    direction: { control: 'select', options: ['up', 'down', 'same'] },
    sentiment: { control: 'select', options: ['good', 'bad', 'neutral'] },
    layout: { control: 'select', options: ['row', 'stack'] },
    reference: { control: 'object' },
  },
  args: { label: 'Annual fee', value: '₹590', delta: '₹2,360 less', direction: 'down', sentiment: 'good', layout: 'row', reference: { label: 'Axis ACE', value: '₹2,950' } },
} satisfies Meta<typeof StatDelta>;
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
      <Cell label="down / good (lower fee)"><View style={{ width: 320 }}><StatDelta label="Annual fee" value="₹590" delta="₹2,360 less" direction="down" sentiment="good" reference={{ label: 'Axis ACE', value: '₹2,950' }} /></View></Cell>
      <Cell label="up / good (more cashback)"><View style={{ width: 320 }}><StatDelta label="Yearly cashback" value={14500} delta="₹3,000 more" direction="up" sentiment="good" /></View></Cell>
      <Cell label="up / bad (higher fee)"><View style={{ width: 320 }}><StatDelta label="Annual fee" value={2950} delta="₹2,360 more" direction="up" sentiment="bad" /></View></Cell>
      <Cell label="same / neutral"><View style={{ width: 320 }}><StatDelta label="Joining fee" value="₹500" delta="Same" direction="same" sentiment="neutral" /></View></Cell>
      <Cell label="stack layout"><View style={{ width: 320 }}><StatDelta label="Annual fee" value="₹590" delta="₹2,360 less" direction="down" sentiment="good" layout="stack" reference={{ label: 'Axis ACE', value: '₹2,950' }} /></View></Cell>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. A numeric value is formatted as rupees with Indian grouping (formatINR). Values are never truncated: a long delta wraps. Value with no delta shows the number only.' } } },
  render: () => (
    <View style={{ gap: spacing[24], width: 320 }}>
      <Cell label="no delta"><View style={{ width: 320 }}><StatDelta label="Welcome bonus" value={100000} /></View></Cell>
      <Cell label="large number, Indian grouping"><View style={{ width: 320 }}><StatDelta label="Lifetime savings" value={1234567} delta="₹1,00,000 more" direction="up" sentiment="good" /></View></Cell>
      <Cell label="long delta wraps"><View style={{ width: 320 }}><StatDelta label="Annual fee" value="₹1,00,000" delta="₹12,34,567 less than HDFC Millennia and SBI Cashback combined" direction="down" sentiment="good" reference={{ label: 'SBI Cashback', value: '₹12,35,567' }} /></View></Cell>
    </View>
  ),
};
