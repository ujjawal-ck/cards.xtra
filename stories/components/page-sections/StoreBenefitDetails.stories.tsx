import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreBenefitDetails } from '../../../src/organisms/StoreBenefitDetails';
import { Labeled, Stack } from './_chrome';

const BENEFITS = ['X% cashback on online spends', 'X% cashback on offline spends', 'Save up to ₹60,000 annually'];

const meta = {
  title: 'Components/Page sections/StoreBenefitDetails',
  component: StoreBenefitDetails,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreBenefitDetails.tsx', docs: { description: { component: 'The cashback benefits block on a store page: a numbered benefits list, a see-details link, and an optional How to get this offer card.' } } },
  argTypes: {
    howToGetThisOffer: { control: 'boolean', description: 'On appends the How to get this offer card.' },
    title: { control: 'text' },
    benefits: { control: 'object' },
    onSeeDetails: { control: false }, onHowToGet: { control: false }, style: { control: false },
  },
  args: { howToGetThisOffer: true, title: 'SBI Card Cashback benefits', benefits: BENEFITS },
} satisfies Meta<typeof StoreBenefitDetails>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label="howToGetThisOffer = true (On)"><StoreBenefitDetails title="SBI Card Cashback benefits" benefits={BENEFITS} /></Labeled>
      <Labeled label="howToGetThisOffer = false (Off)"><StoreBenefitDetails title="SBI Card Cashback benefits" benefits={BENEFITS} howToGetThisOffer={false} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'An empty benefits list renders the title and the link only. The component does not hide itself.' } } },
  render: () => (
    <Stack>
      <Labeled label="One benefit"><StoreBenefitDetails title="Amazon Cashback benefits" benefits={['Save up to ₹10,00,000 on annual spends']} howToGetThisOffer={false} /></Labeled>
      <Labeled label="Many benefits (7)"><StoreBenefitDetails title="Amazon Cashback benefits" howToGetThisOffer={false} benefits={[...BENEFITS, 'Fuel surcharge waiver at all stations', 'Lounge access each quarter', 'Welcome gift of ₹2,500', 'Zero joining fee in the first year']} /></Labeled>
      <Labeled label="Long benefit text"><StoreBenefitDetails title="Amazon Cashback benefits" howToGetThisOffer={false} benefits={['Earn X% cashback on every online order placed through the app, up to a monthly cap of ₹1,50,000 in eligible spends, with no minimum order value']} /></Labeled>
      <Labeled label="Empty list"><StoreBenefitDetails title="Amazon Cashback benefits" benefits={[]} howToGetThisOffer={false} /></Labeled>
    </Stack>
  ),
};
