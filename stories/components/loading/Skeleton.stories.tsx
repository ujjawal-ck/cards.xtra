import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Skeleton } from '../../../src/atoms/Skeleton';
import { Block, Stack } from '../carousels/_chrome';
import { colors, spacing, radius } from '../../../src/tokens';

const RADII = Object.keys(radius) as (keyof typeof radius)[];

const meta = {
  title: 'Components/Loading/Skeleton',
  component: Skeleton,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/atoms/Skeleton.tsx',
    docs: { description: { component: 'A generic pulsing block of any width, height and corner radius; the building piece for a loading layout.' } },
  },
  argTypes: {
    width: { control: 'text', description: 'A number of px or a percentage string such as "60%".' },
    height: { control: { type: 'number', min: 4, max: 200 } },
    radius: { control: 'select', options: RADII, description: 'A key of the radius tokens.' },
    tone: { control: 'inline-radio', options: ['default', 'onDark'], description: 'onDark is a white block for dark surfaces.' },
    style: { control: false },
  },
  args: { width: 240, height: 16, radius: 'sm', tone: 'default' },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="radius: sm (default), lg, full">
        <View style={{ flexDirection: 'row', gap: spacing[12], paddingHorizontal: spacing[16] }}>
          <Skeleton width={96} height={32} />
          <Skeleton width={96} height={32} radius="lg" />
          <Skeleton width={96} height={32} radius="full" />
        </View>
      </Block>
      <Block label="tone: onDark (white block on a dark surface)">
        <View style={{ marginHorizontal: spacing[16], padding: spacing[16], gap: spacing[8], borderRadius: radius.lg, backgroundColor: colors.surface.dark }}>
          <Skeleton tone="onDark" width={160} height={24} />
          <Skeleton tone="onDark" width="60%" height={12} />
        </View>
      </Block>
      <Block label="A text block: one title line, two body lines">
        <View style={{ gap: spacing[8], paddingHorizontal: spacing[16] }}>
          <Skeleton width="55%" height={20} />
          <Skeleton height={12} />
          <Skeleton width="80%" height={12} />
        </View>
      </Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The block has one state: pulsing. It carries accessibilityLabel "Loading". The pulse runs forever, so a screen must swap it out when data arrives.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Percentage width (50%) in a 360 column"><View style={{ paddingHorizontal: spacing[16] }}><Skeleton width="50%" /></View></Block>
      <Block label="Card-shaped block (full width, 96 high, radius lg)"><View style={{ paddingHorizontal: spacing[16] }}><Skeleton height={96} radius="lg" /></View></Block>
    </Stack>
  ),
};
