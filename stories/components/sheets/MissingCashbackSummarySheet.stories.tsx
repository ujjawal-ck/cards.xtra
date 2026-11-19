import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MissingCashbackSummarySheet, type MissingCashbackSummarySheetProps } from '../../../src/organisms/MissingCashbackSummarySheet';
import { Open } from './_present';

const claim = { ticketId: 'TKT0001', retailer: 'Amazon', date: '04 Nov 2026', orderAmount: '₹2,499', orderReference: 'CKORDER0001', statusUpdateDate: '04 Nov 2026', statusLabel: 'Received', statusTone: 'pending' } as const;

const meta: Meta<MissingCashbackSummarySheetProps> = {
  title: 'Components/Sheets/MissingCashbackSummarySheet',
  component: MissingCashbackSummarySheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/MissingCashbackSummarySheet.tsx:56',
    docs: { description: { component: 'Summary of one missing-cashback claim (store, dates, amount, reference, status). Opens from a claim card on the Others tab.' } },
  },
  args: { card: claim },
  render: (args) => <Open>{(ref) => <MissingCashbackSummarySheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<MissingCashbackSummarySheetProps>;

export const Received: Story = {};
export const Confirmed: Story = { args: { card: { ...claim, retailer: 'Flipkart', orderAmount: '₹8,999', statusLabel: 'Resolved', statusTone: 'confirmed' } } };
export const Rejected: Story = { args: { card: { ...claim, retailer: 'Myntra', orderAmount: '₹1,299', statusLabel: 'Rejected', statusTone: 'cancelled' } } };
