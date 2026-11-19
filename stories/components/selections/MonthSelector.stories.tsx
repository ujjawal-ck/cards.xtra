import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { MonthSelector, type MonthSelectorProps } from '../../../src/atoms/MonthSelector';
import { spacing } from '../../../src/tokens';
import { Group, Wrap } from './_kit';

function Live(props: MonthSelectorProps) {
  const [sel, setSel] = useState(props.property1 === 'Selected');
  return <MonthSelector {...props} property1={sel ? 'Selected' : 'Default'} onPress={() => setSel((s) => !s)} />;
}

function MonthWheel() {
  const months = ['September', 'October', 'November', 'December'];
  const [pick, setPick] = useState('November');
  return (
    <View style={{ flexDirection: 'row', gap: spacing[8] }}>
      {months.map((m) => <MonthSelector key={m} month={m} property1={pick === m ? 'Selected' : 'Default'} onPress={() => setPick(m)} />)}
    </View>
  );
}

const meta = {
  title: 'Components/Selections/MonthSelector',
  component: MonthSelector,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/MonthSelector.tsx',
    docs: { description: { component: 'A month item for a wheel-style picker: a label between two short rules. The selected item has blue rules and a heavier label. Not used by any screen today.' } },
  },
  argTypes: {
    month: { control: 'text' },
    property1: { control: 'select', options: ['Default', 'Selected'] },
  },
  args: { month: 'November', property1: 'Default' },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof MonthSelector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Wrap>
      <Group label="Default"><Live month="April" /></Group>
      <Group label="Selected"><Live month="April" property1="Selected" /></Group>
      <Group label="four months, one selected"><MonthWheel /></Group>
    </Wrap>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The column is a fixed 66.5 dp wide (no token). A long month name can clip in that width; check "September".' } } },
  render: () => (
    <Wrap>
      <Group label="short name"><Live month="May" /></Group>
      <Group label="longest name"><Live month="September" property1="Selected" /></Group>
    </Wrap>
  ),
};
