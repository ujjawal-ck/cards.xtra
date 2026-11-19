import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { OtpBox } from '../../../src/atoms/OtpBox';
import { spacing } from '../../../src/tokens';
import { Group, Wrap } from './_kit';

const meta = {
  title: 'Components/Input fields/OtpBox',
  component: OtpBox,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/atoms/OtpBox.tsx',
    docs: { description: { component: 'One visual digit cell. Not used by any screen: OtpInput draws its own slots. Kept for reference.' } },
  },
  argTypes: {
    value: { control: 'text' },
    focused: { control: 'boolean' },
    error: { control: 'boolean' },
    size: { control: 'number' },
  },
  args: { value: '4', focused: false, error: false },
} satisfies Meta<typeof OtpBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: spacing[8] }}>
      {['4', '8', '2', '9', '1', '3'].map((d, i) => <OtpBox key={i} value={d} />)}
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <Wrap>
      <Group label="empty"><OtpBox value="" /></Group>
      <Group label="focused"><OtpBox value="" focused /></Group>
      <Group label="filled"><OtpBox value="7" /></Group>
      <Group label="error"><OtpBox value="7" error /></Group>
      <Group label="size 56"><OtpBox value="7" size={spacing[56]} /></Group>
    </Wrap>
  ),
};
