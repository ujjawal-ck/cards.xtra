import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StackedBar } from '../../../src/molecules/StackedBar';
import type { StackedBarSegment } from '../../../src/molecules/StackedBar';
import { Block, Stack, inr } from '../carousels/_chrome';
import { spacing } from '../../../src/tokens';

const SERIES = ['series1', 'series2', 'series3', 'positive', 'negative', 'muted'] as const;

const earnings: StackedBarSegment[] = [
  { label: 'Confirmed', value: 8450, series: 'positive' },
  { label: 'Pending', value: 3200, series: 'series2' },
  { label: 'Cancelled', value: 750, series: 'muted' },
];

const pad = (n: React.ReactNode) => <View style={{ paddingHorizontal: spacing[16] }}>{n}</View>;

const meta = {
  title: 'Components/Charts/StackedBar',
  component: StackedBar,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
  parameters: {
    layout: 'centered',
    source: 'src/molecules/StackedBar.tsx',
    docs: { description: { component: 'One horizontal bar split into the parts of a total, with a legend row (label and rupee value) for every segment.' } },
  },
  argTypes: {
    segments: { control: 'object', description: `Items: label, value in rupees, series (${SERIES.join(', ')}).` },
    legend: { control: 'boolean' },
  },
  args: { segments: earnings, legend: true },
} satisfies Meta<typeof StackedBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Not used by any screen yet. It appears only in the DS additions gallery.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="With legend">{pad(<StackedBar segments={earnings} />)}</Block>
      <Block label="Without legend (the bar still has a screen reader label)">{pad(<StackedBar segments={earnings} legend={false} />)}</Block>
      <Block label="Every series colour">{pad(<StackedBar segments={SERIES.map((s, i) => ({ label: s, value: (i + 1) * 1000, series: s }))} />)}</Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no empty state. All values at 0 draw an empty bar with a legend of zeros.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="1 segment">{pad(<StackedBar segments={earnings.slice(0, 1)} />)}</Block>
      <Block label="Many segments (6)">{pad(<StackedBar segments={SERIES.map((s, i) => ({ label: `Segment ${i + 1}`, value: 500 + i * 300, series: s }))} />)}</Block>
      <Block label={`${inr(0)} in one segment (hidden in the bar, kept in the legend)`}>{pad(<StackedBar segments={[...earnings, { label: 'Withdrawn', value: 0, series: 'series1' }]} />)}</Block>
      <Block label={`${inr(10_00_000)} against ${inr(250)}`}>{pad(<StackedBar segments={[{ label: 'Lifetime earnings', value: 1000000, series: 'positive' }, { label: 'This month', value: 250, series: 'series2' }]} />)}</Block>
      <Block label="Long labels">{pad(<StackedBar segments={[{ label: 'Confirmed cashback from partner stores', value: 8450, series: 'positive' }, { label: 'Pending until the store confirms the order', value: 3200, series: 'series2' }]} />)}</Block>
    </Stack>
  ),
};
