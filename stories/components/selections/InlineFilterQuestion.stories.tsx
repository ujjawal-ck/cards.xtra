import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { InlineFilterQuestion } from '../../../src/molecules/InlineFilterQuestion';
import type { InlineRow, InlineChip } from '../../../src/lib/inlineFilters';
import { Group, Stack } from './_kit';

const FEE_ROW: InlineRow = {
  kind: 'question', id: 'fee', title: 'What annual fee are you comfortable with?', answered: false,
  chips: [
    { key: 'free', label: 'Lifetime free', selected: false, count: 14 },
    { key: 'u1k', label: 'Under ₹1,000', selected: false, count: 22 },
    { key: 'u5k', label: 'Up to ₹5,000', selected: false, count: 31 },
    { key: 'any', label: 'Any', selected: false, count: 36 },
  ],
};

/** Taps move the selection like the Home screen does: one answer, shown with its count. */
function Live({ row }: { row: InlineRow }) {
  const [cur, setCur] = useState(row);
  const onChipPress = (chip: InlineChip) => {
    if (chip.action) return;
    setCur((r) => ({ ...r, answered: !chip.selected, chips: r.chips.map((c) => ({ ...c, selected: c.key === chip.key ? !c.selected : false })) }));
  };
  return <InlineFilterQuestion row={cur} onChipPress={onChipPress} />;
}

const meta = {
  title: 'Components/Selections/InlineFilterQuestion',
  component: InlineFilterQuestion,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/InlineFilterQuestion.tsx',
    docs: { description: { component: 'One filter question placed between Home card tiles: a title and wrapping answer chips. A flat tinted panel so it does not read as a card.' } },
  },
  args: { row: FEE_ROW, onChipPress: () => {} },
  render: (args) => <Stack><Live row={args.row} /></Stack>,
} satisfies Meta<typeof InlineFilterQuestion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="fee question"><Live row={FEE_ROW} /></Group>
      <Group label="first card question">
        <Live row={{ kind: 'question', id: 'firstCard', title: 'Is this your first credit card?', answered: false, chips: [
          { key: 'yes', label: 'Yes, first card', selected: false, count: 18 },
          { key: 'no', label: 'I have one already', selected: false, count: 36 },
        ] }} />
      </Group>
      <Group label="eligibility question with an action chip">
        <Live row={{ kind: 'question', id: 'eligibility', title: 'See only cards you can get?', answered: false, chips: [
          { key: 'check', label: 'Check which cards I can get', selected: false, action: 'eligibility' },
          { key: 'skip', label: 'Not now', selected: false },
        ] }} />
      </Group>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <Group label="one answer selected (count shown on the chip)">
        <Live row={{ ...FEE_ROW, answered: true, chips: FEE_ROW.chips.map((c) => ({ ...c, selected: c.key === 'u1k' })) }} />
      </Group>
      <Group label="chip without a count"><Live row={{ ...FEE_ROW, chips: FEE_ROW.chips.map(({ count, ...c }) => c) }} /></Group>
      <Group label="long title and many chips">
        <Live row={{ kind: 'question', id: 'fee', title: 'Which annual fee range works for you if the card gives lounge access and fuel savings?', answered: false, chips: [
          ...FEE_ROW.chips,
          { key: 'u10k', label: 'Up to ₹10,000', selected: false, count: 36 },
          { key: 'u1l', label: 'Up to ₹1,00,000 for premium cards', selected: false, count: 36 },
        ] }} />
      </Group>
    </Stack>
  ),
};
