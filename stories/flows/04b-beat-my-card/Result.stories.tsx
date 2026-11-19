import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardResultScreen } from '../../../src/screens/tools/BeatMyCardResultScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS, TapScript, calcAllPaid, calcOthersLose, calcTie, calcWithout, e500 } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Result',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/BeatMyCardResultScreen.tsx';
const result = (cardAlias: string) => routeParams('BeatMyCardResult', { cardAlias, spends: SPENDS, answers: ANSWERS });
const screen = (cardAlias: string, a: ReturnType<typeof api.ok>) => (
  <ScreenHarness name="BeatMyCardResult" component={BeatMyCardResultScreen} params={result(cardAlias)} api={a} />
);

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

/** The main revenue branch: another card wins and the app sells it, so the result ends in "Apply now". */
export const BestWinsApplyable: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:443`,
    docs: { description: { story: 'Verdict `best_wins` with a card the app sells: the user holds HDFC Regalia Gold, the best other card is HSBC Live Plus (in the app), and the result shows "Apply now". The story drops the CRED row (not in the app) from the calculate answer, but HSBC already ranks 1 with the full fixture (net ₹11,160 a year, fee waived, against CRED at ₹11,111), so this renders the same branch as `BestWins`.' } },
  },
  render: () => screen('hdfc-regalia-gold', api.ok({ calculate: calcWithout('cred-indusind-bank-credit-card') })),
};

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:257`, docs: { description: { story: 'The calculate call never answers: the loading state with the wait line and skeletons. The real call can take up to about 90 s.' } } },
  render: () => screen('hdfc-regalia-gold', api.loading()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:277`, docs: { description: { story: '"Couldn\'t compare cards" with "Try again". The calculate call answers 500; the state shows after the call\'s one retry.' } } },
  render: () => screen('hdfc-regalia-gold', api.ok({ calculate: e500 })),
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:268`, docs: { description: { story: 'Offline at cold start with no cache: "You\'re offline" with "Try again". The query is paused, not failed.' } } },
  render: () => screen('hdfc-regalia-gold', api.offline()),
};

export const BestWinsNoApply: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:443`,
    docs: { description: { story: 'Verdict `best_wins`, but the best other card also loses money (`otherSaves` is false), so "Apply now" is hidden. The calculate answer is edited in the story: the CRED row is dropped, every row saves 0 a year, the other cards carry a ₹100 fee and the user\'s card its own larger fee, so the best other card (HSBC Live Plus, in the app) nets -₹100.' } },
  },
  render: () => screen('hdfc-regalia-gold', api.ok({ calculate: calcOthersLose('hdfc-regalia-gold') })),
};

export const FilterNoMatch: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:311`,
    docs: { description: { story: 'Every card in the answer has a joining fee. "Lifetime free" is tapped after mount, so the filter matches nothing: "No card matches these filters" with "Clear filters".' } },
  },
  render: () => (
    <>
      {screen('hdfc-regalia-gold', api.ok({ calculate: calcAllPaid() }))}
      <TapScript steps={[{ click: 'Lifetime free' }]} startMs={1800} />
    </>
  ),
};
