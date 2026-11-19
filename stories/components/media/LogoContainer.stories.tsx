import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LogoContainer } from '../../../src/atoms/LogoContainer';
import { Block, Stack } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], paddingHorizontal: spacing[16] } as const;

const meta = {
  title: 'Components/Media/LogoContainer',
  component: LogoContainer,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/LogoContainer.tsx',
    docs: { description: { component: 'A fixed 80 by 48 framed logo with a contained 56 by 24 image, used at the left of order rows and order cards.' } },
  },
  argTypes: { source: { control: false }, style: { control: false } },
  args: { source: images.brands.myntra },
} satisfies Meta<typeof LogoContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={420}>
      <Block label="Brand logos (fixed size, no size prop)">
        <View style={row}>{Object.entries(images.brands).slice(0, 8).map(([k, src]) => <LogoContainer key={k} source={src} />)}</View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: unlike BrandLogoTile there is no error fallback. A logo that fails to load leaves an empty frame.' } } },
  render: () => (
    <Stack width={420}>
      <Block label="Wide store art (contained in 56 by 24)"><View style={row}><LogoContainer source={images.stores.amazon2} /><LogoContainer source={images.stores.myntra31} /></View></Block>
      <Block label="Broken source (inline data URI): empty frame"><View style={row}><LogoContainer source={{ uri: 'data:image/png;base64,AAAA' }} /></View></Block>
    </Stack>
  ),
};
