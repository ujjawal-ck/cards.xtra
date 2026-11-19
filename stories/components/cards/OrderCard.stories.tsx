import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OrderCard } from '../../../src/organisms/OrderCard';
import { images } from '../../../src/assets/images';
import { Frame, Label } from './_shared';

const STATUSES = ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid', 'expired'] as const;
const TYPES = ['cashback', 'rewards', 'referral', 'bonus'] as const;
const META: Record<(typeof TYPES)[number], string> = {
  cashback: 'CKORDER0001',
  rewards: 'CKORDER0001',
  referral: 'Test User',
  bonus: 'Welcome bonus',
};

const base = {
  type: 'cashback' as const,
  status: 'pending' as const,
  amount: '₹19.90',
  metaValue: 'CKORDER0001',
  logoSrc: images.stores.myntra31,
  note: { text: 'Cashback is added after the store confirms the order, within 90 days of purchase.', expandable: true },
  onPress: () => {},
};

const meta = {
  title: 'Components/Cards/OrderCard',
  component: OrderCard,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/organisms/OrderCard.tsx',
    docs: { description: { component: 'One order in the orders list: a status strip, the store logo with the amount, a second info row, and an optional note with More and Less. Four types and seven statuses.' } },
  },
  argTypes: {
    type: { control: 'select', options: [...TYPES] },
    status: { control: 'select', options: [...STATUSES] },
    amount: { control: 'text' },
    metaValue: { control: 'text' },
    note: { control: 'object' },
    logoSrc: { control: false },
    onPress: { control: false },
    style: { control: false },
  },
  args: base,
} satisfies Meta<typeof OrderCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      {TYPES.map((t) => (
        <React.Fragment key={t}>
          <Label>{`type="${t}"`}</Label>
          <OrderCard {...base} type={t} metaValue={META[t]} note={undefined} onPress={t === 'referral' ? undefined : () => {}} />
        </React.Fragment>
      ))}
      <Label>every status</Label>
      {STATUSES.map((s) => (
        <OrderCard key={s} {...base} status={s} note={undefined} />
      ))}
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'No `onPress` hides the chevron (referrals have no detail page). A note longer than 2 lines shows a More toggle. The "Paid" Figma variant has a 3 dot ornament that the part leaves out on purpose.',
      },
    },
  },
  render: () => (
    <>
      <Label>amount ₹0</Label>
      <OrderCard {...base} amount="₹0" status="cancelled" note={undefined} />
      <Label>amount ₹10,00,000</Label>
      <OrderCard {...base} amount={`₹${(1000000).toLocaleString('en-IN')}`} status="paid" note={undefined} />
      <Label>long order id and long note (More)</Label>
      <OrderCard
        {...base}
        metaValue="CKORDER0001-CKORDER0001-CKORDER0001-CKORDER0001"
        note={{ text: 'Cashback is added after the store confirms the order. If the order is returned or cancelled by you or the store, the cashback is cancelled too. Delayed stores can take up to 90 days to confirm.', expandable: true }}
      />
      <Label>note, not expandable</Label>
      <OrderCard {...base} note={{ text: 'Added on 02 Mar 2026.', expandable: false }} />
      <Label>list of many orders</Label>
      {STATUSES.map((s, i) => <OrderCard key={s} {...base} status={s} logoSrc={[images.stores.myntra31, images.stores.amazon2, images.stores.tata][i % 3]} note={undefined} />)}
    </>
  ),
};
