import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TrackMoreBanner } from '../../../src/molecules/TrackMoreBanner';
import { Text } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const meta = {
  title: 'Components/Messages and tooltips/TrackMoreBanner',
  component: TrackMoreBanner,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/TrackMoreBanner.tsx',
    docs: { description: { component: 'A dark gradient promotional CTA at the bottom of the missing-cashback list screens. It carries its own 16 px side inset.' } },
  },
  argTypes: { label: { control: 'text' }, onPress: { control: false } },
  args: { label: 'Have more cashback to track?' },
  decorators: [(Story) => <View style={{ width: 390 }}><Story /></View>],
} satisfies Meta<typeof TrackMoreBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: string }) => (
  <Text variant="body12Medium" style={{ marginBottom: spacing[4], marginTop: spacing[12], paddingHorizontal: spacing[16] }}>{children}</Text>
);

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The only prop that changes the look is the label. Default copy and a custom label.' } } },
  render: () => (
    <View style={{ width: 390 }}>
      <Label>default label</Label>
      <TrackMoreBanner />
      <Label>custom label</Label>
      <TrackMoreBanner label="Missed cashback on Myntra?" />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Long label wraps (flex 1) and the chevron stays on the right. There is no disabled or pressed style in the component.' } } },
  render: () => (
    <View style={{ width: 390 }}>
      <TrackMoreBanner label="Did your ₹1,00,000 Amazon order on the SBI Cashback card not track? Raise a missing cashback ticket" />
    </View>
  ),
};
