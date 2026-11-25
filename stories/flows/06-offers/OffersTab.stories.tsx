import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { OffersScreen } from '../../../src/screens/OffersScreen';
import { Text } from '../../../src/atoms';
import { ScreenState } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { SearchTopSheet } from '../../../src/organisms/SearchTopSheet';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, categoryOffersFixture, clone, offerCategoryTreeFixture, reply } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

/**
 * Flow 6, step 1. The Offers tab: category strip, 2 column store grid, a welcome promo sheet.
 * Guest is enough: the grid needs no login. The floating tab bar is not mounted in this harness.
 */
const meta: Meta = {
  title: 'Flows/6 Offers/Offers tab',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/OffersScreen.tsx';
const Offers = ({ a }: { a: ReturnType<typeof api.ok> }) => <ScreenHarness name="Offers" component={OffersScreen} api={a} />;

/** First load: the grid shows 3 rows of two skeleton tiles. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:522` },
  render: () => <Offers a={api.loading()} />,
};

/** Loaded: category strip (All, Fashion, Beauty, Electronics, Food & Grocery, Travel, Home & Kitchen) and 5 stores. Tap a store to open its page (stub "→ OffersBrandAmazon" in this harness). The welcome promo slides in about 1 s after load (next story). */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:543` },
  render: () => <Offers a={api.ok()} />,
};

/** Welcome promo sheet "Shop as Usual, Earn Cashback". It appears once per page load, only when stores exist, about 0.9 s after the tab gains focus. Harness limit: that "seen" flag cannot be reset, so reload the iframe (or open this story first in a fresh tab) to see it again. */
export const PromoSheet: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:209` },
  render: () => <Offers a={api.ok()} />,
};

/** R10, production today (D11, not re-checked since 2026-11-09): the store list comes back empty. "No offers here yet" + Explore cards (goes to Home). No promo, because there are no stores. */
export const EmptyNoOffersYet: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:552` },
  render: () => <Offers a={api.ok({ categoryOffers: categoryOffersFixture.empty })} />,
};

/** The store call fails (HTTP 500): "Couldn't load offers" + Try again. Shows after the app's own retries (1 to 2 s). */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:533` },
  render: () => <Offers a={api.ok({ categoryOffers: reply.error(500) })} />,
};

/** Offline cold start with no cache. R6, inferred from code: the query pauses, is neither loading nor error, and the grid falls through to "No offers here yet", which is false. Only the global banner (not mounted here) says offline. */
export const OfflineShowsEmpty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:552` },
  render: () => <Offers a={api.offline()} />,
};

/** PROPOSED (R6 fix). Offline with no cache shows the standard offline state, not "No offers here yet". Open question: needs the shared "paused with no data" helper first (copy useCardSavings). Owner: engineering. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Replaces the false empty state at src/screens/OffersScreen.tsx:552. Copy from audit/ux-states.md (offline standard state). Open question: keep the category strip visible while offline, or show only this state?' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <ScrollView contentContainerStyle={{ paddingTop: spacing[24], paddingHorizontal: spacing[16], gap: spacing[16] }}>
        <Text variant="heading20SemiBold" color={colors.text.primary}>Offers</Text>
        <View>
          <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" />
        </View>
      </ScrollView>
    </PhoneFrame>
  ),
};

// ── Edge cases and loaders ───────────────────────────────────────────────────

/** The store call fails more times than the app retries (GETs: 3 calls), so the error state shows. */
const e500 = reply.error(500);

/** Production today: the `miniapp` parent answers 400, so the strip falls back to the top-level categories. */
export const CategoryFallback: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/query/useOffers.ts:43',
    docs: { description: { story: 'The category tree call answers 400 "Invalid Category" (no `miniapp` parent on production yet). The app falls back to the top-level categories and the grid starts on the first of them. This is the production path today.' } },
  },
  render: () => <Offers a={api.ok({ offerCategoryTree: offerCategoryTreeFixture.invalidCategory })} />,
};

export const NetworkDrop: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:539`,
    docs: { description: { story: 'The store call fails like a dropped connection (status 0). After the retries the tab shows "Couldn\'t load offers" with "Something went wrong on our side": copy that blames the server for a dropped network (gap G11).' } },
  },
  render: () => <Offers a={api.ok({ categoryOffers: reply.network() })} />,
};

export const RetryAfterError: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:533`,
    docs: { description: { story: 'The store call answers 500 three times (the first call and the transport\'s two retries), so "Couldn\'t load offers" shows. "Try again" is tapped after about 3 s; the next call answers with the fixture and the grid loads.' } },
  },
  render: () => (
    <>
      <Offers a={api.ok({ categoryOffers: reply.sequence(e500, e500, e500, categoryOffersFixture.default) })} />
      <TapScript steps={[{ wait: 3000 }, { click: 'Try again' }]} />
    </>
  ),
};

/** Tap the search bar (its ticker text starts "Search for"), then type. The welcome promo can open about 1 s after load, on the first Offers story of a page load. */
const searchSteps = (q: string) => [{ click: 'Search for', prefix: true }, { type: q, into: 'Search input' }];

export const SearchResults: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:576`, docs: { description: { story: 'The search bar is tapped after mount and "aj" typed: the Stores section lists AJIO from the store index. The welcome promo may also open on the first Offers story of a page load.' } } },
  render: () => (
    <>
      <Offers a={api.ok()} />
      <TapScript steps={searchSteps('aj')} startMs={1500} />
    </>
  ),
};

export const SearchNoResults: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:576`, docs: { description: { story: 'The search bar is tapped after mount and "zzz" typed: "No results for “zzz”" with the hint "Try a store like Amazon or Myntra, or a category like Fashion."' } } },
  render: () => (
    <>
      <Offers a={api.ok()} />
      <TapScript steps={searchSteps('zzz')} startMs={1500} />
    </>
  ),
};

/** The "All" category answers with two stores; every sub-category call never answers, so the store index is only partly loaded. */
const partialIndex = (req: { path: string }) => {
  if (!req.path.endsWith('/miniapp')) return reply.hang();
  const body = clone(categoryOffersFixture.default);
  body.data = body.data.slice(0, 2);
  return body;
};

export const SearchIndexLoading: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:235`,
    docs: { description: { story: 'Gap G12. The "All" call answers with two stores (AJIO, Amazon Fashion); the sub-category calls that build the rest of the search index never answer. "Zop" is typed: the sheet says "No results" while the index is still loading, because the screen drops the loading flag of `useAllOfferStores`. The user cannot tell "not a store" from "not loaded yet".' } },
  },
  render: () => (
    <>
      <Offers a={api.ok({ categoryOffers: partialIndex })} />
      <TapScript steps={searchSteps('Zop')} startMs={1500} />
    </>
  ),
};

/** PROPOSED (G12). Same sheet, with the existing `noResultsHint` prop used while the index loads. */
export const SearchIndexLoadingProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed. While the store index loads, the no-results hint says so: "Still loading stores. Try again in a second." The prop exists today. Open question: `SearchTopSheet` has no loading slot (a design-system gap); is a hint enough, or should the sheet show a skeleton row? The sheet is an RN Modal, so on web it covers the whole preview.' } },
  },
  render: () => (
    <PhoneFrame>
      <SearchTopSheet
        visible
        variant="suggestions"
        value="Zop"
        sections={[]}
        placeholder="Search stores & categories"
        noResultsHint="Still loading stores. Try again in a second."
        onClose={() => undefined}
      />
    </PhoneFrame>
  ),
};

export const StoreNoRate: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/api/offersMapper.ts:46',
    docs: { description: { story: 'The second store in the answer has `cashback.amount: 0`. Its tile CTA reads "Shop & Earn Cashback" with no rate, so the tile promises cashback without a figure (Q3: list it, show it without Shop, or hide it?).' } },
  },
  render: () => {
    const body = clone(categoryOffersFixture.default);
    body.data[1].attributes.cashback.amount = '0';
    return <Offers a={api.ok({ categoryOffers: body })} />;
  },
};
