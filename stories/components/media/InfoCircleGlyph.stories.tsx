import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { InfoCircleGlyph } from '../../../src/atoms/InfoCircleGlyph';
import { Block, Stack } from '../carousels/_chrome';
import { colors, spacing, iconSize } from '../../../src/tokens';

const meta = {
  title: 'Components/Media/InfoCircleGlyph',
  component: InfoCircleGlyph,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/InfoCircleGlyph.tsx',
    docs: { description: { component: 'A small filled "i" in a circle drawn inline, because no info icon ships in the icon set; tint it with the colour prop.' } },
  },
  argTypes: {
    size: { control: { type: 'number', min: 8, max: 56 }, description: 'Edge length in px. Use an iconSize value.' },
    color: { control: 'color' },
  },
  args: { size: iconSize[16], color: colors.text.secondary },
} satisfies Meta<typeof InfoCircleGlyph>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="Sizes: iconSize 12, 16, 20, 24">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {[iconSize[12], iconSize[16], iconSize[20], iconSize[24]].map((s) => <InfoCircleGlyph key={s} size={s} color={colors.text.secondary} />)}
        </View>
      </Block>
      <Block label="Colours: text.secondary, text.link, action.primary, feedback success">
        <View style={{ flexDirection: 'row', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {[colors.text.secondary, colors.text.link, colors.action.primary.default, colors.feedback.success.text].map((c) => <InfoCircleGlyph key={c} size={iconSize[20]} color={c} />)}
        </View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The glyph has no states of its own. It is not a button: wrap it in a Pressable with a hit area of at least 44 when it opens a tooltip.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Smallest (8) and largest (56)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          <InfoCircleGlyph size={iconSize[8]} color={colors.text.link} />
          <InfoCircleGlyph size={iconSize[56]} color={colors.text.link} />
        </View>
      </Block>
    </Stack>
  ),
};
