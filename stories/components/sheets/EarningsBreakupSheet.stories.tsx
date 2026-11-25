import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EarningsBreakupSheet, type EarningsBreakupSheetProps } from '../../../src/organisms/EarningsBreakupSheet';
import { Open } from './_present';

const meta: Meta<EarningsBreakupSheetProps> = {
  title: 'Components/Sheets/EarningsBreakupSheet',
  component: EarningsBreakupSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EarningsBreakupSheet.tsx:170',
    docs: { description: { component: 'Confirmed, Pending and Paid amounts with a legend, for Cashback or Rewards. Opens from the stat cards on Earnings. Content-hugging, so it does not expand.' } },
  },
  argTypes: { variant: { control: 'radio', options: ['cashback', 'rewards'] }, confirmed: { control: 'text' }, pending: { control: 'text' }, paid: { control: 'text' } },
  args: { variant: 'cashback', confirmed: '₹1,500', pending: '₹240', paid: '₹3,200' },
  render: (args) => <Open>{(ref) => <EarningsBreakupSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<EarningsBreakupSheetProps>;

export const Cashback: Story = {};
export const Rewards: Story = { args: { variant: 'rewards', confirmed: '₹800', pending: '₹0', paid: '₹1,200' } };
export const AllZero: Story = { args: { confirmed: '₹0', pending: '₹0', paid: '₹0' }, parameters: { docs: { description: { story: 'The code defaults: all three amounts are ₹0.' } } } };
