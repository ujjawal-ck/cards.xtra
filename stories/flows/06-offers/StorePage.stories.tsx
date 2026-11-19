import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, ScrollView } from 'react-native';
import { OffersBrandAmazon } from '../../../src/screens/OffersBrandAmazon';
import { Skeleton, Text } from '../../../src/atoms';
import { InlineMessage } from '../../../src/molecules';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors, radius, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, clone, offerStoreFixture } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

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
const Store = ({ a, auth }: { a: ReturnType<typeof api.ok>; auth?: 'guest' | 'signedIn' | 'sessionExpired' }) => (
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

// ── Edge cases and loaders ───────────────────────────────────────────────────

/** A copy of the AJIO store answer, edited. Never edit the shared fixture. */
const storeAnswer = (edit: (attrs: Record<string, any>) => void) => {
  const body: any = clone(offerStoreFixture.default);
  edit(body.data.attributes);
  return body;
};
const SHOP = [{ click: 'Earn Cashback on', prefix: true }];

export const NoShopLinkToday: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:553`,
    docs: { description: { story: 'App bug (gap G2, P0 attribution). The store answer has no `cashback_url`. Signed in, the footer still shows "Earn Cashback on AJIO"; after mount the script taps it: `offer_shop` is logged, then the click-out returns with nothing on screen and no `clickout_blocked` event. The user sees a dead button.' } },
  },
  render: () => (
    <>
      <Store auth="signedIn" a={api.ok({ offerStore: storeAnswer((a) => { delete a.cashback_url; }) })} />
      <TapScript steps={SHOP} startMs={2000} />
    </>
  ),
};

export const GuestShop: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:89', docs: { description: { story: 'A guest taps "Earn Cashback on AJIO" (script, after mount): the login sheet for the store click-out opens (kind `store`), and the click continues after login.' } } },
  render: () => (
    <>
      <Store a={api.ok()} />
      <TapScript steps={SHOP} startMs={2000} />
    </>
  ),
};

export const SignedInShop: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:557`, docs: { description: { story: 'Signed in, the script taps "Earn Cashback on AJIO". Nothing opens in the harness: the console logs `[storybook] click-out <url>` with the store\'s tracking link.' } } },
  render: () => (
    <>
      <Store auth="signedIn" a={api.ok()} />
      <TapScript steps={SHOP} startMs={2000} />
    </>
  ),
};

export const NoCashbackRate: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/organisms/StoreCashbackDetails.tsx:220',
    docs: { description: { story: 'App bug (gap G4, Q3). The store answer has `cashback.amount: 0` and no `tracking_speed`. The cashback floor prints "Cashback" where the rate should be (and "Flat" / "Cashback" "Cashback" in places), the timelines tile shows "—", and the footer CTA still says "Earn Cashback on AJIO".' } },
  },
  render: () => <Store a={api.ok({ offerStore: storeAnswer((a) => { a.cashback = { ...a.cashback, amount: '0' }; delete a.tracking_speed; }) })} />,
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:365`, docs: { description: { story: 'Offline at cold start: the paused query is not loading, so "Couldn\'t load this store" shows at once. "Try again" does nothing until the phone is back online.' } } },
  render: () => <Store a={api.offline()} />,
};

export const SessionExpired: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/useClickOut.tsx:89', docs: { description: { story: 'Tokens exist but every user call answers 401 and the refresh fails: the session drops to guest and the login sheet is asked to open. The store page itself needs no login, so it still reads; Shop then gates as a guest.' } } },
  render: () => <Store auth="sessionExpired" a={api.ok()} />,
};

// ── Proposed ─────────────────────────────────────────────────────────────────

const Footer = ({ children }: { children: React.ReactNode }) => (
  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface.default }}>{children}</View>
);

export const NoShopLinkProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G2, pattern `patterns-click-out--no-link-proposed`). With no `cashback_url`, the footer button is disabled and a message says why, instead of a button that does nothing. Open question: show the store at all without a link (Q3)? The page above the footer is not drawn.' } },
  },
  render: () => (
    <PhoneFrame>
      <Footer>
        <View style={{ padding: spacing[16] }}>
          <InlineMessage tone="info" message="Shopping through Cards.xtra isn't available for this store right now." />
        </View>
        <FooterButtons buttons="single" size={52} color="main" primaryLabel="Earn Cashback on AJIO" primaryDisabled />
      </Footer>
    </PhoneFrame>
  ),
};

export const NoCashbackRateProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G4, Q3). With no rate, the cashback floor is hidden and one message says the rate is unavailable, instead of printing "Cashback" as the rate. Open question Q3: list such a store, show it without Shop, or hide it from Offers? The rest of the page is not drawn.' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="heading20SemiBold" color={colors.text.primary}>AJIO</Text>
        <InlineMessage tone="info" message="The cashback rate for this store isn't available right now." />
      </View>
    </PhoneFrame>
  ),
};
