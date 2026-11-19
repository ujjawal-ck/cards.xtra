import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BeatMyCardPickScreen } from '../../../src/screens/tools/BeatMyCardPickScreen';
import { View } from 'react-native';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, calculateFixture } from '../../../storybook/fixtures';
import { ANSWERS, SPENDS, TapScript, e500 } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/4b Beat my card/Pick list',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const params = routeParams('BeatMyCardPick', { spends: SPENDS, answers: ANSWERS, fromQuiz: true });

export const Loaded: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/tools/BeatMyCardPickScreen.tsx:89',
    docs: { description: { story: 'Every card the calculate call returned, A to Z (not rank order, so the winner is not shown before the result). Search and bank chips on top.' } },
  },
  render: () => <ScreenHarness name="BeatMyCardPick" component={BeatMyCardPickScreen} params={params} api={api.ok()} />,
};

const SRC = 'src/screens/tools/BeatMyCardPickScreen.tsx';
const pick = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="BeatMyCardPick" component={BeatMyCardPickScreen} params={params} api={a} />;

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:163`, docs: { description: { story: 'The calculate call never answers: the wait line and three skeletons. This screen waits for the whole calculate call (up to about 90 s) only to list the cards the user may hold (gap G7).' } } },
  render: () => pick(api.loading()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:185`, docs: { description: { story: '"Couldn\'t load cards" with "Try again". The calculate call answers 500; the state shows after the call\'s one retry.' } } },
  render: () => pick(api.ok({ calculate: e500 })),
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:175`, docs: { description: { story: 'Offline at cold start with no cache: "You\'re offline" with "Try again". The query is paused, not failed.' } } },
  render: () => pick(api.offline()),
};

export const Empty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:195`, docs: { description: { story: 'The calculate call answers with no rows: "No cards to compare yet". The state has no action.' } } },
  render: () => pick(api.ok({ calculate: calculateFixture.empty })),
};

export const SearchNoMatch: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:268`, docs: { description: { story: '"zzz" typed into the search field after mount: "We could not find that card" with "Clear search" (`BeatMyCardPickScreen.tsx:268`). The only way out is to clear the search; there is no "my card is not here" exit (see the proposed story).' } } },
  render: () => (
    <>
      {pick(api.ok())}
      <TapScript steps={[{ type: 'zzz', into: 'Search cards' }]} startMs={1800} />
    </>
  ),
};

/** PROPOSED (gap G7, Q2). The end of the list has a way out when the user's card is not there. */
export const MyCardMissingProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: {
      description: {
        story:
          'Proposed. Today a search with no match says "Check the spelling, or pick the closest card" (`BeatMyCardPickScreen.tsx:269`); a user whose card is not listed has no way out. This adds a link at the list end. Open question Q2: what does "I can\'t find my card" do (open the full ranking with the same spends, a request form, or the closest card)? Should the list come from the card catalogue instead of the calculate call? Only the end of the list is drawn.',
      },
    },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>Last card of the list</Text>
        <Text variant="body14SemiBold" color={colors.text.link} align="center">I can't find my card</Text>
      </View>
    </PhoneFrame>
  ),
};
