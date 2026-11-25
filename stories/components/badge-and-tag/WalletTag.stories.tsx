import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing } from '../../../src/tokens';
import { WalletTag } from '../../../src/atoms/WalletTag';

const meta = {
  title: 'Components/Badge and Tag/WalletTag',
  component: WalletTag,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/WalletTag.tsx',
    docs: { description: { component: 'Unused today. A small tag with a wallet icon and an already formatted amount ("₹1,200"). Pass the amount through formatINR.' } },
  },
  argTypes: { amount: { control: 'text' } },
  args: { amount: '₹1,200' },
} satisfies Meta<typeof WalletTag>;
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
  parameters: { docs: { description: { story: 'WalletTag has one visual style, so Variants shows the amount range.' } } },
  render: () => (
    <Wrap>
      <Cell label="small"><WalletTag amount="₹50" /></Cell>
      <Cell label="typical"><WalletTag amount="₹1,200" /></Cell>
      <Cell label="paise"><WalletTag amount="₹775.60" /></Cell>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No disabled or loading state. Not applied from Figma: inner padding of 1 (not on the spacing scale); the amount gradient is flat here.' } } },
  render: () => (
    <View style={{ gap: spacing[16], width: 200 }}>
      <Cell label="large amount (Indian grouping)"><WalletTag amount="₹1,00,000" /></Cell>
      <Cell label="very large"><WalletTag amount="₹12,34,56,789" /></Cell>
    </View>
  ),
};
