import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreCashbackDetails } from '../../../src/organisms/StoreCashbackDetails';
import { Labeled, Stack } from './_chrome';

const meta = {
  title: 'Components/Page sections/StoreCashbackDetails',
  component: StoreCashbackDetails,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreCashbackDetails.tsx', docs: { description: { component: 'The cashback summary on a store page: headline rate, subtitle, "View Cashback Rates" link, and an optional Bonus Offer card with a countdown.' } } },
  argTypes: {
    bonusOffer: { control: 'boolean', description: 'On adds the Bonus Offer card.' },
    flatText: { control: 'text' },
    strikeText: { control: 'text', description: 'Old rate, struck through. Leave empty when the store is not boosted.' },
    percentText: { control: 'text' },
    cashbackText: { control: 'text' },
    subtitle: { control: 'text' },
    bonusTitle: { control: 'text' },
    bonusValue: { control: 'text' },
    bonusSubtitle: { control: 'text' },
    timerValue: { control: 'text', description: '"dd:hh:mm" or "hh:mm"' },
    onViewRates: { control: false },
    style: { control: false },
  },
  args: { bonusOffer: false },
} satisfies Meta<typeof StoreCashbackDetails>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label="bonusOffer = false (Off)"><StoreCashbackDetails /></Labeled>
      <Labeled label="bonusOffer = true (On)"><StoreCashbackDetails bonusOffer /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Labeled label="Boosted rate (old rate struck through). Rates are placeholders."><StoreCashbackDetails strikeText="X%" percentText="X%" /></Labeled>
      <Labeled label="Upto rate"><StoreCashbackDetails flatText="Upto" percentText="X%" subtitle="on all Amazon orders" /></Labeled>
      <Labeled label="Long subtitle"><StoreCashbackDetails subtitle="on all Mcaffeine orders placed on the website or the app, excluding gift cards and bundles" /></Labeled>
      <Labeled label="Bonus with rupee value (₹10,00,000 order floor)"><StoreCashbackDetails bonusOffer bonusValue="Flat ₹1,000 Cashback" bonusSubtitle="on order over ₹10,00,000 once per user" timerValue="02:04:15" /></Labeled>
    </Stack>
  ),
};
