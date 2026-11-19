import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CreditCardOffer } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator, inr } from './_chrome';
import { offerCards } from './_fixtures';
import { images } from '../../../src/assets/images';

const meta = {
  title: 'Components/Carousels/CreditCardOffer',
  component: CreditCardOffer,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A sideways row of card art with the card name and a cashback badge: a content rail for card offers on Home.' } },
  },
  argTypes: {
    cards: { control: 'object', description: 'Items: id, image, name, cashback text, optional prefix ("Upto").' },
    onCardPress: { control: false, description: 'Fires with the card id.' },
    style: { control: false },
  },
  args: { cards: offerCards, onCardPress: () => {} },
} satisfies Meta<typeof CreditCardOffer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Component quirk: the prefix defaults to \'Upto\' when omitted, so only an explicit prefix (such as \'Flat\') changes the lead-in.' } } },
  render: () => (
    <Stack>
      <Block label="prefix 'Upto'" note="the badge lead-in when CashKaro has lower secondary tiers">
        <CreditCardOffer cards={offerCards.filter((c) => c.prefix)} onCardPress={() => {}} />
      </Block>
      <Block label="prefix omitted" note="the component falls back to 'Upto', so an omitted prefix is not flat">
        <CreditCardOffer cards={offerCards.filter((c) => !c.prefix)} onCardPress={() => {}} />
      </Block>
      <Block label="prefix 'Flat'">
        <CreditCardOffer cards={offerCards.filter((c) => !c.prefix).map((c) => ({ ...c, prefix: 'Flat' }))} onCardPress={() => {}} />
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no empty state. With no cards the row renders nothing, so a screen must hide the section itself.' } } },
  render: () => (
    <Stack>
      <Block label="1 item"><CreditCardOffer cards={offerCards.slice(0, 1)} /></Block>
      <Block label={`Many items (${offerCards.length}), scrolls sideways`}><CreditCardOffer cards={offerCards} /></Block>
      <Block label="Long card name and cashback text">
        <CreditCardOffer cards={[{ id: 'long', image: images.cards.tataNeuInfinitySbiCard, name: 'Tata Neu Infinity SBI Credit Card Signature Edition', cashback: `${inr(25000)} Cashback worth in vouchers`, prefix: 'Upto' }]} />
      </Block>
      <Block label={`${inr(0)} and ${inr(1000000)} cashback`}>
        <CreditCardOffer cards={[
          { id: 'zero', image: images.cards.hsbcCashback, name: 'HSBC Cashback', cashback: `${inr(0)} Cashback` },
          { id: 'big', image: images.cards.axisBurgundyPrivateTheOneCard, name: 'Axis Burgundy Private', cashback: `${inr(1000000)} Cashback`, prefix: 'Upto' },
        ]} />
      </Block>
    </Stack>
  ),
};
