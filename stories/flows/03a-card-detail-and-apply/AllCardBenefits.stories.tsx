import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AllCardBenefitsScreen } from '../../../src/screens/AllCardBenefitsScreen';
import { ScreenHarness, routeParams } from '../../../storybook/harness';
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
