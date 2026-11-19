import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MissingCashbackDidYouShop } from '../../../src/screens/MissingCashbackDidYouShop';
import { MissingCashbackTicketListClosed } from '../../../src/screens/MissingCashbackTicketListClosed';
import { MissingCashbackTicketListTracked } from '../../../src/screens/MissingCashbackTicketListTracked';
import { MissingCashbackTicketStatusReview } from '../../../src/screens/MissingCashbackTicketStatusReview';
import { MissingCashbackTrack } from '../../../src/screens/MissingCashbackTrack';
import { ScreenHarness } from '../../../storybook/harness';
import { api, mcQueueFixture, clone } from '../../../storybook/fixtures';
import { tap } from './_dom';

const meta: Meta = {
  title: 'Flows/8 Orders and missing cashback/Claims list',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/MissingCashbackDidYouShop.tsx';

const list = (answers: Parameters<typeof api.ok>[0] = {}, base: typeof api.ok = api.ok) => (
  <ScreenHarness name="MissingCashbackDidYouShop" component={MissingCashbackDidYouShop} auth="signedIn" params={{ backTo: 'back' }} api={base(answers)} />
);

/** In Review tab (default): a B1 claim that needs details, plus claims being tracked. Fixture: `mcQueueFixture.byStatus`. */
export const InReview: Story = { tags: ['live'], parameters: { source: `${SRC}:226` }, render: () => list() };

/** Closed tab: one tracked claim ("View Details") and one not-tracked claim with a reason. A play function taps "Closed". */
export const Closed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:226`, docs: { description: { story: 'Reached by a tap on the Closed tab. Tab labels carry counts from the In Review response meta.' } } },
  render: () => list(),
  play: async () => { await tap(/^Closed/); },
};

/** Others tab: raised tickets as flat rows with a View link. */
export const Others: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:219`, docs: { description: { story: 'Reached by a tap on the Others tab.' } } },
  render: () => list(),
  play: async () => { await tap(/^Others/); },
};

/** Others tab, View tapped: the ticket summary sheet. */
export const OthersSummarySheet: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:218`, docs: { description: { story: 'Reached by taps: Others, then View.' } } },
  render: () => list(),
  play: async () => { await tap(/^Others/); await tap('View'); },
};

/** R13: a claim that was not tracked shows the retailer reason, or a generic line that sends the user to Get Help. */
export const NotTrackedWithReason: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/api/missingCashbackMapper.ts:375',
    docs: { description: { story: 'R13. Closed tab with one not-tracked claim and no comment from the backend, so the generic reason shows: "raise a ticket from Get Help". Get Help\'s Missing Cashback topic restarts the same intake. Open question: link the reason to a ticket for this order.' } },
  },
  render: () => {
    const resolved = clone(mcQueueFixture.resolved);
    const row = resolved.data.find((r) => r.id === 98);
    if (row) resolved.data = [{ ...row, attributes: { ...row.attributes, details: 'Waiting for retailer', comments: null } }];
    return list({ mcQueue: (req) => (req.query.get('filter[status]') === 'Resolved' ? resolved : mcQueueFixture.pending) });
  },
  play: async () => { await tap(/^Closed/); },
};

/** Nothing under review. The Closed and Others tabs have their own empty copy. */
export const EmptyInReview: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:212` },
  render: () => list({}, api.empty),
};

/** Closed tab, no claims: "No closed claims yet". */
export const EmptyClosed: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:212` },
  render: () => list({}, api.empty),
  play: async () => { await tap(/^Closed/); },
};

/** Others tab, no tickets: "No tickets yet". */
export const EmptyOthers: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:212` },
  render: () => list({}, api.empty),
  play: async () => { await tap(/^Others/); },
};

/** First load: bare spinner. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:200`, docs: { description: { story: 'Bare `ActivityIndicator`. ux-states.md proposes 3 `Skeleton` rows.' } } },
  render: () => <ScreenHarness name="MissingCashbackDidYouShop" component={MissingCashbackDidYouShop} auth="signedIn" api={api.loading()} />,
};

/** Every call answers 500: "Couldn't load your claims" with "Try again". Wait 1 to 2 s. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:204` },
  render: () => <ScreenHarness name="MissingCashbackDidYouShop" component={MissingCashbackDidYouShop} auth="signedIn" api={api.error()} />,
};

// Hidden routes: static sample lists in the source, not wired to the API.
const hiddenNote = 'Hidden: not linked from the app, hard-coded sample rows ("superseded" by the live claims list). Shown for reference only. Decision: none recorded; keep out of the release.';

/** HIDDEN: Closed sample list (static data). */
export const HiddenTicketListClosed: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/MissingCashbackTicketListClosed.tsx:57', docs: { description: { story: hiddenNote } } },
  render: () => <ScreenHarness name="MissingCashbackTicketListClosed" component={MissingCashbackTicketListClosed} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: Tracked sample list (static data). */
export const HiddenTicketListTracked: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/MissingCashbackTicketListTracked.tsx:50', docs: { description: { story: hiddenNote } } },
  render: () => <ScreenHarness name="MissingCashbackTicketListTracked" component={MissingCashbackTicketListTracked} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: Status review sample (static data). */
export const HiddenTicketStatusReview: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/MissingCashbackTicketStatusReview.tsx:90', docs: { description: { story: hiddenNote } } },
  render: () => <ScreenHarness name="MissingCashbackTicketStatusReview" component={MissingCashbackTicketStatusReview} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: "Track more" page (static trackable stores; reachable only from the hidden lists). */
export const HiddenTrack: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/MissingCashbackTrack.tsx:100', docs: { description: { story: hiddenNote + ' It has hard-coded titles.' } } },
  render: () => <ScreenHarness name="MissingCashbackTrack" component={MissingCashbackTrack} auth="signedIn" api={api.ok()} />,
};
