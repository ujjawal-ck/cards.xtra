import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Selector, type SelectorProps } from '../../../src/atoms/Selector';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';
import { Group, Stack, Wrap } from './_kit';

function Live(props: SelectorProps) {
  const [sel, setSel] = useState(!!props.selected);
  return <Selector {...props} selected={sel} onPress={() => setSel((s) => !s)} />;
}

const meta = {
  title: 'Components/Selections/Selector',
  component: Selector,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/Selector.tsx',
    docs: { description: { component: 'A 160 by 48 tile with an icon and a short title, for picking an answer in a grid (spend category, employment type).' } },
  },
  argTypes: {
    title: { control: 'text' },
    selected: { control: 'boolean' },
  },
  args: { title: 'Salaried', selected: false, source: images.brands.amazon },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof Selector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={358}>
      <Group label="default"><Live title="Salaried" source={images.brands.amazon} /></Group>
      <Group label="selected"><Live title="Self-employed" source={images.brands.flipkart} selected /></Group>
      <Group label="no icon source (flat neutral square)"><Live title="Student" /></Group>
      <Group label="two per row (flex 1)">
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          <Live title="Shopping" source={images.brands.myntra} style={{ flex: 1 }} />
          <Live title="Travel" source={images.brands.ajio} style={{ flex: 1 }} selected />
        </View>
      </Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Wrap>
      <Group label="default"><Live title="Fuel" source={images.brands.amazon} /></Group>
      <Group label="selected"><Live title="Fuel" source={images.brands.amazon} selected /></Group>
      <Group label="long title (wraps to 2 lines)"><Live title="Self-employed professional" source={images.brands.flipkart} /></Group>
    </Wrap>
  ),
};
