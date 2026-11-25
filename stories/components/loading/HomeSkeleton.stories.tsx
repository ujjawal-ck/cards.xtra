import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HomeSkeleton, CardListSkeleton } from '../../../src/organisms/HomeSkeleton';
import { ComponentHarness } from '../../../storybook/harness';
import { Block, Stack, Phone } from '../carousels/_chrome';
import { colors, radius, spacing, borderWidth } from '../../../src/tokens';

const meta = {
  title: 'Components/Loading/HomeSkeleton',
  component: HomeSkeleton,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'centered',
    source: 'src/organisms/HomeSkeleton.tsx',
    docs: { description: { component: 'A loading layout that mirrors Home: hero, search pill, tools row, filter chips and card tiles. CardListSkeleton is the short run of card-shaped rows in the same file.' } },
  },
} satisfies Meta<typeof HomeSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The whole Home layout in loading. */
export const Playground: Story = {
  decorators: [(Story) => (
    <View style={{ width: 390, height: 844, overflow: 'hidden', borderRadius: radius.xl, borderWidth: borderWidth.thin, borderColor: colors.border.default }}><ComponentHarness><Story /></ComponentHarness></View>
  )],
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'CardListSkeleton with 1, 2 (default) and 4 rows. It brackets the category strip while a new category loads.' } } },
  render: () => (
    <Stack width={390}>
      <Block label="CardListSkeleton count 1"><CardListSkeleton count={1} /></Block>
      <Block label="CardListSkeleton count 2 (default)"><CardListSkeleton /></Block>
      <Block label="CardListSkeleton count 4"><CardListSkeleton count={4} /></Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Home shows HomeSkeleton as a first-mount overlay and as the backdrop behind the filter transition. HomeSkeleton has no props and no error state. Open question: it loops forever, so a request that never ends keeps the skeleton up. The screen owns the timeout and the retry block.' } } },
  render: () => (
    <Stack width={390}>
      <Block label="CardListSkeleton count 0 (renders nothing)"><View style={{ minHeight: spacing[24] }}><CardListSkeleton count={0} /></View></Block>
      <Block label="HomeSkeleton cropped to the top 480 of 844">
        <Phone>
          <View style={{ height: 480, overflow: 'hidden' }}><ComponentHarness><HomeSkeleton /></ComponentHarness></View>
        </Phone>
      </Block>
    </Stack>
  ),
};
