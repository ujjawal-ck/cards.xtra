import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HomeScreen } from '../../../src/screens/HomeScreen';
import { HomeHeader } from '../../../src/organisms/HomeHeader';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { ScreenHarness, PhoneFrame } from '../../../storybook/harness';
import { api, cardsFixture, BK_CARDS, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText, clickByPart, typeInto } from '../01-launch-and-login/_flow';
import { colors } from '../../../src/tokens';

const Home = ({ a, steps }: { a: ApiParams; steps?: Parameters<typeof Script>[0]['steps'] }) => (
  <>
    <ScreenHarness name="Home" component={HomeScreen} auth="guest" api={a} />
    {steps ? <Script steps={steps} /> : null}
  </>
);

const meta: Meta = {
  title: 'Flows/2 Home and discovery/Home',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The Home tab: masthead with search, tools row, filter row (Category, Filters, Eligibility toggle), card sections and tiles. Stories render the real screen as a guest. Loading and error states need the screen\'s own timers and retries (about 2 seconds). The floating tab bar is not mounted in Storybook.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** First load: the Home skeleton. */
export const Loading: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2871' },
  render: () => <Home a={api.loading()} />,
};

/** Loaded, guest: cards from the harness catalogue. */
export const LoadedGuest: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2884' },
  render: () => <Home a={api.ok()} />,
};

/** Eligibility on: Home regroups into Eligible, Maybe and Ineligible cards. */
export const LoadedEligibilityGroups: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:1543', docs: { description: { story: 'The story drives the real screen: it turns Eligibility on, types PIN 110001 and income 75000 in the checker, taps Check, and taps "Great, Show Cards" on the eligible sheet. The eligibility API answers with the "partial" fixture (some cards rejected). If a tap misses, the screen stops at that step.' } } },
  render: () => (
    <Home
      a={api.ok()}
      steps={[
        [2600, () => clickByPart('Eligibility')],
        [1400, () => typeInto(0, '110001')],
        [400, () => typeInto(1, '75000')],
        [600, () => clickByText('Check Eligibility')],
        [1800, () => clickByText('Great, Show Cards')],
      ]}
    />
  ),
};

/** Filters match nothing: the "closest cards" fallback with a Clear button. */
export const NoMatchWithClosest: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2320', docs: { description: { story: 'The catalogue has no lifetime-free card. The story opens Filters, picks Annual Fee, "Lifetime Free (₹0)", and taps Apply Filter. After the white transition the screen says no card matches and lists the closest cards (event filter_no_match; fallback at :1520).' } } },
  render: () => (
    <Home
      a={api.ok({ cards: { ...cardsFixture.default, data: BK_CARDS.filter((c) => c.card_alias !== 'scapia-federal-bank-credit-card') } })}
      steps={[
        [2600, () => clickByText('Filters')],
        [900, () => clickByText('Annual Fee')],
        [500, () => clickByPart('Lifetime Free')],
        [500, () => clickByText('Apply Filter')],
      ]}
    />
  ),
};

/** Catalogue request fails: ad-hoc text and a retry link. */
export const LoadError: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2244', docs: { description: { story: 'PARTIAL: hand-built text and Pressable, not ScreenState. The error shows after the app\'s two retries (about 2 seconds).' } } },
  render: () => <Home a={api.ok({ cards: reply.error(500) })} />,
};

/** Offline with no cache, today: masthead and filters, but no cards and no message (R6). */
export const OfflineToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:354', docs: { description: { story: 'Risk R6. The cards query is paused, so the screen has neither loading nor error and shows an empty list. Only the global offline banner (not mounted in Storybook) says anything.' } } },
  render: () => <Home a={api.offline()} />,
};

/** Empty catalogue, no filters, today: an empty list with no message. */
export const EmptyCatalogueToday: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2320', docs: { description: { story: 'No empty state exists when the catalogue returns 0 cards with no filter on (screen-flows gap 3). The "No cards match" block needs an active filter.' } } },
  render: () => <Home a={api.empty()} />,
};

/** Replica shell: the scrolled masthead bar over a ScreenState. */
const Shell = ({ children }: { children: React.ReactNode }) => (
  <PhoneFrame>
    <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <HomeHeader scrolled />
      {children}
    </View>
  </PhoneFrame>
);

/** Proposed: offline with no cache. */
export const OfflineProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/HomeScreen.tsx:354', docs: { description: { story: 'Standard offline state in place of the card list; masthead and tools row stay. Copy copies the tools ("You\'re offline", "Check your connection and try again."). Needs one shared helper that maps "paused with no data" to an offline flag (engineering prerequisite, copy from useCardSavings.ts:124). Open question: does Home also keep showing stale cached cards when it has them?' } } },
  render: () => (
    <Shell>
      <ScreenState title="You're offline" body="Check your connection and try again." actionLabel="Try again" />
    </Shell>
  ),
};

/** Proposed: empty catalogue. */
export const EmptyCatalogueProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2320', docs: { description: { story: 'Proposal: ScreenState with "No cards to show right now", a retry action. Copy is new, not from the audit. Open question: is a 200 with 0 cards a real case, or always a backend fault that should read as an error?' } } },
  render: () => (
    <Shell>
      <ScreenState title="No cards to show right now" body="We could not find any cards. Please try again in a while." actionLabel="Try again" />
    </Shell>
  ),
};
