import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Skeleton } from '../../src/atoms/Skeleton';
import { AmountSkeleton } from '../../src/atoms/AmountSkeleton';
import { Text } from '../../src/atoms/Text';
import { HomeSkeleton, CardListSkeleton } from '../../src/organisms/HomeSkeleton';
import { ComponentHarness } from '../../storybook/harness';
import { colors, spacing, radius } from '../../src/tokens';
import { Board, Labelled, Phone } from './_shared';

const meta: Meta = {
  title: 'Patterns/Loading',
  parameters: { layout: 'padded', docs: { description: { component: 'Skeleton first. A wait line for long calls. No spinner on money values.' } } },
};
export default meta;
type Story = StoryObj;

function RowSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing[12], alignItems: 'center' }}>
      <Skeleton width={48} height={48} radius="full" />
      <View style={{ flex: 1, gap: spacing[8] }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={12} width="45%" />
      </View>
    </View>
  );
}

export const GenericBlocks: Story = {
  tags: ['live'],
  parameters: { source: 'src/atoms/Skeleton.tsx:29', docs: { description: { story: 'The Skeleton atom: any width, height and radius, pulsing between opacity[16] and opacity[40].' } } },
  render: () => (
    <Board>
      <Phone>
        <RowSkeleton /><RowSkeleton /><RowSkeleton />
      </Phone>
    </Board>
  ),
};

export const MoneyAmounts: Story = {
  tags: ['live'],
  parameters: { source: 'src/atoms/AmountSkeleton.tsx:39', docs: { description: { story: 'AmountSkeleton stands in for a money value while it loads. The user never sees a fake ₹0 that then changes. Use `tone="onDark"` on a dark hero.' } } },
  render: () => (
    <Board>
      <Phone>
        <Labelled label="Loading">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
            <Text variant="body14Regular" color={colors.text.secondary}>Confirmed</Text>
            <AmountSkeleton width={72} height={20} />
          </View>
        </Labelled>
        <Labelled label="Loaded">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
            <Text variant="body14Regular" color={colors.text.secondary}>Confirmed</Text>
            <Text variant="body16SemiBold">₹1,250</Text>
          </View>
        </Labelled>
        <Labelled label="On a dark hero">
          <View style={{ alignSelf: 'stretch', padding: spacing[16], borderRadius: radius.lg, backgroundColor: colors.surface.dark }}>
            <AmountSkeleton width={140} height={36} tone="onDark" />
          </View>
        </Labelled>
      </Phone>
    </Board>
  ),
};

export const CardListShimmer: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/HomeSkeleton.tsx:136', docs: { description: { story: 'CardListSkeleton: card-tile-shaped rows, shown while a freshly picked category loads.' } } },
  render: () => (
    <Board>
      <Phone padded={false}><View style={{ paddingVertical: spacing[16] }}><CardListSkeleton count={2} /></View></Phone>
    </Board>
  ),
};

export const WholeScreen: Story = {
  tags: ['live'],
  parameters: { layout: 'fullscreen', source: 'src/organisms/HomeSkeleton.tsx:36', docs: { description: { story: 'HomeSkeleton mirrors the Home layout: masthead, search pill, filter chips, card tiles. Use one skeleton that matches the page, not a spinner.' } } },
  render: () => (
    <ComponentHarness>
      <View style={{ width: 390, height: 844, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.surface.default }}><HomeSkeleton /></View>
    </ComponentHarness>
  ),
};

export const WaitLine: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/tools/ToolResultsScreen.tsx:522', docs: { description: { story: 'For a call that can take a long time, the tools show one line that says why, above the skeleton rows. Replica, not the real screen: the real copy and Text atom, with hand-built skeleton rows (the screen keeps its row local). The real state is in Flows/4 Shared result/League table, Loading.' } } },
  render: () => (
    <Board>
      <Phone>
        <Text variant="body14Medium">Checking every card against your spends. This can take up to a minute.</Text>
        <RowSkeleton /><RowSkeleton /><RowSkeleton />
      </Phone>
    </Board>
  ),
};

export const StoreHeaderProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 2 (OffersBrandAmazon, loading)', docs: { description: { story: 'Proposed: the store page shows a bare spinner today (`src/screens/OffersBrandAmazon.tsx:362`). Skeleton blocks in the page shape: a hero and three rows. Open question: none, a visual change only.' } } },
  render: () => (
    <Board>
      <Phone>
        <Skeleton height={spacing[128]} radius="lg" />
        <Skeleton height={spacing[48]} radius="lg" /><Skeleton height={spacing[48]} radius="lg" /><Skeleton height={spacing[48]} radius="lg" />
      </Phone>
    </Board>
  ),
};

export const BenefitsProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (AllCardBenefits, loading)', docs: { description: { story: 'Proposed: All card benefits shows a bare spinner today (`src/screens/AllCardBenefitsScreen.tsx:129`). Four skeleton rows. Open question: none.' } } },
  render: () => (
    <Board>
      <Phone>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={spacing[48]} radius="lg" />)}
      </Phone>
    </Board>
  ),
};
