import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Image } from 'react-native';
import { BigAmountCard } from '../../../src/molecules/BigAmountCard';
import { images } from '../../../src/assets/images';
import { colors, spacing, radius } from '../../../src/tokens';
import { Frame, Label, inr } from './_shared';

/** Stand in for the logo or illustration that overlaps the top edge. 112 by 68 is the Figma box. */
const Media = () => (
  <View style={{ width: 112, height: 68, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface.default }}>
    <Image source={images.stores.amazon2} style={{ width: 112, height: 68 }} resizeMode="cover" />
  </View>
);

const meta = {
  title: 'Components/Cards/BigAmountCard',
  component: BigAmountCard,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><View style={{ paddingTop: spacing[40] }}><Story /></View></Frame>],
  parameters: {
    source: 'src/molecules/BigAmountCard.tsx',
    docs: {
      description: {
        component:
          'UNUSED today: no screen renders it. A large rupee amount with a label, an optional status tag, and a footer note with "Read more". The picture that overlaps the top edge in Figma is a slot (`media`).',
      },
    },
  },
  argTypes: {
    amount: { control: 'number' },
    label: { control: 'text' },
    status: { control: 'object' },
    note: { control: 'text' },
    media: { control: false },
    onReadMore: { control: false },
  },
  args: {
    amount: 12480,
    label: 'All-time Rewards earned',
    status: { label: 'Confirmed', tone: 'success' },
    note: 'Rewards are paid after the bank confirms your card.',
    onReadMore: () => {},
  },
} satisfies Meta<typeof BigAmountCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>with status, note and Read more</Label>
      <BigAmountCard amount={12480} label="All-time Rewards earned" status={{ label: 'Confirmed', tone: 'success' }} note="Rewards are paid after the bank confirms your card." onReadMore={() => {}} />
      <Label>amount and label only</Label>
      <BigAmountCard amount={775.6} label="Available to withdraw" />
      <Label>with a media slot (logo tile)</Label>
      <View style={{ paddingTop: spacing[16] }}>
        <BigAmountCard amount={12480} label="All-time Rewards earned" media={<Media />} note="Rewards are paid after the bank confirms your card." onReadMore={() => {}} />
      </View>
      <Label>status tones</Label>
      {(['success', 'warning', 'error', 'info', 'neutral'] as const).map((t) => (
        <BigAmountCard key={t} amount={1500} label="Pending rewards" status={{ label: t, tone: t }} />
      ))}
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The amount uses formatINR: Indian grouping and exact paise. A note without `onReadMore` shows no link. Open question for product: the part is unused, so should it stay in the design system?' } } },
  render: () => (
    <>
      <Label>₹0</Label>
      <BigAmountCard amount={0} label="All-time Rewards earned" />
      <Label>{`${inr(1000000)}`}</Label>
      <BigAmountCard amount={1000000} label="All-time Rewards earned" status={{ label: 'Paid', tone: 'success' }} />
      <Label>note without Read more, long note</Label>
      <BigAmountCard amount={12480} label="All-time Rewards earned" note="Rewards on a card are paid after the bank approves the application and the first transaction is made on the card, within 90 days." />
    </>
  ),
};
