import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CardsYouCanGetScreen } from '../../../src/screens/CardsYouCanGetScreen';
import { View } from 'react-native';
import { ScreenHarness, PhoneFrame, routeParams } from '../../../storybook/harness';
import { Header } from '../../../src/organisms/Header';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { colors } from '../../../src/tokens';
import { api, reply, cardsFixture, BK_CARDS } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText } from '../01-launch-and-login/_flow';
import { REGALIA, ELIGIBLE_ALIASES } from '../03a-card-detail-and-apply/_data';

const Page = ({ a, aliases = ELIGIBLE_ALIASES, tap }: { a: ApiParams; aliases?: string[]; tap?: string }) => (
  <>
    <ScreenHarness name="CardsYouCanGet" component={CardsYouCanGetScreen} auth="guest" api={a}
      params={routeParams('CardsYouCanGet', { rejectedCardId: REGALIA.id, eligibleAliases: aliases, reasonKind: 'income', source: 'rejection' })} />
    {tap ? <Script steps={[[2200, () => clickByText(tap)]]} /> : null}
  </>
);

const meta: Meta = {
  title: 'Flows/3b Rejection/Cards you can get (rejection)',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'Opened by "See all N cards you can get" on the rejection sheet. A strip says what the user wanted, the closest card sits in a row, then category chips, a lifetime-free toggle, a sort control and the card list. Copy claims eligibility ("cards you can get") because every card here passed the check. Apply on this page skips Home\'s eligibility gate on purpose (R11). The stories use the rejected card HDFC Regalia Gold and the harness cards.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Loading: card list skeleton. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:273' },
  render: () => <Page a={api.loading()} />,
};

/** Loaded: context strip, closest row, chips, list. */
export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:127' },
  render: () => <Page a={api.ok()} />,
};

/** A filter on: "Lifetime free only" tapped. */
export const FilterApplied: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:443', docs: { description: { story: 'The story taps the "Lifetime free only" chip. Events filter_apply and filter_clear.' } } },
  render: () => <Page a={api.ok()} tap="Lifetime free only" />,
};

/** Filters match nothing. */
export const NoMatch: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:478', docs: { description: { story: 'Only one eligible card is passed (SBI Cashback, ₹999 fee) and the story taps "Lifetime free only", so no card matches. The screen shows its no-match block with a way to clear.' } } },
  render: () => <Page a={api.ok()} aliases={['sbi-cashback-credit-card']} tap="Lifetime free only" />,
};

/** Cards request fails. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:280', docs: { description: { story: 'The cards call answers 500, shown after the app\'s retries (about 2 seconds). The offline case is not handled: it falls into "No cards to show" (R6).' } } },
  render: () => <Page a={api.ok({ cards: reply.error(500) })} />,
};

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** No eligible cards passed: "No cards to show". */
export const NoCardsToShow: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:291', docs: { description: { story: 'Edge case. The screen opens with an empty list of eligible aliases (the rejection sheet hides its See-all button in this case, so only a deep link or a bug gets here). The screen shows "No cards to show".' } } },
  render: () => <Page a={api.ok()} aliases={[]} />,
};

/** Offline with no cache, today: the same "No cards to show" (A6). */
export const OfflineToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:291', docs: { description: { story: 'Edge case (A6, G4). The cards query is paused offline, so the screen has neither loading nor error and shows "No cards to show", which reads as "you qualify for nothing". The real fault is the connection.' } } },
  render: () => <Page a={api.offline()} />,
};

/** Proposed: the standard offline state under the header. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:291', docs: { description: { story: 'Proposal for A6. Header "Cards you can get" and the standard offline ScreenState ("You\'re offline", "Check your connection and try again.", "Try again"). Needs the shared helper that maps a paused query with no data to an offline flag.' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <Header leading="back" title="Cards you can get" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" />
        </View>
      </View>
    </PhoneFrame>
  ),
};

/** The rejected card has a 71-character name, on the small Android viewport (360 dp). */
export const LongName360: Story = {
  tags: ['live'],
  globals: { viewport: { value: 'android360', isRotated: false } },
  parameters: { source: 'src/screens/CardsYouCanGetScreen.tsx:127', docs: { description: { story: 'Edge case at 360 dp. Pinned to the Android small viewport. The rejected card (HDFC Regalia Gold) is renamed to 71 characters in the catalogue, so the context strip and the closest-card row carry the long name. Check wrapping and clipping.' } } },
  render: () => {
    const long = 'HDFC Bank Regalia Gold Premium Lifetime Free Travel Rewards Credit Card';
    const data = BK_CARDS.map((c) => (c.card_alias === 'hdfc-regalia-gold' ? { ...c, name: long } : c));
    return (
      <ScreenHarness name="CardsYouCanGet" component={CardsYouCanGetScreen} auth="guest" width={360} height={800}
        api={api.ok({ cards: { ...cardsFixture.default, data } })}
        params={routeParams('CardsYouCanGet', { rejectedCardId: REGALIA.id, eligibleAliases: ELIGIBLE_ALIASES, reasonKind: 'income', source: 'rejection' })} />
    );
  },
};
