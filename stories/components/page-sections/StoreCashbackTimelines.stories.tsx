import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreCashbackTimelines } from '../../../src/organisms/StoreCashbackTimelines';
import { Labeled, Stack } from './_chrome';

const TILES = [
  { label: 'Cashback tracks in', metric: '30', unit: 'Minutes' },
  { label: 'Cashback Confirms in', metric: '65', unit: 'Days' },
  { label: 'Cashback on Mcaffeine app orders', metric: 'NO', unit: 'Minutes', unitHidden: true },
];

const meta = {
  title: 'Components/Page sections/StoreCashbackTimelines',
  component: StoreCashbackTimelines,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreCashbackTimelines.tsx', docs: { description: { component: 'The Important Details block on a store page: a grid of cashback timeline tiles (tracks in, confirms in, app orders).' } } },
  argTypes: {
    appOrderTile: { control: 'boolean', description: 'On shows the third tile on a new row. Off shows two tiles.' },
    tiles: { control: 'object' },
    onTilePress: { control: false }, style: { control: false },
  },
  args: { appOrderTile: true, tiles: TILES },
} satisfies Meta<typeof StoreCashbackTimelines>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label="appOrderTile = true (3 tiles)"><StoreCashbackTimelines tiles={TILES} /></Labeled>
      <Labeled label="appOrderTile = false (2 tiles)"><StoreCashbackTimelines tiles={TILES} appOrderTile={false} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The component does not handle an empty tiles list. Open question for product: what a store with no timeline data should show.' } } },
  render: () => (
    <Stack>
      <Labeled label="One tile"><StoreCashbackTimelines tiles={TILES.slice(0, 1)} /></Labeled>
      <Labeled label="Many tiles (5)"><StoreCashbackTimelines tiles={[...TILES, { label: 'Payment in', metric: '90', unit: 'Days' }, { label: 'Minimum payout', metric: '₹250' }]} /></Labeled>
      <Labeled label="Long label and large metric"><StoreCashbackTimelines tiles={[{ label: 'Cashback on orders paid with gift cards and store credit', metric: '₹10,00,000', unit: 'Max' }, TILES[1]]} appOrderTile={false} /></Labeled>
    </Stack>
  ),
};
