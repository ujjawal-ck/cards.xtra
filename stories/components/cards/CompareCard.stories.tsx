import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { CompareCard, type CompareCardStat } from '../../../src/molecules/CompareCard';
import { Frame, Label, SAMPLE_CARDS, short } from './_shared';

const stats: [CompareCardStat, CompareCardStat] = [
  { label: 'Annual fee', value: '₹999', delta: '₹1,501 less', direction: 'down', sentiment: 'good' },
  { label: 'Yearly rewards', value: '₹7,200', delta: '₹600 more', direction: 'up', sentiment: 'good' },
];
const c = SAMPLE_CARDS[2];
const base = {
  cardImage: c.cardImage,
  name: short(c),
  sourceName: 'HDFC Regalia Gold',
  bandTone: 'success' as const,
  bandIcon: 'feat-savings-outline' as const,
  bandText: 'less a year',
  bandAmount: '₹1,180',
  stats,
  eligible: false,
  viewed: false,
  onPress: () => {},
};

const meta = {
  title: 'Components/Cards/CompareCard',
  component: CompareCard,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><View style={{ alignSelf: 'flex-start' }}><Story /></View></Frame>],
  parameters: {
    source: 'src/molecules/CompareCard.tsx',
    docs: { description: { component: 'A card in a "compare with another card" rail: GainBand, art and name, two stat rows with a delta, and View card. 236 wide, so a 360 phone shows one card and a peek of the next.' } },
  },
  argTypes: {
    bandTone: { control: 'select', options: ['success', 'brand', 'info', 'purple', 'gray'] },
    bandIcon: { control: 'select', options: ['feat-savings-outline', 'feat-rewards-outline', 'feat-discount-outline', 'check-circle-outline'] },
    bandText: { control: 'text' },
    bandAmount: { control: 'text' },
    name: { control: 'text' },
    sourceName: { control: 'text' },
    eligible: { control: 'boolean' },
    viewed: { control: 'boolean' },
    stats: { control: 'object' },
    cardImage: { control: false },
    onPress: { control: false },
    style: { control: false },
  },
  args: base,
} satisfies Meta<typeof CompareCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>default</Label>
      <CompareCard {...base} />
      <Label>eligible: adds "You can get this card"</Label>
      <CompareCard {...base} eligible />
      <Label>viewed: gray band, full opacity</Label>
      <CompareCard {...base} viewed />
      <Label>no band amount</Label>
      <CompareCard {...base} bandTone="info" bandIcon="feat-rewards-outline" bandAmount={undefined} bandText="Better rewards on dining" />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A delta of "Same" shows no arrow. Values are never cut, so a long value wraps. The long caption in the band ends with an ellipsis on web (the native shrink does not run).',
      },
    },
  },
  render: () => (
    <>
      <Label>delta "Same"</Label>
      <CompareCard
        {...base}
        bandTone="gray"
        bandAmount="₹0"
        bandText="no change a year"
        stats={[
          { label: 'Annual fee', value: '₹999', delta: 'Same', direction: 'same', sentiment: 'neutral' },
          { label: 'Yearly rewards', value: '₹0', delta: 'Same', direction: 'same', sentiment: 'neutral' },
        ]}
      />
      <Label>worse on both lines (bad sentiment), ₹10,00,000</Label>
      <CompareCard
        {...base}
        bandTone="purple"
        stats={[
          { label: 'Annual fee', value: `₹${(1000000).toLocaleString('en-IN')}`, delta: '₹9,99,001 more', direction: 'up', sentiment: 'bad' },
          { label: 'Yearly rewards', value: '₹1,200', delta: '₹6,000 less', direction: 'down', sentiment: 'bad' },
        ]}
      />
      <Label>long name and long band caption</Label>
      <CompareCard
        {...base}
        name="Axis Bank Magnus for Burgundy Private The One Metal Edition"
        bandText="less a year on fees, fuel, dining, travel and shopping together"
        eligible
      />
    </>
  ),
};
