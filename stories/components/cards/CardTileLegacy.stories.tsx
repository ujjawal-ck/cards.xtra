import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardTile } from '../../../src/molecules/CardTile';
import { Frame, Label, SAMPLE_CARDS, cardControl } from './_shared';

const meta = {
  title: 'Components/Cards/CardTile (molecule, legacy)',
  component: CardTile,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/CardTile.tsx',
    docs: {
      description: {
        component:
          'LEGACY molecule CardTile: a coloured placeholder box instead of card art, emoji benefits, plain fee strip. It is not the Home tile (that is the organism CardTile, see "CardTile (organism, current)"). This file is also where the CardModel type lives.',
      },
    },
  },
  argTypes: {
    card: cardControl,
    onPress: { control: false },
    style: { control: false },
  },
  args: { card: SAMPLE_CARDS[0], onPress: () => {} },
} satisfies Meta<typeof CardTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'One tile per placeholder colour key: dark, saffron, cobalt, ruby, violet. The colour key maps to a semantic token, never to raw hex.' } } },
  render: () => (
    <>
      {SAMPLE_CARDS.map((c) => (
        <React.Fragment key={c.id}>
          <Label>{`placeholderColor="${c.placeholderColor}"${c.inviteOnly ? ' · inviteOnly' : ''}`}</Label>
          <CardTile card={c} onPress={() => {}} />
        </React.Fragment>
      ))}
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Open question for product: no screen uses this tile today, so the tag is "live" only because the code ships. Check with the owner before relying on it. Always shows a VISA mark in the placeholder, whatever the card network is.',
      },
    },
  },
  render: () => {
    const base = SAMPLE_CARDS[2];
    return (
      <>
        <Label>no tags and no benefits</Label>
        <CardTile card={{ ...base, tags: [], benefits: [] }} onPress={() => {}} />
        <Label>1 benefit, fees ₹0</Label>
        <CardTile card={{ ...base, benefits: base.benefits.slice(0, 1), joiningFee: '₹0', annualFee: '₹0' }} onPress={() => {}} />
        <Label>long name, fee ₹10,00,000</Label>
        <CardTile
          card={{ ...base, name: 'Axis Bank Magnus for Burgundy Private The One Credit Card with Metal Edition', joiningFee: `₹${(1000000).toLocaleString('en-IN')}`, annualFee: `₹${(1000000).toLocaleString('en-IN')}` }}
          onPress={() => {}}
        />
      </>
    );
  },
};
