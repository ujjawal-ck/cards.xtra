import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AllCardBenefitsScreen } from '../../../src/screens/AllCardBenefitsScreen';
import { View } from 'react-native';
import { ScreenHarness, PhoneFrame, routeParams } from '../../../storybook/harness';
import { Header } from '../../../src/organisms/Header';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors } from '../../../src/tokens';
import { api, cardDetailFixture, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { REGALIA } from './_data';

const Page = ({ a }: { a: ApiParams }) => (
  <ScreenHarness name="AllCardBenefits" component={AllCardBenefitsScreen} auth="guest" api={a}
    params={routeParams('AllCardBenefits', { alias: REGALIA.filterMeta?.cardAlias, cardName: REGALIA.name })} />
);

const meta: Meta = {
  title: 'Flows/3a Card detail and apply/All card benefits',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false }, description: { component: 'Reached from "View all benefits" on the card detail. Tabs by category, each with a list of benefits. Fetches the BankKaro card detail by alias.' } } },
};
export default meta;
type Story = StoryObj;

/** Loading: a bare spinner (PARTIAL). */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:129', docs: { description: { story: 'Proposal from the UX audit: four Skeleton rows (height 48, radius lg) instead of the spinner.' } } },
  render: () => <Page a={api.ok({ cardDetail: reply.hang() })} />,
};

/** Loaded: category tabs and benefit rows. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:53' },
  render: () => <Page a={api.ok()} />,
};

/** Error: text only, no retry (PARTIAL). */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:133', docs: { description: { story: 'The detail call answers 500 (after the app\'s two retries, about 2 seconds). Proposal: ScreenState "Couldn\'t load benefits" with a "Try again" action. The offline case falls into the "not available" copy instead (see the systemic finding R6).' } } },
  render: () => <Page a={api.ok({ cardDetail: reply.error(500) })} />,
};

/** The card has no benefit detail. */
export const NotAvailable: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:145' },
  render: () => <Page a={api.ok({ cardDetail: cardDetailFixture.empty })} />,
};

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** Offline with no cache, today: the benefits are called "not available" (A6). */
export const OfflineToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:129', docs: { description: { story: 'Edge case (A6, G3, G4). The detail query is paused offline, so the screen has neither loading nor error and falls to its "not available" copy. The user is told the card has no benefits when the real fault is the connection. Every offline cold start lands here (no persisted cache).' } } },
  render: () => <Page a={api.offline()} />,
};

/** Replica of the screen: header, a state in the body, a footer. */
const Shell = ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => (
  <PhoneFrame>
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <Header leading="back" title="All Card Benefits" />
      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
      {footer}
    </View>
  </PhoneFrame>
);

/** Proposed: the standard offline state. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:129', docs: { description: { story: 'Proposal for A6. The standard offline ScreenState ("You\'re offline", "Check your connection and try again.", "Try again") with a footer button "Go back to card details". Needs the shared helper that maps a paused query with no data to an offline flag. Open question: should the footer button stay, since the header already goes back?' } } },
  render: () => (
    <Shell footer={<FooterButtons buttons="single" size={52} primaryLabel="Go back to card details" />}>
      <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" />
    </Shell>
  ),
};

/** Proposed: a load error with a retry. */
export const LoadErrorProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/AllCardBenefitsScreen.tsx:133', docs: { description: { story: 'Proposal for A15. Today the error is plain text with no retry. ScreenState "Couldn\'t load benefits", "Check your connection and try again.", action "Try again". DS gap: ScreenState has one action and no error illustration (A17).' } } },
  render: () => (
    <Shell>
      <ScreenState title="Couldn't load benefits" body="Check your connection and try again." actionLabel="Try again" />
    </Shell>
  ),
};
