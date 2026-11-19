import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Rating } from '../../../src/atoms/Rating';
import { Group, Wrap } from './_kit';

const meta = {
  title: 'Components/Selections/Rating',
  component: Rating,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Rating.tsx',
    docs: { description: { component: 'A read-only row of stars for a 0 to 5 score. It shows a rating; it does not collect one. Product question: no tap-to-rate version exists.' } },
  },
  argTypes: {
    filled: { control: { type: 'number', min: 0, max: 10, step: 1 } },
    total: { control: { type: 'number', min: 1, max: 10, step: 1 } },
    size: { control: 'number' },
    gap: { control: 'number' },
    filledColor: { control: 'color' },
    emptyColor: { control: 'color' },
  },
  args: { filled: 4, total: 5 },
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Group label="4 of 5"><Rating filled={4} /></Group>
      <Group label="5 of 5"><Rating filled={5} /></Group>
      <Group label="size 24"><Rating filled={3} size={24} /></Group>
      <Group label="total 10"><Rating filled={7} total={10} /></Group>
    </Wrap>
  ),
};

export const States: Story = {
  render: () => (
    <Wrap>
      <Group label="zero"><Rating filled={0} /></Group>
      <Group label="over total (clamped to 5)"><Rating filled={9} /></Group>
      <Group label="negative (clamped to 0)"><Rating filled={-2} /></Group>
    </Wrap>
  ),
};
