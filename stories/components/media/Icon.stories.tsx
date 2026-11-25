import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Icon, ICON_NAMES } from '../../../src/atoms/Icon';
import { Text } from '../../../src/atoms';
import { Block, Stack } from '../carousels/_chrome';
import { colors, spacing, radius, iconSize, borderWidth } from '../../../src/tokens';

const SIZES = Object.values(iconSize);

const meta = {
  title: 'Components/Media/Icon',
  component: Icon,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/Icon.tsx',
    docs: { description: { component: 'The one icon component: pick a name from the registry, a size from iconSize, and tint it with a colour token.' } },
  },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    size: { control: 'select', options: SIZES, description: 'Edge length. Default iconSize[20].' },
    color: { control: 'color', description: 'Tints outline and general icons only. nav-*, desc-* and raster icons keep their own colours.' },
    style: { control: false },
  },
  args: { name: 'feat-rewards-outline', size: iconSize[24], color: colors.text.primary },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { layout: 'padded', docs: { description: { story: `All ${ICON_NAMES.length} registered names. nav-* icons bake a white stroke for the dark tab bar, so they vanish on this light ground. desc-* and raster icons keep their own colours.` } } },
  render: () => (
    <View style={{ width: 720, flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], padding: spacing[16] }}>
      {ICON_NAMES.map((n) => (
        <View key={n} style={{ width: 104, alignItems: 'center', gap: spacing[6], padding: spacing[8], borderRadius: radius.md, borderWidth: borderWidth.thin, borderColor: colors.border.default, backgroundColor: n.startsWith('nav-') ? colors.surface.dark : colors.surface.default }}>
          <Icon name={n} size={iconSize[24]} />
          <Text variant="body12Regular" color={n.startsWith('nav-') ? colors.text.inverse : colors.text.secondary} align="center" numberOfLines={2}>{n}</Text>
        </View>
      ))}
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <Stack width={420}>
      <Block label="Sizes: iconSize 8 to 56">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {SIZES.map((s) => <Icon key={s} name="feat-rewards-outline" size={s} />)}
        </View>
      </Block>
      <Block label="Tint: text.primary, text.link, action.primary, feedback success" note="the same outline icon, four colour tokens">
        <View style={{ flexDirection: 'row', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {[colors.text.primary, colors.text.link, colors.action.primary.default, colors.feedback.success.text].map((c) => <Icon key={c} name="check-circle-outline" size={iconSize[32]} color={c} />)}
        </View>
      </Block>
      <Block label="Baked colour: desc-* ignores the colour prop" note="desc-paid, desc-pending, desc-cross tinted with action.primary, still their own colour">
        <View style={{ flexDirection: 'row', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          {(['desc-paid', 'desc-pending', 'desc-cross'] as const).map((n) => <Icon key={n} name={n} size={iconSize[32]} color={colors.action.primary.default} />)}
        </View>
      </Block>
      <Block label="Raster: amazon, flipkart" note="small PNG files, colour is baked">
        <View style={{ flexDirection: 'row', gap: spacing[16], paddingHorizontal: spacing[16] }}>
          <Icon name="amazon" size={iconSize[40]} /><Icon name="flipkart" size={iconSize[40]} />
        </View>
      </Block>
    </Stack>
  ),
};
