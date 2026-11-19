import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { TabsSecondary } from '../../../src/molecules/TabsSecondary';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Tab bar/TabsSecondary',
  component: TabsSecondary,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/TabsSecondary.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Segment control: a pale-cobalt track with a white thumb that slides under the active segment. Equal-width segments, 2 to 4 recommended.' } },
  },
  argTypes: {
    activeIndex: { control: { type: 'number', min: 0, max: 3 } },
  },
  args: {
    segments: [{ label: 'Cashback' }, { label: 'Rewards' }],
    activeIndex: 0,
  },
} satisfies Meta<typeof TabsSecondary>;
export default meta;
type Story = StoryObj<typeof meta>;

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, marginTop: spacing[16], marginBottom: spacing[4] }}>{children}</Text>;
}
function Live({ segments, initial = 0 }: { segments: { label: string; icon?: any }[]; initial?: number }) {
  const [i, setI] = useState(initial);
  return <TabsSecondary segments={segments} activeIndex={i} onChange={setI} />;
}
const Frame = ({ children }: { children: React.ReactNode }) => <View style={{ width: 390, alignSelf: 'center', padding: spacing[16] }}>{children}</View>;

export const Playground: Story = {
  render: (args) => <Frame><Live key={args.activeIndex} segments={args.segments} initial={args.activeIndex} /></Frame>,
};

export const Variants: Story = {
  render: () => (
    <Frame>
      <Label>Two segments</Label>
      <Live segments={[{ label: 'Cashback' }, { label: 'Rewards' }]} />
      <Label>Three segments</Label>
      <Live segments={[{ label: 'Month' }, { label: 'Quarter' }, { label: 'Year' }]} initial={1} />
      <Label>Four segments</Label>
      <Live segments={[{ label: 'All' }, { label: 'Pending' }, { label: 'Paid' }, { label: 'Expired' }]} initial={2} />
      <Label>With leading icon (shown on the active segment only)</Label>
      <Live segments={[{ label: 'Filters', icon: 'filter-outline' }, { label: 'History', icon: 'clock-outline' }]} />
    </Frame>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Active and inactive are the only states. There is no disabled state. Long labels are not truncated by the component: check on a 320 dp width before shipping a segment with more than about 12 characters. The thumb width comes from onLayout, so the first frame can show the thumb at 0 for one tick.' } } },
  render: () => (
    <Frame>
      <Label>Long labels</Label>
      <Live segments={[{ label: 'HDFC Millennia' }, { label: 'SBI Cashback' }]} />
      <Label>Rupee amounts in labels</Label>
      <Live segments={[{ label: '₹1,00,000' }, { label: '₹25,000' }, { label: '₹5,000' }]} />
      <Label>Last segment active</Label>
      <Live segments={[{ label: 'Amazon' }, { label: 'Flipkart' }, { label: 'Myntra' }]} initial={2} />
    </Frame>
  ),
};
