import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Choice, type ChoiceProps } from '../../../src/molecules/Choice';
import { Group, Stack } from './_kit';

function Live(props: ChoiceProps) {
  const [v, setV] = useState(props.checked);
  return <Choice {...props} checked={v} onChange={(n) => setV(n)} />;
}

/** Radio rows that behave as one group. */
function RadioList() {
  const [pick, setPick] = useState('fee');
  const opts = [
    { k: 'fee', label: 'Lowest annual fee', d: 'Cards under ₹500 a year' },
    { k: 'rewards', label: 'Highest rewards', d: 'Up to X% on your top spend' },
    { k: 'lounge', label: 'Airport lounge access', d: 'Domestic and international' },
  ];
  return (
    <Stack width={358}>
      {opts.map((o) => <Choice key={o.k} type="radio" checked={pick === o.k} label={o.label} description={o.d} showDescription onChange={() => setPick(o.k)} />)}
    </Stack>
  );
}

const meta = {
  title: 'Components/Selections/Choice',
  component: Choice,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/Choice.tsx',
    docs: { description: { component: 'A labelled row around a Checkbox or Radio. The whole row is the tap target. Used in filter sheets.' } },
  },
  argTypes: {
    type: { control: 'select', options: ['checkbox', 'radio'] },
    checked: { control: 'select', options: [false, true, 'indeterminate'] },
    label: { control: 'text' },
    description: { control: 'text' },
    showDescription: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { type: 'checkbox', checked: false, label: 'Lifetime free cards', description: 'No joining fee, no annual fee', showDescription: false, disabled: false },
  render: (args) => <Stack width={358}><Live {...args} /></Stack>,
} satisfies Meta<typeof Choice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="checkbox, unchecked"><Live type="checkbox" checked={false} label="Include invite-only cards" /></Group>
      <Group label="checkbox, checked (label turns blue)"><Live type="checkbox" checked label="Lifetime free cards" /></Group>
      <Group label="checkbox, indeterminate"><Live type="checkbox" checked="indeterminate" label="All banks" description="2 of 5 selected" showDescription /></Group>
      <Group label="radio, with description"><Live type="radio" checked label="HDFC Millennia" description="Annual fee ₹1,000, waived at ₹1,00,000 spend" showDescription /></Group>
      <Group label="radio group"><RadioList /></Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Group label="disabled, unchecked"><Live type="checkbox" checked={false} label="Include invite-only cards" disabled /></Group>
      <Group label="disabled, checked"><Live type="radio" checked label="SBI Cashback" disabled /></Group>
      <Group label="long label and description"><Live type="checkbox" checked={false} label="Cards with fuel surcharge waiver and an airport lounge access benefit" description="Spend ₹4,00,000 a year to keep the lounge benefit on the HDFC Bank Millennia and SBI Cashback cards" showDescription /></Group>
    </Stack>
  ),
};
