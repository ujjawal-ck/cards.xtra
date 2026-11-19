import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CashbackNotConfirmedSheet, type CashbackNotConfirmedSheetProps } from '../../../src/organisms/CashbackNotConfirmedSheet';
import { Open } from './_present';

const meta: Meta<CashbackNotConfirmedSheetProps> = {
  title: 'Components/Sheets/CashbackNotConfirmedSheet',
  component: CashbackNotConfirmedSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/CashbackNotConfirmedSheet.tsx:66',
    docs: { description: { component: 'Tapping Withdraw with nothing withdrawable. Explains why: only pending money, nothing yet, or a balance under the minimum (₹250 from the API). The illustration is an emoji placeholder in code.' } },
  },
  argTypes: { pendingAmount: { control: 'text' }, earningType: { control: 'radio', options: ['cashback', 'rewards'] } },
  args: { pendingAmount: '₹240', earningType: 'cashback' },
  render: (args) => <Open>{(ref) => <CashbackNotConfirmedSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<CashbackNotConfirmedSheetProps>;

export const SomePending: Story = {};
export const NothingYet: Story = { args: { pendingAmount: '₹0' } };
export const BelowMinimum: Story = { args: { belowMinimum: { balance: '₹120', minimum: '₹250' } } };
export const Rewards: Story = { args: { earningType: 'rewards', pendingAmount: '₹400' } };
