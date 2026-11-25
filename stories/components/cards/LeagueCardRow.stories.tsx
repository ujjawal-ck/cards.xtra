import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LeagueCardRow } from '../../../src/molecules/LeagueCardRow';
import { topByKey } from '../../../src/lib/leagueView';
import { Frame, Label, COLUMNS, ROWS, row, S_BIG, S_ZERO, S_NOT_IN_APP, S_MAGNUS } from './_shared';

const keys = COLUMNS.map((c) => c.key as string);
const tops = topByKey(ROWS.map((r) => r.savings), keys);
const base = {
  row: ROWS[0],
  rank: 1,
  view: 'quick' as const,
  columns: COLUMNS,
  tops,
  searchHit: false,
  mine: false,
  onPress: () => {},
  onApply: () => {},
};

const meta = {
  title: 'Components/Cards/LeagueCardRow',
  component: LeagueCardRow,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/LeagueCardRow.tsx',
    docs: { description: { component: 'One row of the league table (tools results): rank, art, name, bank, labels, the headline "Annual savings", and the sum that adds up to it. Two views: quick (the sum in one line) and category (one cell per spend).' } },
  },
  argTypes: {
    view: { control: 'select', options: ['quick', 'category'] },
    rank: { control: { type: 'number', min: 1, max: 99 } },
    searchHit: { control: 'boolean' },
    mine: { control: 'boolean' },
    row: { control: false },
    columns: { control: false },
    tops: { control: false },
    onPress: { control: false },
    onApply: { control: false },
  },
  args: base,
} satisfies Meta<typeof LeagueCardRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Label>view="quick": Savings + Milestones - Annual fee = Annual savings</Label>
      <LeagueCardRow {...base} row={ROWS[0]} rank={1} />
      <Label>view="quick", fee waived at the user's spend (₹0 plus the tag), with CashKaro reward</Label>
      <LeagueCardRow {...base} row={ROWS[1]} rank={2} />
      <Label>view="quick", with a Lounge cell</Label>
      <LeagueCardRow {...base} row={ROWS[3]} rank={4} />
      <Label>view="category": one cell per column, "Top" on the best value of each</Label>
      <LeagueCardRow {...base} view="category" row={ROWS[0]} rank={1} />
      <Label>view="category", lifetime free card</Label>
      <LeagueCardRow {...base} view="category" row={ROWS[2]} rank={3} />
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Mine: tinted and labelled "Your card". Search hit: heavy focus border. A row with no app card (not in the app) has no Apply and an empty art box, because the remote image is not loaded here. Savings, fees and ranks in this file are made up for the story. Open question for product: a card that loses money (negative annual savings) is shown in the normal text colour, not red.',
      },
    },
  },
  render: () => (
    <>
      <Label>mine</Label>
      <LeagueCardRow {...base} row={ROWS[1]} rank={2} mine />
      <Label>search hit</Label>
      <LeagueCardRow {...base} row={ROWS[2]} rank={3} searchHit />
      <Label>not in the app (no Apply, negative annual savings)</Label>
      <LeagueCardRow {...base} row={row(5, S_NOT_IN_APP)} rank={5} />
      <Label>discontinued and invite only, big fee</Label>
      <LeagueCardRow {...base} row={row(4, S_MAGNUS, 'axis-magnus')} rank={4} view="category" />
      <Label>annual savings ₹0</Label>
      <LeagueCardRow {...base} row={row(9, S_ZERO, 'icici-coral')} rank={9} />
      <Label>annual savings ₹10,00,000, long name</Label>
      <LeagueCardRow {...base} row={row(1, S_BIG)} rank={1} />
      <Label>rank 100</Label>
      <LeagueCardRow {...base} row={ROWS[0]} rank={100} />
    </>
  ),
};
