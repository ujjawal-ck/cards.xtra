import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardTile } from '../../../src/organisms/CardTile';
import { Frame, Label, SAMPLE_CARDS, inr } from './_shared';

const c0 = SAMPLE_CARDS[0];
const fee = (c: (typeof SAMPLE_CARDS)[number]) => ({ joiningFee: c.joiningFee, annualFee: c.annualFee });
const props = (c: (typeof SAMPLE_CARDS)[number]) => ({
  cardImage: c.cardImage,
  cardName: c.name,
  cashbackText: c.cashbackValue,
  rewardPrefix: c.rewardPrefix ?? ('Upto' as const),
  inviteOnly: c.inviteOnly,
  tags: c.tags,
  benefits: c.tileBenefits.slice(0, 2),
  feeType: c.feeType,
  feeProps: fee(c),
  onApply: () => {},
});

const meta = {
  title: 'Components/Cards/CardTile (organism, current)',
  component: CardTile,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/organisms/CardTile.tsx',
    docs: {
      description: {
        component:
          'CURRENT organism CardTile (Figma 3762:85548): real card art, reward badge, tags, two benefits and a fee strip. This is the Home list tile. Not the same part as the legacy molecule "CardTile (molecule, legacy)".',
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['full', 'scrollable'] },
    cardName: { control: 'text' },
    cashbackText: { control: 'text' },
    rewardPrefix: { control: 'select', options: ['Flat', 'Upto'] },
    inviteOnly: { control: 'boolean' },
    tags: { control: 'object' },
    benefits: { control: 'object' },
    feeType: { control: 'select', options: ['lifetime-free', 'discontinued', 'with-fees'] },
    feeProps: { control: 'object' },
    cardImage: { control: false },
    onApply: { control: false },
    style: { control: false },
  },
  args: { type: 'full', ...props(c0) },
} satisfies Meta<typeof CardTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>type="full", feeType="with-fees", inviteOnly</Label>
      <CardTile {...props(SAMPLE_CARDS[0])} />
      <Label>type="full", feeType="lifetime-free"</Label>
      <CardTile {...props(SAMPLE_CARDS[1])} />
      <Label>type="full", feeType="discontinued", inviteOnly</Label>
      <CardTile {...props(SAMPLE_CARDS[4])} />
      <Label>type="scrollable": no invite pill, no fee strip, 1 line per benefit</Label>
      <CardTile {...props(SAMPLE_CARDS[2])} type="scrollable" />
      <Label>rewardPrefix="Flat"</Label>
      <CardTile {...props(SAMPLE_CARDS[2])} rewardPrefix="Flat" />
    </>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The invite pill uses a gradient stop that is a raw hex in the source (#edd68c), not a token. Benefits are cut to 2 lines (full) or 1 line (scrollable). Open question for product: how a card with a ₹0 reward should show.' } } },
  render: () => (
    <>
      <Label>no tags, no benefits</Label>
      <CardTile {...props(SAMPLE_CARDS[3])} tags={[]} benefits={[]} />
      <Label>1 benefit</Label>
      <CardTile {...props(SAMPLE_CARDS[3])} benefits={SAMPLE_CARDS[3].tileBenefits.slice(0, 1)} />
      <Label>long name, long benefit, many tags</Label>
      <CardTile
        {...props(SAMPLE_CARDS[0])}
        cardName="HDFC Bank Regalia Gold Credit Card Limited Edition for Premium Travellers"
        tags={['Travel', 'Airport Lounge', 'Fuel', 'Dining', 'Shopping', 'Movies', 'Insurance']}
        benefits={[
          { icon: 'feat-lounge-outline', title: '12 complimentary domestic lounge visits a year', description: 'when you spend ₹1,00,000 in the previous quarter on the card, subject to the terms of the bank' },
          { icon: 'feat-dining-outline', title: 'Up to 7% discount at partner restaurants' },
        ]}
      />
      <Label>reward ₹0</Label>
      <CardTile {...props(SAMPLE_CARDS[1])} cashbackText="₹0" />
      <Label>reward ₹10,00,000, fees ₹10,00,000</Label>
      <CardTile {...props(SAMPLE_CARDS[2])} cashbackText={inr(1000000)} feeProps={{ joiningFee: inr(1000000), annualFee: inr(1000000) }} />
      <Label>list of many tiles</Label>
      {SAMPLE_CARDS.map((c) => <CardTile key={c.id} {...props(c)} />)}
    </>
  ),
};
