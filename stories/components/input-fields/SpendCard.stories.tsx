import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SpendCard, type SpendCardProps } from '../../../src/molecules/SpendCard';
import { images } from '../../../src/assets/images';
import { Group, Stack } from './_kit';

function Live(props: Omit<SpendCardProps, 'value' | 'onChange'> & { value?: number }) {
  const [v, setV] = useState(props.value ?? props.min ?? 0);
  return <SpendCard {...props} value={v} onChange={setV} />;
}

const meta = {
  title: 'Components/Input fields/SpendCard',
  component: SpendCard,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/SpendCard.tsx',
    docs: { description: { component: 'A card that picks a spend by dragging a ruler or tapping - and +. Value is the tick under the centre mark. Optional typed entry. Overlaps AmountInput, which types an amount.' } },
  },
  argTypes: {
    size: { control: 'select', options: ['compact', 'large'] },
    unit: { control: 'select', options: ['rupees', 'count'] },
    typedEntry: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    labelEvery: { control: 'number' },
    typedMax: { control: 'number' },
    period: { control: 'text' },
    title: { control: 'text' },
    name: { control: 'text' },
  },
  args: { name: 'Amazon', logo: images.brands.amazon, value: 5000, onChange: () => {}, min: 0, max: 50000, step: 500, period: 'per month', size: 'compact', unit: 'rupees' },
  render: ({ value, onChange, ...args }) => <Stack><Live {...args} value={value} /></Stack>,
} satisfies Meta<typeof SpendCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Ruler drag uses a scroll view with snap. Check the drag feel on a device; the source notes it was not run on one. The large size draws the logo above the title; the Figma image holder that overlaps the card edge is not built.' } } },
  render: () => (
    <Stack>
      <Group label="compact"><Live name="Flipkart" logo={images.brands.flipkart} value={10000} /></Group>
      <Group label="large"><Live name="Myntra" logo={images.brands.myntra} size="large" value={7500} /></Group>
      <Group label="large, custom title"><Live name="Amazon" logo={images.brands.amazon} size="large" title="How much do you shop on Amazon?" value={20000} /></Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Group label="at min (0)"><Live name="Swiggy" value={0} /></Group>
      <Group label="at max"><Live name="Amazon" logo={images.brands.amazon} value={50000} /></Group>
      <Group label="large amount, Indian grouping"><Live name="Travel" min={0} max={1000000} step={10000} value={100000} /></Group>
      <Group label="unit count (no rupee sign)"><Live name="Airport lounge visits" unit="count" min={0} max={20} step={1} labelEvery={5} period="per year" value={4} /></Group>
      <Group label="typed entry on"><Live name="Flipkart" logo={images.brands.flipkart} typedEntry typedMax={500000} value={25000} /></Group>
      <Group label="long name"><Live name="Reliance Digital and Jio Mart online" value={15000} /></Group>
    </Stack>
  ),
};
