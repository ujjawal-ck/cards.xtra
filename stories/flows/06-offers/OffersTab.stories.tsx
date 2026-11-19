import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { OffersScreen } from '../../../src/screens/OffersScreen';
import { Text } from '../../../src/atoms';
import { ScreenState } from '../../../src/organisms';
import { colors, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, categoryOffersFixture, reply } from '../../../storybook/fixtures';

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
