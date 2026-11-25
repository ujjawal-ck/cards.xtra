import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Checkbox, type CheckboxProps, type CheckboxValue } from '../../../src/atoms/Checkbox';
import { Group, Wrap } from './_kit';

function Live(props: CheckboxProps) {
  const [v, setV] = useState<CheckboxValue>(props.checked);
  return <Checkbox {...props} checked={v} onChange={(n) => setV(n)} />;
}

const meta = {
  title: 'Components/Selections/Checkbox',
  component: Checkbox,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Checkbox.tsx',
    docs: { description: { component: 'A square box for many-of-many choices. Three values: unchecked, checked, indeterminate. Use inside a Choice row when it needs a label.' } },
  },
  argTypes: {
    checked: { control: 'select', options: [false, true, 'indeterminate'] },
    size: { control: 'select', options: ['md', 'sm'] },
    disabled: { control: 'boolean' },
  },
  args: { checked: false, size: 'md', disabled: false },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Group label="md unchecked"><Live checked={false} /></Group>
      <Group label="md checked"><Live checked /></Group>
      <Group label="md indeterminate"><Live checked="indeterminate" /></Group>
      <Group label="sm unchecked"><Live checked={false} size="sm" /></Group>
      <Group label="sm checked"><Live checked size="sm" /></Group>
      <Group label="sm indeterminate"><Live checked="indeterminate" size="sm" /></Group>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Tapping an indeterminate box makes it checked. The hit area is 44 dp (hitSlop 12 around the 20 dp box).' } } },
  render: () => (
    <Wrap>
      <Group label="disabled unchecked"><Live checked={false} disabled /></Group>
      <Group label="disabled checked"><Live checked disabled /></Group>
      <Group label="disabled indeterminate"><Live checked="indeterminate" disabled /></Group>
    </Wrap>
  ),
};
