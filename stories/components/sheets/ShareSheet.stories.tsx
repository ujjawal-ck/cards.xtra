import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ShareSheet, type ShareSheetProps } from '../../../src/organisms/ShareSheet';
import { CARDS } from './_data';
import { Open } from './_present';

const meta: Meta<ShareSheetProps> = {
  title: 'Components/Sheets/ShareSheet',
  component: ShareSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/ShareSheet.tsx:397',
    docs: { description: { component: 'Share preview of a card: a 312 by 413 image card with the cashback value, and a Share button that opens the system share. An RN Modal with its own animation. On web the system share may not exist, so the button can do nothing.' } },
  },
  argTypes: { cardName: { control: 'text' }, cardSubtitle: { control: 'text' }, cashbackValue: { control: 'text' }, onShare: { action: 'share' }, onDismiss: { action: 'dismiss' } },
  args: { cardImage: CARDS[0].cardImage, cardName: 'HDFC Bank Regalia Gold', cardSubtitle: 'Great for travel and dining', cashbackValue: '₹2,500 Cashback' },
  render: (args) => <Open>{(ref) => <ShareSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<ShareSheetProps>;

export const Default: Story = {};
export const LifetimeFreeCard: Story = { args: { cardImage: CARDS[1].cardImage, cardName: 'HDFC Swiggy', cardSubtitle: 'Lifetime free', cashbackValue: '₹1,200 Cashback' } };
