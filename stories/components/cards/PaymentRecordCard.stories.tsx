import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PaymentRecordCard } from '../../../src/molecules/PaymentRecordCard';
import { Frame, Label, inr } from './_shared';

const rows = [
  { label: 'Amount', value: '₹1,500' },
  { label: 'Paid to', value: 'UPI, user@example.com' },
  { label: 'Date', value: '02 Mar 2026' },
  { label: 'Reference', value: 'CKORDER0001' },
];

const meta = {
  title: 'Components/Cards/PaymentRecordCard',
  component: PaymentRecordCard,
  tags: ['autodocs', 'hidden'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/PaymentRecordCard.tsx',
    docs: {
      description: {
        component:
          'HIDDEN (decision D4: Payment History is hidden until it shows real data). A bordered card of label and value rows with dividers, and an optional final "Info / View" link row.',
      },
    },
  },
  argTypes: {
    rows: { control: 'object' },
    infoLabel: { control: 'text' },
    onView: { control: false },
    style: { control: false },
  },
  args: { rows, infoLabel: 'Info', onView: () => {} },
} satisfies Meta<typeof PaymentRecordCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>rows only</Label>
      <PaymentRecordCard rows={rows} />
      <Label>with the View row</Label>
      <PaymentRecordCard rows={rows} onView={() => {}} />
      <Label>custom infoLabel</Label>
      <PaymentRecordCard rows={rows.slice(0, 2)} onView={() => {}} infoLabel="Payment details" />
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question for product (D4): the Figma "List" card has no View row, so the View row is an addition. The header comment suggests promoting this to a generic List part.' } } },
  render: () => (
    <>
      <Label>1 row</Label>
      <PaymentRecordCard rows={rows.slice(0, 1)} />
      <Label>amount ₹0 and ₹10,00,000</Label>
      <PaymentRecordCard rows={[{ label: 'Amount', value: '₹0' }, { label: 'Limit', value: inr(1000000) }]} />
      <Label>long value</Label>
      <PaymentRecordCard rows={[{ label: 'Paid to', value: 'HDFC Bank savings account ending 0000, Mumbai Fort branch, via IMPS' }]} />
      <Label>no rows</Label>
      <PaymentRecordCard rows={[]} />
      <Label>many rows</Label>
      <PaymentRecordCard rows={[...rows, ...rows]} onView={() => {}} />
    </>
  ),
};
