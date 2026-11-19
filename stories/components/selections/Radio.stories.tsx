import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Radio, type RadioProps } from '../../../src/atoms/Radio';
import { spacing } from '../../../src/tokens';
import { Group, Wrap } from './_kit';

function Live(props: RadioProps) {
  const [v, setV] = useState(props.selected);
  return <Radio {...props} selected={v} onChange={() => setV(true)} />;
}

/** Three radios that behave as one group: picking one clears the others. */
function RadioGroup() {
  const [pick, setPick] = useState('hdfc');
  return (
    <View style={{ flexDirection: 'row', gap: spacing[16] }}>
      {['hdfc', 'sbi', 'axis'].map((k) => <Radio key={k} selected={pick === k} onChange={() => setPick(k)} accessibilityLabel={k} />)}
    </View>
  );
}

const meta = {
  title: 'Components/Selections/Radio',
  component: Radio,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Radio.tsx',
    docs: { description: { component: 'A round control for one-of-many choices. It has no group logic: the parent holds the selected value. Use inside a Choice row when it needs a label.' } },
  },
  argTypes: {
    selected: { control: 'boolean' },
    size: { control: 'select', options: ['md', 'sm'] },
    disabled: { control: 'boolean' },
  },
  args: { selected: false, size: 'md', disabled: false },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof Radio>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Group label="md unselected"><Live selected={false} /></Group>
      <Group label="md selected"><Live selected /></Group>
      <Group label="sm unselected"><Live selected={false} size="sm" /></Group>
      <Group label="sm selected"><Live selected size="sm" /></Group>
      <Group label="as a group (tap to move)"><RadioGroup /></Group>
    </Wrap>
  ),
};

export const States: Story = {
  render: () => (
    <Wrap>
      <Group label="disabled unselected"><Live selected={false} disabled /></Group>
      <Group label="disabled selected"><Live selected disabled /></Group>
    </Wrap>
  ),
};
