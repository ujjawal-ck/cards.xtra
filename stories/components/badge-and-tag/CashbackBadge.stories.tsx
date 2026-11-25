import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { CashbackBadge } from '../../../src/atoms/CashbackBadge';

const meta = {
  title: 'Components/Badge and Tag/CashbackBadge',
  component: CashbackBadge,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/CashbackBadge.tsx',
    docs: { description: { component: 'A pale saffron pill with an optional prefix ("Upto") and a bold money value. Use it for the cashback or reward amount on a card or store.' } },
  },
  argTypes: {
    prefix: { control: 'text' },
    value: { control: 'text' },
    showPrefix: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { prefix: 'Upto', value: '₹1,200 Cashback', showPrefix: true, size: 'md' },
} satisfies Meta<typeof CashbackBadge>;
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
      {(['sm', 'md', 'lg'] as const).map((s) => <Cell key={s} label={`size ${s}`}><CashbackBadge prefix="Upto" value="₹1,200 Cashback" size={s} /></Cell>)}
      <Cell label="no prefix"><CashbackBadge value="₹1,200 Cashback" /></Cell>
      <Cell label="prefix hidden (showPrefix false)"><CashbackBadge prefix="Upto" value="X% Cashback" showPrefix={false} /></Cell>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Large amounts keep Indian grouping. In a narrow column the text shrinks to 75 percent (adjustsFontSizeToFit); on web this prop may not shrink, so check the 200 px example on a device.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 200 }}>
      <Cell label="large amount"><CashbackBadge prefix="Upto" value="₹1,00,000 Cashback" /></Cell>
      <Cell label="long text in 200 px"><CashbackBadge prefix="Flat" value="₹1,200 Rewards on Amazon and Flipkart" /></Cell>
    </View>
  ),
};
