import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreTermsConditions } from '../../../src/organisms/StoreTermsConditions';
import { Labeled, Stack } from './_chrome';

const CARDS = [
  { text: 'Cashback is not given on gift cards or store credit.', icon: 'feat-celebration-outline' as const },
  { text: 'Orders must be placed in the same session as the click.', icon: 'feat-rewards-outline' as const },
  { text: 'Cancelled and returned orders do not earn cashback.', icon: 'feat-discount-outline' as const },
];
const ITEMS = [
  'Cashback is not given on gift cards or store credit.',
  'Orders must be placed in the same session as the click.',
  'Cancelled and returned orders do not earn cashback.',
];

const meta = {
  title: 'Components/Page sections/StoreTermsConditions',
  component: StoreTermsConditions,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreTermsConditions.tsx', docs: { description: { component: 'The Important Terms and Conditions block on a store page, as a card carousel or a bullet list, with a View All T&C link.' } } },
  argTypes: {
    property1: { control: 'radio', options: ['Card View', 'List View'] },
    title: { control: 'text' },
    cards: { control: 'object', description: 'Card View items: text and an icon name.' },
    items: { control: 'object', description: 'List View lines.' },
    onViewAll: { control: false }, style: { control: false },
  },
  args: { property1: 'Card View', cards: CARDS, items: ITEMS },
} satisfies Meta<typeof StoreTermsConditions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label='property1 = "Card View"'><StoreTermsConditions property1="Card View" cards={CARDS} /></Labeled>
      <Labeled label='property1 = "List View"'><StoreTermsConditions property1="List View" items={ITEMS} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'With no cards (Card View) or no items (List View) the component renders nothing, so a store without terms shows no section. The defaults are empty lists, so a bare <StoreTermsConditions /> is also blank. All Card View tiles use one substitute icon in the app today because the megaphone art from Figma is missing.' } } },
  render: () => (
    <Stack>
      <Labeled label="One card"><StoreTermsConditions cards={CARDS.slice(0, 1)} /></Labeled>
      <Labeled label="Many cards (6, scrolls sideways)"><StoreTermsConditions cards={[...CARDS, ...CARDS]} /></Labeled>
      <Labeled label="List View, long lines"><StoreTermsConditions property1="List View" items={[...ITEMS, 'Cashback on orders above ₹10,00,000 is capped and may take up to 180 days to confirm, subject to the retailer approving the order and the return window closing.']} /></Labeled>
      <Labeled label="Empty (renders nothing)"><StoreTermsConditions cards={[]} /></Labeled>
    </Stack>
  ),
};
