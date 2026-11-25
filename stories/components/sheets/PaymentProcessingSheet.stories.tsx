import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PaymentProcessingSheet, type PaymentProcessingSheetProps } from '../../../src/organisms/PaymentProcessingSheet';
import { Open } from './_present';

const meta: Meta<PaymentProcessingSheetProps> = {
  title: 'Components/Sheets/PaymentProcessingSheet',
  component: PaymentProcessingSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/PaymentProcessingSheet.tsx:67',
    docs: { description: { component: 'Shown on Withdraw while an earlier payout is still settling: a new request waits. ETA pill "5 Min to 72 Hrs" and a Browse More Deals button.' } },
  },
  argTypes: { amount: { control: 'text' }, onBrowseDeals: { action: 'browse deals' } },
  args: { amount: '₹1,500' },
  render: (args) => <Open>{(ref) => <PaymentProcessingSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<PaymentProcessingSheetProps>;

export const Default: Story = {};
export const LargeAmount: Story = { args: { amount: '₹12,50,000' } };
