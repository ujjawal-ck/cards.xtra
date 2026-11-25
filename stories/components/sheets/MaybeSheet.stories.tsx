import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MaybeSheet, type MaybeSheetProps } from '../../../src/organisms/MaybeSheet';
import { CAROUSEL_CARDS } from './_data';
import { Open } from './_present';
import { ResultHost } from './_ResultHost';

const meta: Meta<MaybeSheetProps> = {
  title: 'Components/Sheets/MaybeSheet',
  component: MaybeSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/MaybeSheet.tsx:52',
    docs: { description: { component: 'The amber verdict: not a sure match, you may still qualify. Shows the user details, a card carousel and Continue to Apply. A plain view hosted in a 90% sheet by HomeScreen.' } },
  },
  argTypes: { exploreLead: { control: 'text' }, exploreTail: { control: 'text' }, message: { control: 'text' }, infoText: { control: 'text' }, ctaLabel: { control: 'text' }, onContinue: { action: 'continue' }, onEditPress: { action: 'edit' } },
  args: { cards: CAROUSEL_CARDS, exploreLead: 'Explore 4 Cards', pincode: '110001', amount: '₹42,000', occupation: 'Salaried' },
  render: (args) => <Open>{(ref) => <ResultHost ref={ref}><MaybeSheet {...args} /></ResultHost>}</Open>,
};
export default meta;
type Story = StoryObj<MaybeSheetProps>;

export const Default: Story = {};
export const OneCard: Story = { args: { cards: CAROUSEL_CARDS.slice(0, 1), exploreLead: 'Explore 1 Card' } };
export const SelfEmployed: Story = { args: { occupation: 'Self employed', amount: '₹1,00,000' } };
