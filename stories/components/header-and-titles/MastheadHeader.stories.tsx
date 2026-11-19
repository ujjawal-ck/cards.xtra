import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ImageBackground, Text } from 'react-native';
import { MastheadHeader } from '../../../src/organisms/MastheadHeader';
import { images } from '../../../src/assets/images';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Header and titles/MastheadHeader',
  component: MastheadHeader,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/MastheadHeader.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Floating header for a hero image: two 40 dp circle buttons and an optional centred title, with no container background. iconType picks the button style for the surface below.' } },
  },
  argTypes: {
    iconType: { control: 'select', options: ['solid', 'overlay'] },
    leading: { control: 'select', options: ['back', 'close', 'collapse'] },
    title: { control: 'text' },
    trailingIcon: { control: 'select', options: [undefined, 'bell-outline', 'message-outline', 'headset-outline', 'filter-outline', 'clipboard-search-outline'] },
    trailingGlyph: { control: 'select', options: [undefined, 'share'] },
  },
  args: { iconType: 'solid', leading: 'back', title: 'HDFC Millennia', trailingGlyph: 'share' },
} satisfies Meta<typeof MastheadHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

function Surface({ children, tone, label }: { children: React.ReactNode; tone: 'light' | 'dark' | 'image'; label?: string }) {
  const inner = <View style={{ paddingVertical: spacing[16] }}>{children}</View>;
  return (
    <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16] }}>
      {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text> : null}
      {tone === 'image'
        ? <ImageBackground source={images.backgrounds.large} resizeMode="cover">{inner}</ImageBackground>
        : <View style={{ backgroundColor: tone === 'dark' ? colors.surface.dark : colors.surface.sunken }}>{inner}</View>}
    </View>
  );
}

export const Playground: Story = { render: (args) => <Surface tone={args.iconType === 'overlay' ? 'dark' : 'light'}><MastheadHeader {...args} /></Surface> };

export const Variants: Story = {
  render: () => (
    <View>
      <Surface tone="light" label="solid, back, share glyph"><MastheadHeader iconType="solid" leading="back" trailingGlyph="share" /></Surface>
      <Surface tone="light" label="solid, close, title"><MastheadHeader iconType="solid" leading="close" title="Eligibility" /></Surface>
      <Surface tone="light" label="solid, collapse (sheet-like page)"><MastheadHeader iconType="solid" leading="collapse" trailingGlyph="share" /></Surface>
      <Surface tone="dark" label="overlay, back, bell icon"><MastheadHeader iconType="overlay" leading="back" trailingIcon="bell-outline" /></Surface>
      <Surface tone="image" label="overlay over hero image, title"><MastheadHeader iconType="overlay" leading="back" title="SBI Cashback" trailingGlyph="share" /></Surface>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'No pressed or disabled style. Leading only (no trailing) leaves the right side empty, the title stays centred. Wrong iconType on a surface (overlay on white) makes the buttons read as black discs: pick iconType from the surface, not from taste. Long title truncation is not specified: open question for product.' } } },
  render: () => (
    <View>
      <Surface tone="light" label="Leading only"><MastheadHeader iconType="solid" leading="back" /></Surface>
      <Surface tone="light" label="Long title"><MastheadHeader iconType="solid" leading="back" title="HDFC Bank Regalia Gold Credit Card" trailingGlyph="share" /></Surface>
      <Surface tone="light" label="Wrong pairing: overlay on a light surface"><MastheadHeader iconType="overlay" leading="back" trailingGlyph="share" /></Surface>
    </View>
  ),
};
