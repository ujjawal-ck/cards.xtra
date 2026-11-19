import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreSimilarStore } from '../../../src/organisms/StoreSimilarStore';
import { images } from '../../../src/assets/images';
import { Labeled, Stack } from './_chrome';

const s = images.stores;
const THREE = [
  { logo: s.amazon2, badge: 'Live Now', cta: 'Upto X% Cashback' },
  { logo: s.myntra31, badge: 'Upto X% Off', cta: 'Flat X% Rewards' },
  { logo: s.fkFashion1, badge: 'Live Now', cta: 'Upto X% Rewards' },
];

const meta = {
  title: 'Components/Page sections/StoreSimilarStore',
  component: StoreSimilarStore,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreSimilarStore.tsx', docs: { description: { component: 'The Similar Store block on a store page: a row of three store cards, or two rows for six stores.' } } },
  argTypes: {
    property1: { control: 'radio', options: ['Stores', '6 stores'] },
    stores: { control: 'object', description: 'Store cards: logo, badge, cta. Defaults to 3 or 6 sample stores.' },
    onStorePress: { control: false }, style: { control: false },
  },
  args: { property1: 'Stores' },
} satisfies Meta<typeof StoreSimilarStore>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label='property1 = "Stores" (one row of 3)'><StoreSimilarStore property1="Stores" stores={THREE} /></Labeled>
      <Labeled label='property1 = "6 stores" (two rows)'><StoreSimilarStore property1="6 stores" /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The component shows at most 3 stores in "Stores" and 6 in "6 stores". Extra items are dropped. With fewer than 3 the row is short. There is no empty state: with an empty stores array the title shows over a blank grid. Open question for product: should the block hide itself.' } } },
  render: () => (
    <Stack>
      <Labeled label="One store"><StoreSimilarStore stores={THREE.slice(0, 1)} /></Labeled>
      <Labeled label="Two stores"><StoreSimilarStore stores={THREE.slice(0, 2)} /></Labeled>
      <Labeled label="Long badge and CTA text"><StoreSimilarStore stores={[{ logo: s.tataNeu12, badge: 'Extra rewards this weekend only', cta: 'Upto X% Cashback on all orders' }, THREE[1], THREE[2]]} /></Labeled>
    </Stack>
  ),
};
