import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OrderRow } from '../../../src/organisms/OrderRow';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const TYPES = ['cashback', 'rewards', 'referral', 'bonus'] as const;
const STATUSES = ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid', 'expired'] as const;
const TONES = ['success', 'error', 'brand', 'gray', 'warning', 'info', 'purple', 'sky', 'rose'] as const;

const meta = {
  title: 'Components/Lists/OrderRow',
  component: OrderRow,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/OrderRow.tsx',
    docs: { description: { component: 'A flat order list row: store logo, a status badge or tag, the cashback amount, a meta line and an optional expandable note.' } },
  },
  decorators: [(Story) => <View style={{ width: 380 }}><Story /></View>],
  argTypes: {
    type: { control: 'select', options: TYPES },
    badgeVariant: { control: 'inline-radio', options: ['status', 'tag'] },
    status: { control: 'select', options: STATUSES },
    tagLabel: { control: 'text' },
    tagTone: { control: 'select', options: TONES },
    amount: { control: 'text' },
    showAmountChevron: { control: 'boolean' },
    metaLabel: { control: 'text' },
    metaValue: { control: 'text' },
    note: { control: 'object' },
    logoSrc: { control: false },
    onPress: { control: false },
    style: { control: false },
  },
  args: {
    type: 'cashback',
    badgeVariant: 'status',
    status: 'pending',
    tagLabel: 'Bonus',
    tagTone: 'success',
    amount: '₹1,250',
    showAmountChevron: true,
    metaLabel: 'Order date:',
    metaValue: '19 Sep 2026',
    logoSrc: images.brands.amazon,
    onPress: noop,
  },
} satisfies Meta<typeof OrderRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

const base = { badgeVariant: 'status' as const, status: 'confirmed' as const, amount: '₹1,250', showAmountChevron: true, metaLabel: 'Order date:', metaValue: '19 Sep 2026', logoSrc: images.brands.flipkart, onPress: noop };

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The four types (cashback, rewards, referral, bonus) and the two badge variants (status pill, tag). Referral has no chevron in Figma, so showAmountChevron is false there.' } } },
  render: () => (
    <View style={{ width: 380, gap: spacing[8] }}>
      <Block title="cashback, status"><OrderRow {...base} type="cashback" /></Block>
      <Block title="rewards, status"><OrderRow {...base} type="rewards" logoSrc={images.brands.timesprime} status="paid" /></Block>
      <Block title="referral, no chevron"><OrderRow {...base} type="referral" showAmountChevron={false} amount="₹100" metaLabel="Friend joined:" metaValue="2 Oct 2026" logoSrc={images.brands.myntra} /></Block>
      <Block title="bonus, tag"><OrderRow {...base} type="bonus" badgeVariant="tag" tagLabel="Welcome bonus" tagTone="success" amount="₹50" logoSrc={images.brands.nykaa} /></Block>
      {TONES.slice(1, 4).map((t) => (
        <Block key={t} title={`tag tone ${t}`}><OrderRow {...base} type="bonus" badgeVariant="tag" tagLabel="Limited offer" tagTone={t} /></Block>
      ))}
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Every status value, an expandable note (More and Less), and amounts at both ends (₹0, ₹10,00,000). The row has no loading or error mode: a list loads with Skeleton rows built by the screen.' } } },
  render: () => (
    <View style={{ width: 380, gap: spacing[8] }}>
      {STATUSES.map((s) => (
        <Block key={s} title={`status ${s}`}><OrderRow {...base} type="cashback" status={s} /></Block>
      ))}
      <Block title="₹0"><OrderRow {...base} type="cashback" status="requested" amount={`₹${(0).toLocaleString('en-IN')}`} /></Block>
      <Block title="₹10,00,000"><OrderRow {...base} type="cashback" status="paid" amount={`₹${(1000000).toLocaleString('en-IN')}`} /></Block>
      <Block title="expandable note"><OrderRow {...base} type="cashback" status="delayed" note={{ text: 'The store has not confirmed this order yet. Cashback is added after the return window ends and the store sends the final report to CashKaro.', expandable: true }} /></Block>
      <Block title="short note"><OrderRow {...base} type="cashback" status="cancelled" note={{ text: 'Order cancelled by the store.', expandable: false }} /></Block>
      <Block title="long meta value"><OrderRow {...base} type="cashback" metaLabel="Order id:" metaValue="CKORDER0001-A-very-long-store-reference-that-does-not-fit-on-one-line" /></Block>
    </View>
  ),
};
