import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AdvisorResultsScreen } from '../../../src/screens/advisor/AdvisorResultsScreen';
import { View } from 'react-native';
import { ScreenState } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, BK_CARDS, reply } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/5 Card advisor/Results',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/advisor/AdvisorResultsScreen.tsx';
/** The active fixture cards, as the advisor would send them ("See all N cards"): CardModel ids are strings. */
const IDS = BK_CARDS.filter((c) => c.status).map((c) => String(c.id));
const base = { header: 'Cards that fit your answers', chips: ['Daily spends', 'Food', 'Any fee'], proof: 'none' as const };
const screen = (cardIds: string[], a: ReturnType<typeof api.ok> = api.ok()) => (
  <ScreenHarness name="AdvisorResults" component={AdvisorResultsScreen} params={routeParams('AdvisorResults', { ...base, cardIds })} api={a} />
);

export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:92`, docs: { description: { story: 'The full list after "See all N cards": header, answer chips (no income, no pincode), the cards in the advisor\'s rank order, sort chips and "Free cards only".' } } },
  render: () => screen(IDS),
};

export const Sorted: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:118`, docs: { description: { story: '"Lowest fee" tapped after mount: the cards re-sort by annual fee, cheapest first.' } } },
  render: () => (
    <>
      {screen(IDS)}
      <TapScript steps={[{ click: 'Lowest fee' }]} />
    </>
  ),
};

export const FreeOnly: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:129`, docs: { description: { story: '"Free cards only" tapped after mount: only cards with no joining fee and no annual fee stay (the chip shows only when the list has both free and paid cards).' } } },
  render: () => (
    <>
      {screen(IDS)}
      <TapScript steps={[{ click: 'Free cards only' }]} />
    </>
  ),
};

export const NoCards: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:162`, docs: { description: { story: 'None of the card ids is in the catalogue (the list changed since the chat): "No cards to show".' } } },
  render: () => screen(['0']),
};

// ── Edge cases and loaders ───────────────────────────────────────────────────

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:145`, docs: { description: { story: 'The card catalogue never answers: the card list skeleton.' } } },
  render: () => screen(IDS, api.loading()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:152`, docs: { description: { story: 'The card catalogue answers 500: the error state with "Try again". Shows after the call\'s retries (a few seconds).' } } },
  render: () => screen(IDS, api.ok({ cards: reply.error(500) })),
};

export const OfflineShowsNoCards: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:162`, docs: { description: { story: 'App bug (gap G5). Offline at cold start the paused query falls through to "No cards to show. Go back and change an answer.": wrong advice for a connection problem.' } } },
  render: () => screen(IDS, api.offline()),
};

export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Proposed (gap G5). The standard offline state, not "No cards to show". Needs the shared "paused with no data" check (engineering). The header above is not drawn.' } } },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ paddingTop: spacing[48] }}>
        <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" onAction={() => undefined} />
      </View>
    </PhoneFrame>
  ),
};
