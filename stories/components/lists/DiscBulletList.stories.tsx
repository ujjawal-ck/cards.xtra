import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DiscBulletList } from '../../../src/molecules/DiscBulletList';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

const TERMS = [
  'Cashback is tracked only when you shop through the CashKaro link.',
  'Orders paid with gift cards or store credit may not earn cashback.',
  'Cashback rates are up to X% and can change without notice.',
  'Cancelled or returned orders do not earn cashback.',
];

const meta = {
  title: 'Components/Lists/DiscBulletList',
  component: DiscBulletList,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/DiscBulletList.tsx',
    docs: { description: { component: 'A plain disc-bulleted text list with a hanging indent, used for terms and conditions copy.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: { items: { control: 'object' }, style: { control: false } },
  args: { items: TERMS },
} satisfies Meta<typeof DiscBulletList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[8] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

export const Variants: Story = {
  parameters: { docs: { description: { story: 'There is one visual style. The list below shows short and wrapped items, to see the hanging indent.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[16] }}>
      <Block title="short items"><DiscBulletList items={['Valid on all orders', 'No minimum value']} /></Block>
      <Block title="wrapped items (text aligns under the text, not the disc)"><DiscBulletList items={TERMS} /></Block>
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ width: 340, gap: spacing[16] }}>
      <Block title="empty list (renders nothing)"><DiscBulletList items={[]} /></Block>
      <Block title="one item"><DiscBulletList items={[TERMS[0]]} /></Block>
      <Block title="many items"><DiscBulletList items={Array.from({ length: 12 }, (_, i) => `Term ${i + 1}: ${TERMS[i % 4]}`)} /></Block>
      <Block title="amounts"><DiscBulletList items={[`Minimum order ₹${(0).toLocaleString('en-IN')}`, `Maximum cashback ₹${(1000000).toLocaleString('en-IN')} per month`]} /></Block>
    </View>
  ),
};
