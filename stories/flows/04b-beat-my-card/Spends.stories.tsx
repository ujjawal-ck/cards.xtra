import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardSpendsScreen, resetBeatSpendsDraft } from '../../../src/screens/tools/BeatMyCardSpendsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { TapScript, e500 } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Spends',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BeatMyCardSpendsScreen.tsx';
const params = routeParams('BeatMyCardSpends', { cardAlias: 'hdfc-regalia-gold' });
// The screen keeps a module draft between pick, spends and result: start every story clean.
const spendsScreen = (a: ReturnType<typeof api.ok>) => (
  <ScreenHarness name="BeatMyCardSpends" component={BeatMyCardSpendsScreen} params={params} api={a} beforeMount={resetBeatSpendsDraft} />
);

export const Default: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:273`,
    docs: { description: { story: 'Step 2, nothing saved on the device: the picked card (HDFC Regalia Gold) with "Change", the heading "Pick where you spend", the 10 category chips (the ones the card rewards first, with a dot and the line "Your card earns here") and a disabled "See result" with "Enter at least one spend". Saved spends cannot be seeded on web, so the saved-spends entry (chips already selected) is not shown.' } },
  },
  render: () => spendsScreen(api.ok()),
};

export const CategorySelected: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:173`,
    docs: { description: { story: '"Shopping" tapped after mount: its group opens with one spend card per question (typed entry, a hint under the ruler). All values are 0, so "See result" stays disabled.' } },
  },
  render: () => (
    <>
      {spendsScreen(api.ok())}
      <TapScript steps={[{ click: 'Shopping' }]} startMs={1800} />
    </>
  ),
};

export const TypedValue: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:95`,
    docs: { description: { story: '"Shopping" selected and ₹12,000 typed into the Amazon amount: the footer reads "Based on 1 category" and "See result" is enabled.' } },
  },
  render: () => (
    <>
      {spendsScreen(api.ok())}
      <TapScript steps={[{ click: 'Shopping' }, { type: '12000', into: 'Amazon amount', blur: true }]} startMs={1800} />
    </>
  ),
};

export const FoldedGroup: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:156`,
    docs: { description: { story: 'A value in Shopping, then "Groceries" selected and a value typed there: the Shopping group folds to one line ("₹12,000 a month", Edit) while the user edits another group. A tap on the line opens it again.' } },
  },
  render: () => (
    <>
      {spendsScreen(api.ok())}
      <TapScript
        steps={[
          { click: 'Shopping' },
          { type: '12000', into: 'Amazon amount', blur: true },
          { click: 'Groceries' },
          { type: '6000', into: 'Groceries at stores amount', blur: true },
        ]}
        startMs={1800}
      />
    </>
  ),
};

export const SeeResult: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:200`,
    docs: { description: { story: '"See result" tapped with ₹12,000 in Shopping: the stub page shows the next route `BeatMyCardResult` with `cardAlias`, `spends`, `answers` and `categories: ["shopping"]`. Only the selected groups are sent.' } },
  },
  render: () => (
    <>
      {spendsScreen(api.ok())}
      <TapScript steps={[{ click: 'Shopping' }, { type: '12000', into: 'Amazon amount', blur: true }, { click: 'See result' }]} startMs={1800} />
    </>
  ),
};

export const CardListLoading: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:124`,
    docs: { description: { story: 'The screen reads the card from the list the pick screen cached (no call of its own). With the calculate call still pending, the card strip has no art and no name, the "Your card earns here" line is missing, and the chips show in default order. The screen has no loading, error or offline state of its own; this is what a cold open shows (for example after a deep link or a reload). Open question: should the strip wait for the card, or fall back to the card name from the route?' } },
  },
  render: () => spendsScreen(api.loading()),
};

export const CardListError: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:124`,
    docs: { description: { story: 'The calculate call answers 500 (after the app\'s retries, 1 to 2 s): same view as the loading case, with no card name. The user can still enter spends and see the result, which then shows its own error state.' } },
  },
  render: () => spendsScreen(api.ok({ calculate: e500 })),
};
