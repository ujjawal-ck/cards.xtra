import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PodiumCompare } from '../../../src/molecules/PodiumCompare';
import type { PodiumEntry } from '../../../src/molecules/PodiumCompare';
import { Block, Stack, inr } from '../carousels/_chrome';
import { images } from '../../../src/assets/images';
import { spacing } from '../../../src/tokens';

const mine: PodiumEntry = { name: 'SBI Cashback', image: images.cards.sbiCashback, value: 14200 };
const best: PodiumEntry = { name: 'HDFC Swiggy', image: images.cards.hdfcSwiggy, value: 18600 };

const pad = (n: React.ReactNode) => <View style={{ paddingHorizontal: spacing[16] }}>{n}</View>;

const meta = {
  title: 'Components/Charts/PodiumCompare',
  component: PodiumCompare,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
  parameters: {
    layout: 'centered',
    source: 'src/molecules/PodiumCompare.tsx',
    docs: { description: { component: 'Two cards on podium bars with a rupee value above each; the winner bar is green and says "Best". Used on the Beat my card result.' } },
  },
  argTypes: {
    title: { control: 'text', description: 'Heading, for example the store name.' },
    contextLabel: { control: 'text', description: 'Context chip, for example "₹40,000 spends".' },
    onContextPress: { control: false, description: 'When set, the context label is a link with an edit icon.' },
    a: { control: 'object' },
    b: { control: 'object' },
  },
  args: { title: 'Yearly savings on Amazon', contextLabel: `${inr(40000)} spends`, a: mine, b: best, onContextPress: () => {} },
} satisfies Meta<typeof PodiumCompare>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack width={360}>
      <Block label="B wins">{pad(<PodiumCompare title="Yearly savings on Amazon" contextLabel={`${inr(40000)} spends`} onContextPress={() => {}} a={mine} b={best} />)}</Block>
      <Block label="A wins">{pad(<PodiumCompare title="Yearly savings on Amazon" contextLabel={`${inr(40000)} spends`} a={{ ...mine, value: 21000 }} b={{ ...best, value: 9800 }} />)}</Block>
      <Block label="Equal (no winner, both bars neutral)">{pad(<PodiumCompare title="Yearly savings on Myntra" contextLabel={`${inr(25000)} spends`} a={{ ...mine, value: 5000 }} b={{ ...best, value: 5000 }} />)}</Block>
      <Block label="No context label">{pad(<PodiumCompare title="Yearly savings on Flipkart" a={mine} b={best} />)}</Block>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Open question: a result of 0 against 0 shows two flat bars and no winner, with no message that neither card earns here.' } } },
  render: () => (
    <Stack width={360}>
      <Block label={`Both ${inr(0)} (no winner)`}>{pad(<PodiumCompare title="Yearly savings on Ajio" contextLabel={`${inr(0)} spends`} a={{ ...mine, value: 0 }} b={{ ...best, value: 0 }} />)}</Block>
      <Block label={`${inr(0)} against ${inr(10_00_000)} (minimum bar height)`}>{pad(<PodiumCompare title="Yearly savings" a={{ ...mine, value: 0 }} b={{ ...best, value: 1000000 }} />)}</Block>
      <Block label="Long title and long names">{pad(<PodiumCompare title="Yearly savings on Amazon Pay and other partner stores" contextLabel={`${inr(1000000)} spends`} onContextPress={() => {}} a={{ ...mine, name: 'Axis Bank Burgundy Private The One Card', image: images.cards.axisBurgundyPrivateTheOneCard }} b={best} />)}</Block>
    </Stack>
  ),
};
