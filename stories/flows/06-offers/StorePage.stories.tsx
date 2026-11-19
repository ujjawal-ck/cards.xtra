import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { OffersBrandAmazon } from '../../../src/screens/OffersBrandAmazon';
import { Skeleton } from '../../../src/atoms';
import { colors, radius, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, offerStoreFixture } from '../../../storybook/fixtures';

/**
 * Flow 6, step 2. MONEY STEP: the store page ends in the cashback click-out (sticky "Earn Cashback on <Brand>").
 * Route OffersBrandAmazon, any slug. The store fixture is AJIO and answers every slug. Guest is enough to read the page.
 * Click-outs are spied: nothing opens, the console shows "[storybook] click-out <url>".
 */
const meta: Meta = {
  title: 'Flows/6 Offers/Store page',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/OffersBrandAmazon.tsx';
const params = routeParams('OffersBrandAmazon', { slug: 'ajio-coupons', category: 'Fashion' });
const Store = ({ a, auth }: { a: ReturnType<typeof api.ok>; auth?: 'guest' | 'signedIn' }) => (
  <ScreenHarness name="OffersBrandAmazon" component={OffersBrandAmazon} params={params} auth={auth} api={a} />
);

/** Loading today: a bare spinner in the middle of the page (PARTIAL: a Skeleton exists). See the proposed twin. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:362` },
  render: () => <Store a={api.loading()} />,
};

/** Loaded: hero, cashback rates, how it works, timelines, terms, best cards, similar stores, FAQ, and the sticky "Earn Cashback on AJIO" button. Scroll the phone to read the floors. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:104` },
  render: () => <Store a={api.ok()} />,
};

/** The store call answers "not found" (HTTP 404): "Couldn't load this store" + Try again. The same state shows when the call fails. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:365` },
  render: () => <Store a={api.ok({ offerStore: offerStoreFixture.notFound })} />,
};

/** "Best cards to use here": the card carousel floor, matched to the category "Fashion" and filled from the card catalogue. Scrolls the real page to it after mount. It hides itself while the catalogue loads or is empty. */
export const BestCards: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/StoreBestCards.tsx:68' },
  render: () => <Store a={api.ok()} />,
  play: async ({ canvasElement }) => {
    const t0 = Date.now();
    for (;;) {
      const el = Array.from(canvasElement.querySelectorAll<HTMLElement>('*')).find((e) => (e.textContent ?? '').trim() === 'Best cards to use here' && e.children.length === 0);
      if (el) { el.scrollIntoView({ block: 'center' }); return; }
      if (Date.now() - t0 > 12000) return;
      await new Promise((r) => setTimeout(r, 150));
    }
  },
};

/** Share: the share glyph on the header calls the OS share sheet with "Earn cashback on AJIO via CashKaro" and the store's cashback link. The harness spies it (console "[storybook] click-out share"), so the story taps the real glyph and nothing visible happens. */
export const Share: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:154` },
  render: () => <Store a={api.ok()} />,
  play: async ({ canvasElement }) => {
    const t0 = Date.now();
    for (;;) {
      const el = canvasElement.querySelector<HTMLElement>('[aria-label="Share"]');
      if (el) { setTimeout(() => el.click(), 600); return; }
      if (Date.now() - t0 > 12000) return;
      await new Promise((r) => setTimeout(r, 150));
    }
  },
};

/** PROPOSED. Loading as skeleton blocks in the page shape (hero, then three rows) in place of the bare spinner. Open question: none on copy (no text); engineering swaps the spinner for these. */
export const LoadingProposed: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: `Replaces the spinner at ${SRC}:362. Shape from audit/ux-states.md (hero spacing[128], three spacing[48] rows).` } } },
  render: () => (
    <PhoneFrame>
      <ScrollView contentContainerStyle={{ gap: spacing[16] }}>
        <Skeleton height={spacing[128]} radius="lg" />
        <View style={{ paddingHorizontal: spacing[16], gap: spacing[12], backgroundColor: colors.background.default, borderRadius: radius.lg }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={spacing[48]} radius="lg" />)}
        </View>
      </ScrollView>
    </PhoneFrame>
  ),
};
