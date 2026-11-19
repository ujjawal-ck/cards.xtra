import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { TabPrimary } from '../../../src/molecules/TabPrimary';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Tab bar/TabPrimary',
  component: TabPrimary,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/TabPrimary.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Page tabs: a horizontal scrolling row of pill tabs with optional count badges. Wraps the Chip atom in tab mode.' } },
  },
  argTypes: {
    activeIndex: { control: { type: 'number', min: 0, max: 5 } },
  },
  args: {
    tabs: [{ label: 'All' }, { label: 'Cashback', count: 12 }, { label: 'Pending', count: 3 }, { label: 'Paid' }],
    activeIndex: 0,
  },
} satisfies Meta<typeof TabPrimary>;
export default meta;
type Story = StoryObj<typeof meta>;

const W = 390;
function Label({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, paddingHorizontal: spacing[16], paddingTop: spacing[8] }}>{children}</Text>;
}
function Live({ tabs, initial = 0 }: { tabs: { label: string; count?: number }[]; initial?: number }) {
  const [i, setI] = useState(initial);
  return <TabPrimary tabs={tabs} activeIndex={i} onChange={setI} />;
}

export const Playground: Story = {
  render: (args) => (
    <View style={{ width: W, alignSelf: 'center' }}><Live key={args.activeIndex} tabs={args.tabs} initial={args.activeIndex} /></View>
  ),
};

export const Variants: Story = {
  render: () => (
    <View style={{ width: W, alignSelf: 'center', backgroundColor: colors.surface.sunken }}>
      <Label>Without counts</Label>
      <Live tabs={[{ label: 'Credit cards' }, { label: 'Shopping' }, { label: 'Travel' }]} />
      <Label>With counts</Label>
      <Live tabs={[{ label: 'All', count: 24 }, { label: 'Confirmed', count: 18 }, { label: 'Pending', count: 6 }]} initial={1} />
      <Label>Two tabs</Label>
      <Live tabs={[{ label: 'Active' }, { label: 'Expired' }]} />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Selected and default are the only states. Ten tabs scroll sideways. A count of 0 and a count above 99 are not specified: open question for product (hide the badge at 0? cap at 99+?).' } } },
  render: () => (
    <View style={{ width: W, alignSelf: 'center', backgroundColor: colors.surface.sunken }}>
      <Label>Overflow: ten tabs scroll</Label>
      <Live tabs={['Fashion', 'Electronics', 'Beauty', 'Travel', 'Food', 'Pharmacy', 'Mobile', 'Banking', 'Loans', 'Education'].map((label) => ({ label }))} />
      <Label>Long labels</Label>
      <Live tabs={[{ label: 'HDFC Millennia Credit Card', count: 2 }, { label: 'SBI Cashback Credit Card' }]} />
      <Label>Large count</Label>
      <Live tabs={[{ label: 'Earnings', count: 100000 }, { label: 'Withdrawn' }]} />
      <Label>Selected on last tab</Label>
      <Live tabs={[{ label: 'Amazon' }, { label: 'Flipkart' }, { label: 'Myntra' }]} initial={2} />
    </View>
  ),
};
