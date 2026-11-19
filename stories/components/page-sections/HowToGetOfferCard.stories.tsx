import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HowToGetOfferCard } from '../../../src/organisms/HowToGetOfferCard';
import { sizing, spacing } from '../../../src/tokens';
import { Labeled, Stack } from './_chrome';

/** The card is width 100%; the store blocks give it a 360 root with 16 side padding. */
const Slot = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: sizing.containerMobile, paddingHorizontal: spacing[16] }}>{children}</View>
);

const meta = {
  title: 'Components/Page sections/HowToGetOfferCard',
  component: HowToGetOfferCard,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/HowToGetOfferCard.tsx', docs: { description: { component: 'The shared How to get this offer card at the bottom of StoreOfferDetails and StoreBenefitDetails.' } } },
  argTypes: { label: { control: 'text' }, onPress: { control: false }, style: { control: false } },
  decorators: [(Story) => <Slot><Story /></Slot>],
} satisfies Meta<typeof HowToGetOfferCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  decorators: [],
  render: () => (
    <Stack>
      <Labeled label="Default label"><Slot><HowToGetOfferCard /></Slot></Labeled>
      <Labeled label="Custom label"><Slot><HowToGetOfferCard label="How to get the bonus?" /></Slot></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  decorators: [],
  parameters: { docs: { description: { story: 'The card has no disabled or loading state. It always fires onPress.' } } },
  render: () => (
    <Stack>
      <Labeled label="Long label (wraps)"><Slot><HowToGetOfferCard label="How to get this offer on orders above ₹10,00,000 placed through the Mcaffeine app?" /></Slot></Labeled>
    </Stack>
  ),
};
