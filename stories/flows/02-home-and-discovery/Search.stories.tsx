import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SearchTopSheet, type SearchTopSheetProps } from '../../../src/organisms/SearchTopSheet';
import { InlineMessage } from '../../../src/molecules';
import { Skeleton } from '../../../src/atoms';
import { PhoneFrame } from '../../../storybook/harness';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/tokens';
import { MODELS } from '../03a-card-detail-and-apply/_data';

const [regalia, , swiggy] = MODELS;
const chips = [regalia, MODELS[1], swiggy].map((c) => ({ label: c.filterMeta?.bankName ?? c.name, leadingIcon: 'feat-bank-outline', image: c.cardImage })) as SearchTopSheetProps['recentSearches'];
const sections: SearchTopSheetProps['sections'] = [
  { header: 'Banks', rows: [{ logo: regalia.cardImage, title: 'HDFC Bank', subtitle: '2 cards' }] },
  { header: 'Cards', rows: [regalia, swiggy].map((c) => ({ logo: c.cardImage, title: c.name, subtitle: c.cashback })) },
];

const Sheet = (p: Partial<SearchTopSheetProps>) => (
  <PhoneFrame>
    <SearchTopSheet visible variant="suggestions" recentSearches={chips} placeholder="Search cards or banks" onClose={() => {}} {...p} />
  </PhoneFrame>
);

const meta: Meta = {
  title: 'Flows/2 Home and discovery/Search',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The search that drops from the top of Home. It is an RN Modal, so on web it covers the whole preview and not only the 390 px frame. The stories render the real sheet with the props Home passes; they do not tap the search bar. Bank rows use card art because no bank logos ship.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Empty query: popular chips and the advisor row. */
export const Popular: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:127' },
  render: () => <Sheet onAdvisorPress={() => {}} />,
};

/** A query with matches: bank and card sections. */
export const Results: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:417' },
  render: () => <Sheet value="hdfc" sections={sections} />,
};

/** No results: the block plus the "help me pick" row that opens the advisor (F5). */
export const NoResultsAdvisorRow: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:417', docs: { description: { story: 'Event search_no_results fires. The advisor row is the planned recovery.' } } },
  render: () => <Sheet value="zzzz" sections={[]} onAdvisorPress={() => {}} />,
};

/** Proposed: the catalogue did not load (error or offline). */
export const CatalogueNotLoadedProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:211', docs: { description: { story: 'MISSING today: when the cards query fails or is paused offline, every query shows "No results" because only loaded sections count. Proposal: an InlineMessage, tone warning, "Search needs a connection. Check your internet and try again.", with a "Try again" action, in place of the no-results block. Open question: block the search bar itself while offline?' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default, padding: spacing[16], gap: spacing[16] }}>
        <InlineMessage tone="warning" message="Search needs a connection. Check your internet and try again." action="single" primaryActionLabel="Try again" />
      </View>
    </PhoneFrame>
  ),
};

/** A long query that matches nothing. */
export const LongQuery: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:417', docs: { description: { story: 'Edge case. A 55-character query in the search field, no results. Check that the field and the no-results block hold the long text without overflow.' } } },
  render: () => <Sheet value="hdfc regalia gold credit card lifetime free lounge" sections={[]} onAdvisorPress={() => {}} />,
};

/** Proposed: the catalogue is still loading when the user types. */
export const CatalogueLoadingProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/organisms/SearchTopSheet.tsx:211', docs: { description: { story: 'MISSING today: while the cards query is pending, a typed query shows "No results" because only loaded sections count. Proposal: three Skeleton rows in the results area. Open question: show the skeleton only after the catalogue has been pending for a moment, to avoid a flash on a fast network?' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default, padding: spacing[16], gap: spacing[12] }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} height={spacing[48]} radius="lg" />)}
      </View>
    </PhoneFrame>
  ),
};
