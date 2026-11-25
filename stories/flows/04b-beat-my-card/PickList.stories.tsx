import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardPickScreen } from '../../../src/screens/tools/BeatMyCardPickScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api, calculateFixture } from '../../../storybook/fixtures';
import { TapScript, e500 } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Pick list',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BeatMyCardPickScreen.tsx:318',
    docs: { description: { story: 'Every card the calculate call returned, A to Z (not rank order, so the winner is not shown before the result). Search and bank chips on top.' } },
  },
  render: () => <ScreenHarness name="BeatMyCardPick" component={BeatMyCardPickScreen} api={api.ok()} />,
};

const SRC = 'src/screens/tools/BeatMyCardPickScreen.tsx';
const pick = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="BeatMyCardPick" component={BeatMyCardPickScreen} api={a} />;

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:280`, docs: { description: { story: 'The calculate call never answers: the wait line and three skeletons. This screen waits for the whole calculate call (up to about 90 s) only to list the cards the user may hold (gap G7).' } } },
  render: () => pick(api.loading()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:302`, docs: { description: { story: '"Couldn\'t load cards" with "Try again". The calculate call answers 500; the state shows after the call\'s one retry.' } } },
  render: () => pick(api.ok({ calculate: e500 })),
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:292`, docs: { description: { story: 'Offline at cold start with no cache: "You\'re offline" with "Try again". The query is paused, not failed.' } } },
  render: () => pick(api.offline()),
};

export const Empty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:312`, docs: { description: { story: 'The calculate call answers with no rows: "No cards to compare yet". The state has no action.' } } },
  render: () => pick(api.ok({ calculate: calculateFixture.empty })),
};

export const SearchNoMatch: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:363`, docs: { description: { story: '"zzz" typed into the search field after mount: "We could not find that card" with "Clear search" (`BeatMyCardPickScreen.tsx:363`). "Can\'t find your card? Tell us" stays visible under the list.' } } },
  render: () => (
    <>
      {pick(api.ok())}
      <TapScript steps={[{ type: 'zzz', into: 'Search cards' }]} startMs={1800} />
    </>
  ),
};

export const PickedCard: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:247`,
    docs: { description: { story: 'The user taps a card after mount: the radio is selected and "Use this card" appears under the list. That button opens the spends step for this card (`BeatMyCardSpends { cardAlias }`).' } },
  },
  render: () => (
    <>
      {pick(api.ok())}
      <TapScript steps={[{ click: 'HDFC Regalia Gold', prefix: true }]} startMs={1800} />
    </>
  ),
};

export const CardRequestSheet: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:398`,
    docs: { description: { story: '"Can\'t find your card? Tell us" sits under the list (it stays when a search finds nothing). It opens the "Tell us your card" sheet: one field and Send. Send shows the toast "Thanks. We got your card name." and logs the request event; nothing is sent in Storybook. Open question: who reads these requests, and does the list later come from the card catalogue instead of the calculate call?' } },
  },
  render: () => (
    <>
      {pick(api.ok())}
      <TapScript steps={[{ click: "Can't find your card? Tell us" }]} startMs={1800} />
    </>
  ),
};
