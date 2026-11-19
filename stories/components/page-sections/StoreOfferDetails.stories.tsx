import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreOfferDetails } from '../../../src/organisms/StoreOfferDetails';
import { Labeled, Stack } from './_chrome';

const OFFER = 'Extra X% off on your first order above ₹999 on the Mcaffeine app.';

const meta = {
  title: 'Components/Page sections/StoreOfferDetails',
  component: StoreOfferDetails,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreOfferDetails.tsx', docs: { description: { component: 'The offer summary on a store page: offer line, optional promo code chip with Copy Code, a see-details link, and an optional How to get this offer card.' } } },
  argTypes: {
    howToGetThisOffer: { control: 'boolean', description: 'On appends the How to get this offer card.' },
    copyCode: { control: 'boolean', description: 'Shows the code chip and Copy Code row.' },
    title: { control: 'text' },
    offerText: { control: 'text' },
    code: { control: 'text' },
    seeDetailsLabel: { control: 'text' },
    onCopyCode: { control: false }, onSeeDetails: { control: false }, onHowToGet: { control: false }, style: { control: false },
  },
  args: { title: 'Top Mcaffeine Offers', offerText: OFFER, code: 'SAVEMORE', howToGetThisOffer: true, copyCode: true },
} satisfies Meta<typeof StoreOfferDetails>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label="howToGetThisOffer + copyCode"><StoreOfferDetails title="Top Mcaffeine Offers" offerText={OFFER} code="SAVEMORE" /></Labeled>
      <Labeled label="copyCode only"><StoreOfferDetails title="Top Mcaffeine Offers" offerText={OFFER} code="SAVEMORE" howToGetThisOffer={false} /></Labeled>
      <Labeled label="howToGetThisOffer only (no code)"><StoreOfferDetails title="Top Amazon Offers" offerText="Bank offers on select cards. See details for the list." copyCode={false} /></Labeled>
      <Labeled label="Neither"><StoreOfferDetails title="Top Amazon Offers" offerText="Bank offers on select cards." copyCode={false} howToGetThisOffer={false} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'With no offerText and no code the block shows only the title and links. The component has no empty state of its own; the screen decides whether to mount it.' } } },
  render: () => (
    <Stack>
      <Labeled label="Many offers (custom see-details label)"><StoreOfferDetails title="Top Myntra Offers" offerText={OFFER} copyCode={false} seeDetailsLabel="See +5 Offers" /></Labeled>
      <Labeled label="Long offer text"><StoreOfferDetails title="Top Mcaffeine Offers" offerText={`${OFFER} Valid on orders placed between the sale start and end dates. Not valid on gift cards, bundles, or orders paid with store credit. Maximum discount ₹10,00,000 per user.`} code="SAVEMORE" howToGetThisOffer={false} /></Labeled>
      <Labeled label="Long code"><StoreOfferDetails title="Top Mcaffeine Offers" offerText={OFFER} code="WELCOMEBACKSAVEMORE2026" howToGetThisOffer={false} /></Labeled>
      <Labeled label="No offer text, no code (defaults)"><StoreOfferDetails copyCode={false} howToGetThisOffer={false} /></Labeled>
    </Stack>
  ),
};
