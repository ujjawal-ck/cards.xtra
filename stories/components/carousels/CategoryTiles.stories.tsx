import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CategoryTiles } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator } from './_chrome';
import { categoryTiles } from './_fixtures';

const meta = {
  title: 'Components/Carousels/CategoryTiles',
  component: CategoryTiles,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A pale saffron section with a title and a row of category tiles; the selected tile gets a saffron stroke and a corner tick. Used to filter Home.' } },
  },
  argTypes: {
    title: { control: 'text' },
    categories: { control: 'object' },
    selectedId: { control: 'select', options: [null, ...categoryTiles.map((c) => c.id)] },
    onCategoryPress: { control: false },
    style: { control: false },
  },
  args: { title: 'Best cards by category', categories: categoryTiles, selectedId: null, onCategoryPress: () => {} },
} satisfies Meta<typeof CategoryTiles>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function Interactive() {
  const [sel, setSel] = useState<string | null>('fashion');
  return <CategoryTiles title="Best cards by category" categories={categoryTiles} selectedId={sel} onCategoryPress={(id) => setSel(id === sel ? null : id)} />;
}

export const Variants: Story = {
  render: () => (
    <Stack>
      <Block label="Nothing selected"><CategoryTiles title="Best cards by category" categories={categoryTiles} selectedId={null} /></Block>
      <Block label="One selected (saffron stroke and tick)"><CategoryTiles title="Best cards by category" categories={categoryTiles} selectedId="electronics" /></Block>
      <Block label="Tap to select (selecting advances the strip)"><Interactive /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no loading or empty state in the component. The section needs a skeleton or must be hidden by the screen.' } } },
  render: () => (
    <Stack>
      <Block label="1 item"><CategoryTiles title="Best cards by category" categories={categoryTiles.slice(0, 1)} /></Block>
      <Block label="Many items (7)"><CategoryTiles title="Best cards by category" categories={categoryTiles} /></Block>
      <Block label="Long title and long labels">
        <CategoryTiles
          title="Find the best credit card for every kind of spend you make in a month"
          categories={[{ ...categoryTiles[5], label: 'Health and Wellness Essentials' }, { ...categoryTiles[2], label: 'Food Grocery and Daily Needs' }]}
        />
      </Block>
    </Stack>
  ),
};
