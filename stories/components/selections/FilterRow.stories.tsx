import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FilterRow, type FilterRowProps } from '../../../src/molecules/FilterRow';
import { Group, Stack } from './_kit';

function Live(props: FilterRowProps) {
  const [on, setOn] = useState(!!props.eligibilityOn);
  return <FilterRow {...props} eligibilityOn={on} onEligibilityChange={setOn} onCategoryPress={() => {}} onFiltersPress={() => {}} />;
}

const meta = {
  title: 'Components/Selections/FilterRow',
  component: FilterRow,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/FilterRow.tsx',
    docs: { description: { component: 'The Home filter bar: a category chip, a Filters chip (with a dot when filters are on) and an Eligibility switch.' } },
  },
  argTypes: {
    category: { control: 'text' },
    filtersActive: { control: 'boolean' },
    eligibilityOn: { control: 'boolean' },
  },
  args: { category: 'Category', filtersActive: false, eligibilityOn: false },
  render: (args) => <Stack><Live {...args} /></Stack>,
} satisfies Meta<typeof FilterRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="default"><Live /></Group>
      <Group label="category chosen"><Live category="Travel" /></Group>
      <Group label="filters active (dot)"><Live category="Shopping" filtersActive /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The Eligibility switch is the React Native Switch with a saffron track, not the Switch atom. Open product question: should it move to the Switch atom?' } } },
  render: () => (
    <Stack>
      <Group label="eligibility on"><Live eligibilityOn filtersActive /></Group>
      <Group label="long category name"><Live category="Fuel, travel and airport lounge" filtersActive eligibilityOn /></Group>
    </Stack>
  ),
};
