import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  Grid,
  type GridVariant,
  type FeatureItem,
  type BrandOfferItem,
  type OfferCardItem,
  type FilterTileItem,
  type TimelineStatItem,
} from '../../../src/organisms/Grid';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const VARIANTS: GridVariant[] = ['filters', 'features', 'brand-1x3', 'brand-1x2', 'cashback-timelines'];

const FEATURES: FeatureItem[] = [
  { icon: 'feat-lounge-outline', label: '12 complimentary domestic lounge visits / year' },
  { icon: 'feat-dining-outline', label: 'Up to 7% discount at partner restaurants' },
  { icon: 'feat-travel-outline', label: '4 international and 6 domestic lounge access' },
  { icon: 'feat-rewards-outline', label: '₹2,500 welcome benefit on first spend' },
  { icon: 'feat-discount-outline', label: '₹0 annual fee on ₹2,00,000+ annual spend' },
  { icon: 'feat-fuel-outline', label: '1% fuel surcharge waiver on all stations' },
];
const BRANDS_1X3: BrandOfferItem[] = [
  { logo: images.brands.amazon, badgeText: 'Up to X%', ctaLabel: 'Shop Now', onPress: noop },
  { logo: images.brands.flipkart, badgeText: 'Up to X%', ctaLabel: 'Shop Now', showTimer: true, endsAt: '23:59:59', onPress: noop },
  { logo: images.brands.myntra, badgeText: 'Extra X%', ctaLabel: 'Get Offer on Fashion', onPress: noop },
];
const OFFERS_1X2: OfferCardItem[] = [
  { image: images.stores.amazon2, ctaLabel: 'Shop Now', onPress: noop },
  { image: images.stores.myntra31, ctaLabel: 'Shop Now', onPress: noop },
  { image: images.stores.fkFashion1, ctaLabel: 'Shop Now', onPress: noop },
  { image: images.stores.jioMart12, ctaLabel: 'Shop Now', onPress: noop },
];
const FILTERS: FilterTileItem[] = [
  { image: images.filters.shopping, label: 'Shopping', selected: true },
  { image: images.filters.travel, label: 'Travel' },
  { image: images.filters.dining, label: 'Dining' },
  { image: images.filters.fuel, label: 'Fuel' },
];
const TIMELINES: TimelineStatItem[] = [
  { label: 'Cashback tracked in', metric: '30', unit: 'Minutes', onPress: noop },
  { label: 'Cashback confirmed in', metric: '90', unit: 'Days', onPress: noop },
  { label: 'Tracks app orders?', metric: 'NO', unit: 'Days', unitHidden: true, onPress: noop },
];

/** Filters is controlled by the parent: this keeps the selection so a tap toggles a tile. */
function FiltersDemo({ items }: { items: FilterTileItem[] }) {
  const [sel, setSel] = useState(items.map((i) => !!i.selected));
  return <Grid variant="filters" items={items.map((it, i) => ({ ...it, selected: sel[i] }))} onToggle={(i, next) => setSel((p) => p.map((v, k) => (k === i ? next : v)))} />;
}

interface PlaygroundArgs {
  variant: GridVariant;
  count: number;
  columns: number;
  loading: boolean;
  skeletonCount: number;
}

/** Playground wrapper: picks items for the variant from the fixtures, cycled to `count`. */
function GridPlayground({ variant, count, columns, loading, skeletonCount }: PlaygroundArgs) {
  const cycle = <T,>(src: T[]): T[] => Array.from({ length: count }, (_, i) => src[i % src.length]);
  switch (variant) {
    case 'features': return <Grid variant="features" items={cycle(FEATURES)} columns={columns} loading={loading} skeletonCount={skeletonCount} />;
    case 'brand-1x3': return <Grid variant="brand-1x3" items={cycle(BRANDS_1X3).slice(0, 3)} />;
    case 'brand-1x2': return <Grid variant="brand-1x2" items={cycle(OFFERS_1X2)} />;
    case 'filters': return <FiltersDemo key={count} items={cycle(FILTERS)} />;
    case 'cashback-timelines': return <Grid variant="cashback-timelines" items={cycle(TIMELINES)} />;
  }
}

const meta: Meta<PlaygroundArgs> = {
  title: 'Components/Grids/Grid',
  component: Grid as unknown as React.ComponentType<PlaygroundArgs>,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/Grid.tsx',
    docs: {
      description: {
        component:
          'One grid renderer with five variants chosen by variant: filters, features, brand-1x3, brand-1x2, cashback-timelines. Each variant has its own item type. The Playground controls below (count, columns, loading, skeletonCount) are story helpers that build the items from fixtures; they are not Grid props.',
      },
    },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    count: { control: { type: 'number', min: 0, max: 12, step: 1 }, description: 'Story helper: number of items. brand-1x3 shows at most 3.' },
    columns: { control: { type: 'number', min: 1, max: 3, step: 1 }, description: 'features only' },
    loading: { control: 'boolean', description: 'features only: skeleton tiles' },
    skeletonCount: { control: { type: 'number', min: 1, max: 9, step: 1 }, description: 'features only, while loading' },
  },
  args: { variant: 'features', count: 6, columns: 2, loading: false, skeletonCount: 6 },
  render: (args) => <GridPlayground {...args} />,
};
export default meta;
type Story = StoryObj<PlaygroundArgs>;

export const Playground: Story = {};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[8] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

export const Variants: Story = {
  parameters: { docs: { description: { story: 'The five variants with their fixture items. features: benefit tiles on card detail. filters: selectable image squares (tap to toggle). brand-1x3: three brand offer cards. brand-1x2: promo image cards, two per row. cashback-timelines: stat cards on the store page.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="features"><Grid variant="features" items={FEATURES} /></Block>
      <Block title="filters (tap to toggle)"><FiltersDemo items={FILTERS} /></Block>
      <Block title="brand-1x3"><Grid variant="brand-1x3" items={BRANDS_1X3} /></Block>
      <Block title="brand-1x2"><Grid variant="brand-1x2" items={OFFERS_1X2} /></Block>
      <Block title="cashback-timelines"><Grid variant="cashback-timelines" items={TIMELINES} /></Block>
    </View>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Loading exists on features only (skeleton tiles). Empty items render nothing, with no empty message. Odd counts: a trailing single tile keeps the column width. Long labels clamp inside the fixed tile height. The other variants have no loading or error mode: the screen decides what to show then.',
      },
    },
  },
  render: () => (
    <View style={{ width: 340, gap: spacing[24] }}>
      <Block title="features, loading"><Grid variant="features" loading skeletonCount={6} /></Block>
      <Block title="features, empty (renders nothing)"><Grid variant="features" items={[]} /></Block>
      <Block title="features, one item"><Grid variant="features" items={FEATURES.slice(0, 1)} /></Block>
      <Block title="features, long labels, 3 columns"><Grid variant="features" columns={3} items={[...FEATURES, { icon: 'feat-bank-outline', label: 'Zero forex markup on international spends above ₹10,00,000 a year across all merchants' }]} /></Block>
      <Block title="filters, odd count, none selected"><FiltersDemo items={FILTERS.slice(0, 3).map((f) => ({ ...f, selected: false }))} /></Block>
      <Block title="brand-1x2, odd count"><Grid variant="brand-1x2" items={OFFERS_1X2.slice(0, 3)} /></Block>
      <Block title="brand-1x3, timer shown"><Grid variant="brand-1x3" items={BRANDS_1X3.map((b) => ({ ...b, showTimer: true, endsAt: '08:15:30' }))} /></Block>
      <Block title="cashback-timelines, one item"><Grid variant="cashback-timelines" items={TIMELINES.slice(0, 1)} /></Block>
    </View>
  ),
};
