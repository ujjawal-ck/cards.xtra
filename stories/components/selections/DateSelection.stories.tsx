import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { DateSelection, type DateSelectionProps } from '../../../src/atoms/DateSelection';
import { spacing } from '../../../src/tokens';
import { Group, Wrap } from './_kit';

function Live(props: DateSelectionProps) {
  const [sel, setSel] = useState(props.property1 === 'Selected');
  return <DateSelection {...props} property1={sel ? 'Selected' : 'Default'} onPress={() => setSel((s) => !s)} />;
}

function DayRow() {
  const [pick, setPick] = useState('05');
  return (
    <View style={{ flexDirection: 'row', gap: spacing[8] }}>
      {['03', '04', '05', '06', '07'].map((d) => <DateSelection key={d} day={d} property1={pick === d ? 'Selected' : 'Default'} onPress={() => setPick(d)} />)}
    </View>
  );
}

const meta = {
  title: 'Components/Selections/DateSelection',
  component: DateSelection,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/DateSelection.tsx',
    docs: { description: { component: 'A 64 dp round day chip. The blue border stays in both states; selection fills it blue. Not used by any screen today.' } },
  },
  argTypes: {
    day: { control: 'text' },
    property1: { control: 'select', options: ['Default', 'Selected'] },
  },
  args: { day: '05', property1: 'Default' },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof DateSelection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Group label="Default"><Live day="05" /></Group>
      <Group label="Selected"><Live day="05" property1="Selected" /></Group>
      <Group label="as a row (one selected)"><DayRow /></Group>
    </Wrap>
  ),
};

export const States: Story = {
  render: () => (
    <Wrap>
      <Group label="single digit"><Live day="1" /></Group>
      <Group label="two digits"><Live day="31" property1="Selected" /></Group>
      <Group label="long text (3 characters)"><Live day="Sun" /></Group>
    </Wrap>
  ),
};
