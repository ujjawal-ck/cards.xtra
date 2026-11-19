import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AmountInput, type AmountInputProps } from '../../../src/molecules/AmountInput';
import { Group, Stack } from './_kit';

function Live(props: Omit<AmountInputProps, 'value' | 'onChange'> & { value?: number | null }) {
  const [v, setV] = useState<number | null>(props.value ?? null);
  return <AmountInput {...props} value={v} onChange={setV} />;
}

const meta = {
  title: 'Components/Input fields/AmountInput',
  component: AmountInput,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/AmountInput.tsx',
    docs: { description: { component: 'A rupee field with live Indian grouping (120000 becomes 1,20,000), min and max, a period in the label and preset chips. Types an amount; SpendCard picks one by dragging. Not wired into any screen yet (DS-ADD).' } },
  },
  argTypes: {
    period: { control: 'select', options: [undefined, 'month', 'year', 'quarter'] },
    min: { control: 'number' },
    max: { control: 'number' },
    hint: { control: 'text' },
    error: { control: 'text' },
    label: { control: 'text' },
  },
  args: { label: 'Amazon spend', value: null, onChange: () => {}, period: 'month', min: 500, max: 5000000, presets: [5000, 10000, 25000, 100000], hint: 'Between ₹500 and ₹50,00,000' },
  render: ({ value, onChange, ...args }) => <Stack><Live {...args} value={value} /></Stack>,
} satisfies Meta<typeof AmountInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="no presets"><Live label="Annual income" value={1200000} /></Group>
      <Group label="presets, period month"><Live label="Flipkart spend" period="month" presets={[2000, 5000, 10000, 50000]} /></Group>
      <Group label="period year"><Live label="Travel spend" period="year" presets={[100000, 250000, 500000]} value={250000} /></Group>
      <Group label="period quarter"><Live label="Myntra spend" period="quarter" value={15000} /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Typing above `max` holds the value at max. A value below `min` lifts to min when the field loses focus.' } } },
  render: () => (
    <Stack>
      <Group label="empty (null)"><Live label="Amazon spend" period="month" hint="Enter what you spend" /></Group>
      <Group label="large amount, Indian grouping"><Live label="Annual income" value={10000000} max={100000000} /></Group>
      <Group label="error"><Live label="Amazon spend" period="month" value={100} min={500} error="Enter at least ₹500" /></Group>
      <Group label="at max"><Live label="HDFC Millennia annual spend" value={500000} max={500000} hint="Maximum ₹5,00,000" /></Group>
    </Stack>
  ),
};
