import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MissingCashbackWhereDidYouShop } from '../../../src/screens/MissingCashbackWhereDidYouShop';
import { MissingCashbackOops } from '../../../src/screens/MissingCashbackOops';
import { ScreenHarness } from '../../../storybook/harness';
import { api, reply, mcRetailersFixture } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Where did you shop',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/MissingCashbackWhereDidYouShop.tsx';
const where = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="MissingCashbackWhereDidYouShop" component={MissingCashbackWhereDidYouShop} auth="signedIn" api={a} />;

/** Stores visited in the last 30 days (Flipkart, Amazon), each with its tracking speed. Fixture: `mcRetailersFixture.default`. */
export const StoreList: Story = { tags: ['live'], parameters: { source: `${SRC}:127` }, render: () => where(api.ok()) };

/** One store per claim group (A, B1, C1, C2, D). The group sets which outcome screen the claim ends on. */
export const StoreListAllGroups: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:127`, docs: { description: { story: 'Fixture `mcRetailersFixture.allGroups`. Groups decide the outcome: see the Outcomes step.' } } },
  render: () => where(api.ok({ mcRetailers: mcRetailersFixture.allGroups })),
};

/** Tap a store: the claim starts and moves to "Choose date" (stub page here, with the draft params). */
export const StoreTapped: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:67`, docs: { description: { story: 'Reached by a tap on Flipkart. The harness shows the next route as a stub page with its params.' } } },
  render: () => where(api.ok()),
  play: async () => { await tap('Flipkart'); },
};

/** First load: bare spinner. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:99`, docs: { description: { story: 'Bare `ActivityIndicator`. ux-states.md proposes 4 `Skeleton` rows.' } } },
  render: () => where(api.loading()),
};

/** The retailer lookup failed: text "Couldn't load your retailers." with a Retry link. Wait 1 to 2 s. */
export const LookupError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:103`, docs: { description: { story: 'Inline text and link. ux-states.md proposes a `ScreenState` ("Couldn\'t load your stores", "Try again").' } } },
  render: () => where(api.ok({ mcRetailers: reply.error(500) })),
};

/** Empty retailer list on this screen (reached directly, not through the Oops route). */
export const NoStores: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:114` },
  render: () => where(api.empty()),
};

/** "Oops": no website visited through CashKaro in the last 30 days. Mail link to support. */
export const OopsNoVisits: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/MissingCashbackOops.tsx:57' },
  render: () => <ScreenHarness name="MissingCashbackOops" component={MissingCashbackOops} auth="signedIn" api={api.ok()} />,
};
