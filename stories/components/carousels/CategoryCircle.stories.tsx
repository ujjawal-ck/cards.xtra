import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CategoryCircle } from '../../../src/molecules/CategoryCircle';
import { Block, Stack } from './_chrome';
import { spacing } from '../../../src/tokens';

const COLORS = ['saffron', 'cobalt', 'fern', 'violet', 'sky', 'rose'] as const;

const meta = {
  title: 'Components/Carousels/CategoryCircle',
  component: CategoryCircle,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/molecules/CategoryCircle.tsx',
    docs: { description: { component: 'A round tinted disc with an emoji over a two-line label. Not used by any screen today: CategoryTiles replaced it on Home, and Offers has its own strip.' } },
  },
  argTypes: {
    label: { control: 'text' },
    icon: { control: 'text', description: 'An emoji.' },
    placeholderColor: { control: 'select', options: COLORS },
    size: { control: { type: 'number', min: 40, max: 96 }, description: 'Disc diameter. Default 64.' },
    onPress: { control: false },
    style: { control: false },
  },
  args: { label: 'Fuel', icon: '⛽', placeholderColor: 'saffron', size: 64, onPress: () => {} },
} satisfies Meta<typeof CategoryCircle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={520}>
      <Block label="placeholderColor: saffron, cobalt, fern, violet, sky, rose">
        <View style={{ flexDirection: 'row', gap: spacing[12], paddingHorizontal: spacing[16] }}>
          {COLORS.map((c, i) => <CategoryCircle key={c} label={['Fuel', 'Travel', 'Grocery', 'Dining', 'Shopping', 'Bills'][i]} icon={['⛽', '✈️', '\u{1F6D2}', '\u{1F37D}️', '\u{1F6CD}️', '\u{1F4A1}'][i]} placeholderColor={c} />)}
        </View>
      </Block>
      <Block label="size 48, 64 (default), 80">
        <View style={{ flexDirection: 'row', gap: spacing[12], paddingHorizontal: spacing[16] }}>
          <CategoryCircle label="Fuel" icon={'⛽'} size={48} />
          <CategoryCircle label="Fuel" icon={'⛽'} />
          <CategoryCircle label="Fuel" icon={'⛽'} size={80} />
        </View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack width={520}>
      <Block label="Long label (two lines, then clipped)">
        <View style={{ paddingHorizontal: spacing[16] }}><CategoryCircle label="Online Food Ordering and Delivery" icon={'\u{1F354}'} placeholderColor="rose" /></View>
      </Block>
      <Block label="No onPress (still announces as a button)">
        <View style={{ paddingHorizontal: spacing[16] }}><CategoryCircle label="Bills" icon={'\u{1F4A1}'} placeholderColor="sky" /></View>
      </Block>
    </Stack>
  ),
};
