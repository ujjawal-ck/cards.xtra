import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SavingsBreakdownSheet, type SavingsBreakdownSheetHandle } from '../../../src/organisms/SavingsBreakdownSheet';
import { SheetHarness } from '../../../storybook/harness';
import { totalYearlySpend } from '../../../src/lib/cardTools';
import { ROW_IN_APP, ROW_NOT_IN_APP, SPENDS } from './_shared';

const meta: Meta = {
  title: 'Flows/4 Shared result/Savings breakdown sheet',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/organisms/SavingsBreakdownSheet.tsx';
const yearly = totalYearlySpend(SPENDS);

export const SellableCard: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:266`,
    docs: { description: { story: 'A row that joins an app card (HSBC Live+): the sum box, "Where the savings come from" with the Yearly / Monthly toggle, the CashKaro Rewards line, "View card details" and the sticky "Apply now". The Apply tap would start a click-out; it is not wired here.' } },
  },
  render: () => (
    <SheetHarness<SavingsBreakdownSheetHandle> open={(r) => r.present(ROW_IN_APP)}>
      {(ref) => <SavingsBreakdownSheet ref={ref} yearlySpend={yearly} onViewCard={() => console.log('[storybook] view card')} onApply={() => console.log('[storybook] apply')} />}
    </SheetHarness>
  ),
};

export const CardNotInApp: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:382`,
    docs: { description: { story: 'A row with no app card (CRED IndusInd, rank 1 in the fixture league): the same sum, then "You cannot apply for this card in this app." and no actions. Risk R7: the top row can be a card the user cannot get.' } },
  },
  render: () => (
    <SheetHarness<SavingsBreakdownSheetHandle> open={(r) => r.present(ROW_NOT_IN_APP)}>
      {(ref) => <SavingsBreakdownSheet ref={ref} yearlySpend={yearly} onViewCard={() => undefined} onApply={() => undefined} />}
    </SheetHarness>
  ),
};

export const UsersOwnCard: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:144`,
    docs: { description: { story: 'Opened from the Beat my card ranking with `hideApply`: the user\'s own card has the breakdown but no "View card details" and no "Apply now" (the card page has its own Apply).' } },
  },
  render: () => (
    <SheetHarness<SavingsBreakdownSheetHandle> open={(r) => r.present(ROW_IN_APP)}>
      {(ref) => <SavingsBreakdownSheet ref={ref} yearlySpend={yearly} hideApply onViewCard={() => undefined} onApply={() => undefined} />}
    </SheetHarness>
  ),
};
