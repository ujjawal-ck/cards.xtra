import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AdvisorResultsScreen } from '../../../src/screens/advisor/AdvisorResultsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, BK_CARDS } from '../../../storybook/fixtures';
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
const screen = (cardIds: string[]) => (
  <ScreenHarness name="AdvisorResults" component={AdvisorResultsScreen} params={routeParams('AdvisorResults', { ...base, cardIds })} api={api.ok()} />
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
