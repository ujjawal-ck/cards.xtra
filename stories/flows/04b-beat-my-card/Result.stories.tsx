import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardResultScreen } from '../../../src/screens/tools/BeatMyCardResultScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS, calcTie } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Result',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BeatMyCardResultScreen.tsx';
const result = (cardAlias: string) => routeParams('BeatMyCardResult', { cardAlias, spends: SPENDS, answers: ANSWERS });

/** Verdict `best_wins`: the user's card ranks below the best other card. */
export const BestWins: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:150`,
    docs: { description: { story: 'Verdict `best_wins`. The user holds HDFC Regalia Gold, which ranks 8th in the fixture league: another card wins, shown on the podium with the line table below.' } },
  },
  render: () => <ScreenHarness name="BeatMyCardResult" component={BeatMyCardResultScreen} params={result('hdfc-regalia-gold')} api={api.ok()} />,
};

/** Verdict `mine_wins`: the user's card is rank 1. */
export const MineWins: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:150`,
    docs: { description: { story: 'Verdict `mine_wins`. The user holds the rank 1 card of the fixture league (CRED IndusInd). That card is not in the app list, so the hero has no app card art and no card page: check this on a device.' } },
  },
  render: () => <ScreenHarness name="BeatMyCardResult" component={BeatMyCardResultScreen} params={result('cred-indusind-bank-credit-card')} api={api.ok()} />,
};

/** Verdict `equal`: the gap is under 1 rupee a year. */
export const Equal: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:150`,
    docs: { description: { story: 'Verdict `equal`. The calculate answer is edited in the story so the second row copies the first: the two top cards tie, and the user holds one of them (HSBC Live Plus). The tie is a built case; no real card pair does this.' } },
  },
  render: () => (
    <ScreenHarness
      name="BeatMyCardResult"
      component={BeatMyCardResultScreen}
      params={result('hsbc-live-plus-credit-card')}
      api={api.ok({ calculate: calcTie() })}
    />
  ),
};

/** `not_found`: the card is not in the calculate list. */
export const NotFound: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:299`,
    docs: { description: { story: 'The user\'s card is not in the list the calculate call returned: "We can\'t compare this card yet", the best cards for the spends, and "Try another card".' } },
  },
  render: () => <ScreenHarness name="BeatMyCardResult" component={BeatMyCardResultScreen} params={result('card-not-in-the-list')} api={api.ok()} />,
};
