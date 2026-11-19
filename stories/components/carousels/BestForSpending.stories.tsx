import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BestForSpending } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator } from './_chrome';

const FILTER_KEYS = ['bills', 'dining', 'foodOrdering', 'fuel', 'grocery', 'shopping', 'travel'] as const;

const meta = {
  title: 'Components/Carousels/BestForSpending',
  component: BestForSpending,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A white card with a subtitle and a sideways strip of spend categories; a scroll Indicator under the strip shows the position.' } },
  },
  argTypes: {
    subtitle: { control: 'text' },
    categories: { control: 'object', description: `Items: label and filterKey, one of ${FILTER_KEYS.join(', ')}.` },
    style: { control: false },
  },
  args: { subtitle: 'Best for spending on' },
} satisfies Meta<typeof BestForSpending>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Block label="Default: all 7 categories"><BestForSpending /></Block>
      <Block label="Custom subtitle and 3 categories">
        <BestForSpending subtitle="This card is best for" categories={[{ label: 'Fuel', filterKey: 'fuel' }, { label: 'Dining', filterKey: 'dining' }, { label: 'Travel', filterKey: 'travel' }]} />
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Block label="1 item"><BestForSpending categories={[{ label: 'Grocery', filterKey: 'grocery' }]} /></Block>
      <Block label="Long label">
        <BestForSpending categories={[{ label: 'Online Food Ordering and Delivery', filterKey: 'foodOrdering' }, { label: 'Utility Bills and Recharges', filterKey: 'bills' }]} />
      </Block>
    </Stack>
  ),
};
