import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Chip, type ChipProps } from '../../../src/atoms/Chip';
import { images } from '../../../src/assets/images';
import { Group, Stack, Wrap } from './_kit';

/** Chip that flips default and selected on tap, unless disabled. */
function Live(props: ChipProps) {
  const [sel, setSel] = useState(props.state === 'selected');
  const state = props.state === 'disabled' ? 'disabled' : sel ? 'selected' : 'default';
  return <Chip {...props} state={state} onPress={() => setSel((s) => !s)} />;
}

const meta = {
  title: 'Components/Selections/Chip',
  component: Chip,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Chip.tsx',
    docs: { description: { component: 'A pill for filters, tabs and toggles. One component, three types: default (filter), tab (segment), toggle (switch plus an edit button).' } },
  },
  argTypes: {
    type: { control: 'select', options: ['default', 'tab', 'toggle'] },
    state: { control: 'select', options: ['default', 'selected', 'disabled'] },
    size: { control: 'select', options: [20, 24, 28, 32] },
    label: { control: 'text' },
    count: { control: 'number' },
    dot: { control: 'boolean' },
    leadingIcon: { control: 'text' },
    trailingIcon: { control: 'text' },
  },
  args: { label: 'Lifetime free', type: 'default', state: 'default', size: 32 },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: '`size` applies to default and toggle chips. The tab chip has fixed geometry and ignores it.' } } },
  render: () => (
    <Stack>
      <Group label="default, sizes 20 / 24 / 28 / 32">
        <Wrap>{([20, 24, 28, 32] as const).map((s) => <Live key={s} label={`Size ${s}`} size={s} />)}</Wrap>
      </Group>
      <Group label="default, selected">
        <Wrap>{([20, 24, 28, 32] as const).map((s) => <Live key={s} label={`Size ${s}`} size={s} state="selected" />)}</Wrap>
      </Group>
      <Group label="leading icon / trailing icon / dot">
        <Wrap>
          <Live label="Filters" leadingIcon="filter-outline" />
          <Live label="Category" trailingIcon="chevron-down" />
          <Live label="Filters" dot />
        </Wrap>
      </Group>
      <Group label="leading image (bank or store logo)">
        <Wrap>
          <Live label="Amazon" leadingImage={images.brands.amazon} />
          <Live label="Flipkart" leadingImage={images.brands.flipkart} state="selected" />
        </Wrap>
      </Group>
      <Group label="count on a filter chip">
        <Wrap><Live label="Fuel" count={12} state="selected" /><Live label="Travel" count={36} /></Wrap>
      </Group>
      <Group label="tab, default and selected, with count">
        <Wrap><Live label="All" type="tab" count={36} state="selected" /><Live label="Shopping" type="tab" count={12} /><Live label="Travel" type="tab" /></Wrap>
      </Group>
      <Group label="toggle (switch + edit button)">
        <Wrap><Live label="Eligibility" type="toggle" onEditPress={() => {}} /><Live label="Eligibility" type="toggle" state="selected" onEditPress={() => {}} /></Wrap>
      </Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Group label="default / selected / disabled (default type)">
        <Wrap><Live label="Default" /><Live label="Selected" state="selected" /><Live label="Disabled" state="disabled" /></Wrap>
      </Group>
      <Group label="disabled tab and toggle">
        <Wrap><Live label="Disabled" type="tab" state="disabled" /><Live label="Disabled" type="toggle" state="disabled" /></Wrap>
      </Group>
      <Group label="long label"><Live label="HDFC Bank Millennia Credit Card lifetime free" size={32} /></Group>
      <Group label="amount label, Indian grouping">
        <Wrap><Live label="₹10,000" /><Live label="₹1,00,000" state="selected" /><Live label="₹10,00,000+" /></Wrap>
      </Group>
      <Group label="large count"><Live label="All cards" count={1250} type="tab" state="selected" /></Group>
    </Stack>
  ),
};
