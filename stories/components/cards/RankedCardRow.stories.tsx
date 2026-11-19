import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { RankedCardRow } from '../../../src/molecules/RankedCardRow';
import { Frame, Label, SAMPLE_CARDS, short } from './_shared';

const c = SAMPLE_CARDS[0];
const base = {
  rank: 1,
  cardImage: c.cardImage,
  name: short(c),
  headline: { label: 'Net value', amount: 10800, period: 'year' as const },
  reason: 'Highest return on your Amazon and food delivery spends.',
  eligibility: 'eligible' as const,
  onPress: () => {},
  onApply: () => {},
};

/** Local state so the Compare checkbox toggles. */
function WithCompare(props: React.ComponentProps<typeof RankedCardRow>) {
  const [selected, setSelected] = useState(false);
  return <RankedCardRow {...props} compare={{ selected, onToggle: setSelected }} />;
}

const meta = {
  title: 'Components/Cards/RankedCardRow',
  component: RankedCardRow,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/RankedCardRow.tsx',
    docs: { description: { component: 'One row of a ranked card result: rank, art, name, one headline rupee value, a reason, an eligibility line and actions. The compact sibling of the Home tile.' } },
  },
  argTypes: {
    rank: { control: { type: 'number', min: 1, max: 99 } },
    name: { control: 'text' },
    headline: { control: 'object' },
    reason: { control: 'text' },
    eligibility: { control: 'select', options: ['eligible', 'maybe', 'unknown'] },
    compare: { control: false },
    cardImage: { control: false },
    onPress: { control: false },
    onApply: { control: false },
  },
  args: base,
} satisfies Meta<typeof RankedCardRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      {(['eligible', 'maybe', 'unknown'] as const).map((e, i) => (
        <React.Fragment key={e}>
          <Label>{`eligibility="${e}"`}</Label>
          <RankedCardRow {...base} rank={i + 1} cardImage={SAMPLE_CARDS[i].cardImage} name={short(SAMPLE_CARDS[i])} eligibility={e} />
        </React.Fragment>
      ))}
      <Label>with Compare checkbox (tap it)</Label>
      <WithCompare {...base} rank={4} />
      <Label>headline period "month"</Label>
      <RankedCardRow {...base} rank={5} headline={{ label: 'Net value', amount: 900, period: 'month' }} />
      <Label>no Apply button</Label>
      <RankedCardRow {...base} rank={6} onApply={undefined} />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The headline amount is a number the screen computed. This part does not decide the net-value rule. Bug seen: eligibility "maybe" uses the same check-circle icon as "eligible", only the colour and the words differ.',
      },
    },
  },
  render: () => (
    <>
      <Label>amount ₹0, no reason, no actions</Label>
      <RankedCardRow {...base} rank={7} headline={{ label: 'Net value', amount: 0 }} reason={undefined} eligibility="unknown" onApply={undefined} />
      <Label>amount ₹10,00,000, rank 12</Label>
      <RankedCardRow {...base} rank={12} headline={{ label: 'Net value', amount: 1000000, period: 'year' }} />
      <Label>negative amount</Label>
      <RankedCardRow {...base} rank={8} headline={{ label: 'Net value', amount: -3800, period: 'year' }} eligibility="maybe" />
      <Label>long name and long reason</Label>
      <RankedCardRow
        {...base}
        rank={3}
        name="Axis Bank Magnus for Burgundy Private The One Metal Edition Credit Card"
        reason="Highest return on your Amazon, Flipkart, food delivery, fuel, flights and hotel spends, with the annual fee waived above the yearly spend you entered earlier."
      />
    </>
  ),
};
