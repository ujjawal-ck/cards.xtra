import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BrandLogo, BrandLogoGrid } from '../../../src/molecules/BrandLogo';
import { Block, Stack } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], paddingHorizontal: spacing[16] } as const;

const meta = {
  title: 'Components/Media/BrandLogo',
  component: BrandLogo,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/molecules/BrandLogo.tsx',
    docs: { description: { component: 'A 104 by 48 bordered chip with a contained 74 by 32 logo; becomes a button when onPress is set. BrandLogoGrid lays out one chip for each image in a collection.' } },
  },
  argTypes: {
    source: { control: false },
    onPress: { control: false, description: 'When set, the chip is a button.' },
    accessibilityLabel: { control: 'text', description: 'Brand name for screen readers. Default "Brand logo".' },
    style: { control: false },
  },
  args: { source: images.brands.ajio, accessibilityLabel: 'Ajio' },
} satisfies Meta<typeof BrandLogo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={420}>
      <Block label="Static chip (no onPress)"><View style={row}><BrandLogo source={images.brands.amazon} accessibilityLabel="Amazon" /></View></Block>
      <Block label="Pressable chip (onPress set)"><View style={row}><BrandLogo source={images.brands.flipkart} accessibilityLabel="Flipkart" onPress={() => {}} /></View></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no pressed style and no error fallback. A failed image leaves an empty chip (RemoteImage only retries CashKaro hosts).' } } },
  render: () => (
    <Stack width={420}>
      <Block label="Store art instead of a brand tile"><View style={row}><BrandLogo source={images.stores.sbicard} accessibilityLabel="SBI Card" /><BrandLogo source={images.stores.tatamg} accessibilityLabel="Tata MG" /></View></Block>
      <Block label="Broken source (inline data URI): empty chip"><View style={row}><BrandLogo source={{ uri: 'data:image/png;base64,AAAA' }} /></View></Block>
    </Stack>
  ),
};

export const Grid: Story = {
  name: 'BrandLogoGrid: brands',
  parameters: { layout: 'padded', docs: { description: { story: 'BrandLogoGrid renders every entry of images.brands by default. Add a logo with one line in src/assets/images/index.ts.' } } },
  render: () => <View style={{ width: 460 }}><BrandLogoGrid /></View>,
};

export const GridStores: Story = {
  name: 'BrandLogoGrid: stores',
  parameters: { layout: 'padded', docs: { description: { story: 'Pass Object.values(images.stores) for store and partner logos. Brands and stores are never mixed in one grid.' } } },
  render: () => <View style={{ width: 460 }}><BrandLogoGrid logos={Object.values(images.stores)} onLogoPress={() => {}} /></View>,
};
