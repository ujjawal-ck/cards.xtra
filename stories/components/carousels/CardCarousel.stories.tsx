import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardCarousel } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator, inr } from './_chrome';
import { cardCarouselItems } from './_fixtures';

const meta = {
  title: 'Components/Carousels/CardCarousel',
  component: CardCarousel,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A row of 340 wide scrollable card tiles with an optional title and View all link; it can drift sideways by itself.' } },
  },
  argTypes: {
    cards: { control: 'object' },
    title: { control: 'text' },
    onViewAll: { control: false, description: 'When set, a View all link shows in the header.' },
    onCardPress: { control: false },
    autoScroll: { control: 'boolean' },
    autoScrollSpeedPxPerSec: { control: 'number' },
    autoScrollResumeDelayMs: { control: 'number' },
    style: { control: false },
  },
  args: { cards: cardCarouselItems, title: 'Top cards for you', autoScroll: false, autoScrollSpeedPxPerSec: 20, autoScrollResumeDelayMs: 1500, onViewAll: () => {}, onCardPress: () => {} },
} satisfies Meta<typeof CardCarousel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Block label="Title and View all"><CardCarousel cards={cardCarouselItems} title="Top cards for you" onViewAll={() => {}} /></Block>
      <Block label="Title only"><CardCarousel cards={cardCarouselItems} title="Top cards for you" /></Block>
      <Block label="No header"><CardCarousel cards={cardCarouselItems} /></Block>
      <Block label="Auto scroll (about 20 px per second, pauses on touch)"><CardCarousel cards={cardCarouselItems} title="Drifting" autoScroll /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no loading or empty state. With no cards the header still shows over an empty row.' } } },
  render: () => (
    <Stack>
      <Block label="1 item"><CardCarousel cards={cardCarouselItems.slice(0, 1)} title="Top cards for you" /></Block>
      <Block label={`Many items (${cardCarouselItems.length})`}><CardCarousel cards={cardCarouselItems} title="Top cards for you" onViewAll={() => {}} /></Block>
      <Block label={`${inr(0)} and ${inr(1000000)} cashback, long name`}>
        <CardCarousel
          title="Edge values"
          cards={[
            { ...cardCarouselItems[0], id: 'zero', cashbackText: inr(0) },
            { ...cardCarouselItems[4], id: 'big', cardName: 'Axis Bank Magnus Burgundy Private Credit Card Limited Edition', cashbackText: inr(1000000) },
          ]}
        />
      </Block>
    </Stack>
  ),
};
