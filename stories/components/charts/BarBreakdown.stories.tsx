import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BarBreakdown } from '../../../src/molecules/BarBreakdown';
import type { BarBreakdownItem } from '../../../src/molecules/BarBreakdown';
import { Block, Stack, inr } from '../carousels/_chrome';
import { spacing } from '../../../src/tokens';

const spends: BarBreakdownItem[] = [
  { label: 'Online shopping', value: 42500, icon: 'cart-outline' },
  { label: 'Dining', value: 18200, icon: 'feat-dining-outline' },
  { label: 'Fuel', value: 12750, icon: 'feat-fuel-outline' },
  { label: 'Travel', value: 9400, icon: 'feat-travel-outline' },
  { label: 'Bills', value: 6100, icon: 'feat-mobile-recharge-outline' },
];

const pad = (n: React.ReactNode) => <View style={{ paddingHorizontal: spacing[16] }}>{n}</View>;

const meta = {
  title: 'Components/Charts/BarBreakdown',
  component: BarBreakdown,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
  parameters: {
    layout: 'centered',
    source: 'src/molecules/BarBreakdown.tsx',
    docs: { description: { component: 'Ranked horizontal bars, one for each item, each with its label and rupee value written out.' } },
  },
  argTypes: {
    items: { control: 'object', description: 'Items: label, value in rupees, optional icon and note.' },
    max: { control: 'number', description: 'Value that fills a whole bar. Default: the largest value.' },
    sort: { control: 'inline-radio', options: ['desc', 'none'] },
    showTotal: { control: 'boolean' },
  },
  args: { items: spends, sort: 'desc', showTotal: false },
} satisfies Meta<typeof BarBreakdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Not used by any screen yet. It appears only in the DS additions gallery.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="Sorted, with total (default order is desc)">{pad(<BarBreakdown items={spends} showTotal />)}</Block>
      <Block label="sort: none (input order kept)">{pad(<BarBreakdown items={[...spends].reverse()} sort="none" />)}</Block>
      <Block label="With icons and notes">{pad(<BarBreakdown items={spends.slice(0, 3).map((s, i) => ({ ...s, note: ['Amazon and Flipkart', '12 orders', 'Two cards'][i] }))} />)}</Block>
      <Block label="max set to 1,00,000 (bars shorter than the largest value)">{pad(<BarBreakdown items={spends} max={100000} />)}</Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: there is no loading, empty or error state. An empty list renders nothing, not even a message.' } } },
  render: () => (
    <Stack width={360}>
      <Block label="1 item">{pad(<BarBreakdown items={spends.slice(0, 1)} showTotal />)}</Block>
      <Block label="Many items (10)">{pad(<BarBreakdown items={[...spends, ...spends.map((s) => ({ ...s, label: s.label + ' 2', value: Math.round(s.value / 3) }))]} />)}</Block>
      <Block label={`${inr(0)} everywhere (zero-width bars)`}>{pad(<BarBreakdown items={spends.map((s) => ({ ...s, value: 0 }))} showTotal />)}</Block>
      <Block label={`${inr(10_00_000)} and ${inr(0)} (Indian grouping)`}>{pad(<BarBreakdown items={[{ label: 'Annual spends', value: 1000000 }, { label: 'Not started', value: 0 }]} showTotal />)}</Block>
      <Block label="Long label and note">{pad(<BarBreakdown items={[{ label: 'Online shopping on Amazon, Flipkart, Myntra and other partner stores', value: 42500, note: 'Includes orders still waiting for the store to confirm them' }]} />)}</Block>
    </Stack>
  ),
};
