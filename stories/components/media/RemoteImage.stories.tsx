import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { RemoteImage } from '../../../src/atoms/RemoteImage';
import { Block, Stack } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';

const box = { width: 160, height: 96, borderRadius: radius.md, borderWidth: borderWidth.thin, borderColor: colors.border.default, backgroundColor: colors.surface.default } as const;

const meta = {
  title: 'Components/Media/RemoteImage',
  component: RemoteImage,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/RemoteImage.tsx',
    docs: { description: { component: 'A drop-in Image that retries once on the other CashKaro asset host when a store image fails to load. Local images behave exactly like Image.' } },
  },
  argTypes: {
    source: { control: false },
    resizeMode: { control: 'inline-radio', options: ['cover', 'contain', 'stretch', 'center'] },
    style: { control: false },
    onError: { control: false },
  },
  args: { source: images.brands.amazon, resizeMode: 'contain', style: box },
} satisfies Meta<typeof RemoteImage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Local assets only: the stories make no network call. The host retry (asset11 and asset21 swap) only runs for CashKaro URLs, so it is not shown here.' } } },
  render: () => (
    <Stack width={420}>
      {(['contain', 'cover', 'stretch', 'center'] as const).map((m) => (
        <Block key={m} label={`resizeMode: ${m}`}>
          <View style={{ paddingHorizontal: spacing[16] }}><RemoteImage source={images.brands.myntra} resizeMode={m} style={box} /></View>
        </Block>
      ))}
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: when the retry also fails the component calls onError and renders nothing, so the parent must supply its own fallback (BrandLogoTile swaps in the Cards.xtra mark). A broken local source here shows an empty box.' } } },
  render: () => (
    <Stack width={420}>
      <Block label="Local brand logo"><View style={{ paddingHorizontal: spacing[16] }}><RemoteImage source={images.brands.flipkart} resizeMode="contain" style={box} /></View></Block>
      <Block label="Local card art"><View style={{ paddingHorizontal: spacing[16] }}><RemoteImage source={images.cards.hdfcSwiggy} resizeMode="contain" style={box} /></View></Block>
      <Block label="Broken source (inline data URI, no network): empty"><View style={{ paddingHorizontal: spacing[16] }}><RemoteImage source={{ uri: 'data:image/png;base64,AAAA' }} style={box} /></View></Block>
    </Stack>
  ),
};
