import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BrandLogoTile } from '../../../src/atoms/BrandLogoTile';
import { Block, Stack } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], paddingHorizontal: spacing[16] } as const;

const meta = {
  title: 'Components/Media/BrandLogoTile',
  component: BrandLogoTile,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/BrandLogoTile.tsx',
    docs: { description: { component: 'A 74 wide bordered logo tile in three heights; used in the missing cashback flow and on help ticket cards.' } },
  },
  argTypes: {
    source: { control: false },
    size: { control: 'inline-radio', options: ['32', '40', '44'], description: 'Tile height in px. Default 40.' },
    style: { control: false },
  },
  args: { source: images.brands.nykaa, size: '40' },
} satisfies Meta<typeof BrandLogoTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={420}>
      {(['32', '40', '44'] as const).map((s) => (
        <Block key={s} label={`size ${s}`}>
          <View style={row}>{Object.entries(images.brands).slice(0, 5).map(([k, src]) => <BrandLogoTile key={k} source={src} size={s} />)}</View>
        </Block>
      ))}
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'A logo that fails to load swaps to the Cards.xtra mark, so a row is never empty. The broken source here is an inline data URI, not a network call.' } } },
  render: () => (
    <Stack width={420}>
      <Block label="Loaded"><View style={row}><BrandLogoTile source={images.brands.amazon} /></View></Block>
      <Block label="Broken source: falls back to the Cards.xtra mark"><View style={row}><BrandLogoTile source={{ uri: 'data:image/png;base64,AAAA' }} /></View></Block>
      <Block label="Store image (wide art, contained)"><View style={row}><BrandLogoTile source={images.stores.jioMart12} /><BrandLogoTile source={images.stores.tataNeu12} /></View></Block>
    </Stack>
  ),
};
