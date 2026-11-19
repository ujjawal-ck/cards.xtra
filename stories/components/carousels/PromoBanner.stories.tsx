import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PromoBanner } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator } from './_chrome';
import { promoImages } from './_fixtures';
import { colors } from '../../../src/tokens';

const meta = {
  title: 'Components/Carousels/PromoBanner',
  component: PromoBanner,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A 360 by 252 hero banner: one image, or several slides with a paging swipe and a step or progress indicator.' } },
  },
  argTypes: {
    image: { control: false, description: 'One hero image. Use images for several.' },
    images: { control: 'object' },
    total: { control: 'number', description: 'Dot count override. Default is the slide count.' },
    active: { control: 'number', description: '0-based active dot. Ignored after the user swipes.' },
    autoScroll: { control: 'boolean' },
    autoScrollIntervalMs: { control: 'number' },
    autoScrollResumeDelayMs: { control: 'number' },
    topScrim: { control: 'boolean' },
    safeTop: { control: 'number', description: 'Status bar band height. 0 means no band.' },
    safeTopColor: { control: 'color' },
    style: { control: false },
  },
  args: { images: promoImages, active: 0, autoScroll: false, autoScrollIntervalMs: 2450, autoScrollResumeDelayMs: 4000, topScrim: false, safeTop: 0 },
} satisfies Meta<typeof PromoBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Block label="Single image (no indicator)"><PromoBanner image={promoImages[0]} /></Block>
      <Block label="Three slides, step dots, active 1"><PromoBanner images={promoImages} active={1} /></Block>
      <Block label="Three slides, auto scroll (progress bars)"><PromoBanner images={promoImages} autoScroll /></Block>
      <Block label="Top scrim (banner bleeds behind the status bar)"><PromoBanner images={promoImages} topScrim /></Block>
      <Block label="Status bar band, light (safeTop 44)"><PromoBanner images={promoImages} safeTop={44} /></Block>
      <Block label="Status bar band, dark (safeTopColor surface.dark)"><PromoBanner images={promoImages} safeTop={44} safeTopColor={colors.surface.dark} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no loading or error state. A banner with no image renders an empty grey block.' } } },
  render: () => (
    <Stack>
      <Block label="No image"><PromoBanner /></Block>
      <Block label="1 image"><PromoBanner images={[promoImages[0]]} /></Block>
      <Block label="Many slides (6)"><PromoBanner images={[...promoImages, ...promoImages]} /></Block>
    </Stack>
  ),
};
