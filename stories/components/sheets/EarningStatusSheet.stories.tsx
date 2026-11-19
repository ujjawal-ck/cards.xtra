import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EarningStatusSheet, type EarningStatusSheetProps } from '../../../src/organisms/EarningStatusSheet';
import { Open } from './_present';

const meta: Meta<EarningStatusSheetProps> = {
  title: 'Components/Sheets/EarningStatusSheet',
  component: EarningStatusSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EarningStatusSheet.tsx:101',
    docs: { description: { component: 'Explains one status: a big amount, a status badge and one line. "Know why?" on the Pending row opens the pending one; View on the Paid row opens the paid one.' } },
  },
  argTypes: { amount: { control: 'text' }, variant: { control: 'radio', options: ['pending', 'paid'] }, earningType: { control: 'radio', options: ['cashback', 'rewards', 'combined'] } },
  args: { amount: '₹1,500', variant: 'pending', earningType: 'cashback' },
  render: (args) => <Open>{(ref) => <EarningStatusSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<EarningStatusSheetProps>;

export const PendingCashback: Story = {};
export const PaidCashback: Story = { args: { variant: 'paid', amount: '₹3,200' } };
export const PendingRewards: Story = { args: { earningType: 'rewards', amount: '₹400' } };
export const PaidRewards: Story = { args: { earningType: 'rewards', variant: 'paid', amount: '₹1,200' } };
export const PendingCombined: Story = { args: { earningType: 'combined', amount: '₹1,900' } };
export const PaidCombined: Story = { args: { earningType: 'combined', variant: 'paid', amount: '₹4,400' } };
