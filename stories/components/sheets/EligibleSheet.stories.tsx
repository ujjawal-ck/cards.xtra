import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EligibleSheet, type EligibleSheetProps } from '../../../src/organisms/EligibleSheet';
import { CARDS } from './_data';
import { Open } from './_present';
import { ResultHost } from './_ResultHost';

const meta: Meta<EligibleSheetProps> = {
  title: 'Components/Sheets/EligibleSheet',
  component: EligibleSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/EligibleSheet.tsx:134',
    docs: { description: { component: 'The green verdict. A plain view, not a modal: HomeScreen hosts it in a 90% sheet (shown here the same way). Confetti is mocked in Storybook.' } },
  },
  argTypes: { rewardHeadline: { control: 'text' }, rewardSubtext: { control: 'text' }, ctaLabel: { control: 'text' }, message: { control: 'text' }, pincode: { control: 'text' }, amount: { control: 'text' }, occupation: { control: 'text' }, showConfetti: { control: 'boolean' }, hideReward: { control: 'boolean' }, onApply: { action: 'apply' }, onEditPress: { action: 'edit' } },
  args: { pincode: '110001', amount: '₹75,000', occupation: 'Salaried' },
  render: (args) => <Open>{(ref) => <ResultHost ref={ref}><EligibleSheet {...args} /></ResultHost>}</Open>,
};
export default meta;
type Story = StoryObj<EligibleSheetProps>;

export const SingleCard: Story = { args: { cardImage: CARDS[1].cardImage, rewardHeadline: '₹1,200 Rewards', rewardSubtext: 'On card activation' }, parameters: { docs: { description: { story: 'Card detail Apply path: one hero card, its reward and Apply Now.' } } } };
export const CardSet: Story = { args: { cardImages: CARDS.slice(0, 3).map((c) => c.cardImage), hideReward: true, message: "Congrats!\nYou're eligible for 3 cards", ctaLabel: 'Great, Show Cards' }, parameters: { docs: { description: { story: 'Home eligibility toggle path: fanned stack of cards and a count.' } } } };
