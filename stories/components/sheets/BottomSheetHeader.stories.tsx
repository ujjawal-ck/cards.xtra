import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../../../src/atoms';
import { BottomSheetHeader, type BottomSheetHeaderProps } from '../../../src/organisms/BottomSheetHeader';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';

const meta: Meta<BottomSheetHeaderProps> = {
  title: 'Components/Sheets/BottomSheetHeader',
  component: BottomSheetHeader,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/BottomSheetHeader.tsx:48', docs: { description: { component: 'Top of every sheet body: a 44 by 4 drag handle, an optional centred title and an optional 1 px stroke below.' } } },
  argTypes: { title: { control: 'text' }, showStroke: { control: 'boolean' } },
  args: { title: 'Select Month', showStroke: true },
  render: (args) => <View style={{ width: 390, borderRadius: radius['2xl'], overflow: 'hidden', borderWidth: borderWidth.thin, borderColor: colors.border.default }}><BottomSheetHeader {...args} /></View>,
};
export default meta;
type Story = StoryObj<BottomSheetHeaderProps>;

export const Playground: Story = {};
export const Variants: Story = {
  render: () => (
    <View style={{ gap: spacing[16], width: 390 }}>
      {([['Handle only', {}], ['Title', { title: 'Earning Status' }], ['Title and stroke', { title: 'Earning Status', showStroke: true }], ['Stroke only', { showStroke: true }]] as [string, BottomSheetHeaderProps][]).map(([label, p]) => (
        <View key={label} style={{ gap: spacing[4] }}>
          <Text variant="body12Medium" color={colors.text.secondary}>{label}</Text>
          <View style={{ borderRadius: radius['2xl'], overflow: 'hidden', borderWidth: borderWidth.thin, borderColor: colors.border.default }}><BottomSheetHeader {...p} /></View>
        </View>
      ))}
    </View>
  ),
};
