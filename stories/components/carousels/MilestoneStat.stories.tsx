import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MilestoneStat } from '../../../src/organisms/Carousels';
import { Block, Stack, phoneDecorator } from './_chrome';
import { milestoneItems } from './_fixtures';

const meta = {
  title: 'Components/Carousels/MilestoneStat',
  component: MilestoneStat,
  tags: ['autodocs', 'live'],
  decorators: [phoneDecorator],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/Carousels.tsx',
    docs: { description: { component: 'A sideways row of 258 by 166 full-bleed image cards. The numbers are baked into the artwork, so the component has no text props.' } },
  },
  argTypes: { items: { control: 'object', description: 'Items: id, image.' }, style: { control: false } },
  args: { items: milestoneItems },
} satisfies Meta<typeof MilestoneStat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The three images here are store page banners used as stand-ins. The real milestone artwork is not in src/assets/images. Open question for design: which artwork ships.' } } },
  render: () => (
    <Stack>
      <Block label="Three cards"><MilestoneStat items={milestoneItems} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Block label="1 item"><MilestoneStat items={milestoneItems.slice(0, 1)} /></Block>
      <Block label="Many items (6)"><MilestoneStat items={[...milestoneItems, ...milestoneItems.map((m) => ({ ...m, id: m.id + 'b' }))]} /></Block>
    </Stack>
  ),
};
