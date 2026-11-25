import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { HomeScreen } from '../../../src/screens/HomeScreen';
import { HomeHeader } from '../../../src/organisms/HomeHeader';
import { HomeSkeleton } from '../../../src/organisms/HomeSkeleton';
import { CardTile } from '../../../src/organisms/CardTile';
import { ScreenState } from '../../../src/organisms/ScreenState';
import { InlineMessage } from '../../../src/molecules';
import { Text } from '../../../src/atoms';
import { ComponentHarness, ScreenHarness, PhoneFrame } from '../../../storybook/harness';
import { api, cardsFixture, eligibilityFixture, initBundleFixture, BK_CARDS, reply } from '../../../storybook/fixtures';
import type { ApiParams } from '../../../storybook/harness';
import { Script, clickByText, clickByPart, typeInto } from '../01-launch-and-login/_flow';
import { MODELS } from '../03a-card-detail-and-apply/_data';
import { queryClient } from '../../../src/query/queryClient';
import { cardsQueryKey } from '../../../src/query/useCards';
import { colors, spacing, borderWidth } from '../../../src/tokens';

const Home = ({ a, steps, auth = 'guest', width, height, beforeMount }: { a: ApiParams; steps?: Parameters<typeof Script>[0]['steps']; auth?: 'guest' | 'signedIn' | 'sessionExpired'; width?: number; height?: number; beforeMount?: () => void }) => (
  <>
    <ScreenHarness name="Home" component={HomeScreen} auth={auth} api={a} width={width} height={height} beforeMount={beforeMount} />
    {steps ? <Script steps={steps} /> : null}
  </>
);

/** The steps that turn Eligibility on and run the checker (PIN 110001, income 75000), without the last tap. */
const checkSteps: Parameters<typeof Script>[0]['steps'] = [
  [2600, () => clickByPart('Eligibility')],
  [1400, () => typeInto(0, '110001')],
  [400, () => typeInto(1, '75000')],
  [600, () => clickByText('Check Eligibility')],
];

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

// ── Edge cases and loaders (audit edge-flows-1-3) ────────────────────────────

/** Cold start on a slow network: the catalogue answers after 8 seconds. */
export const SlowCatalogue: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2871', docs: { description: { story: 'Slow story: the cards call answers after 8 seconds. Until then the screen shows the Home skeleton and no other sign. On a real slow network the wait can reach about 46 s (G1) and no "taking longer" line exists (A5).' } } },
  render: () => <Home a={api.ok({ cards: reply.delay(8000, cardsFixture.default) })} />,
};

/** Proposed: the skeleton with a "still loading" line. */
export const SlowCatalogueProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2871', docs: { description: { story: 'MISSING today (A5). Proposal: keep the skeleton and add an InlineMessage, tone info, "Still loading cards. Your connection seems slow." Open questions: after how many seconds does it appear? Q7: should the catalogue call use a shorter timeout and fewer retries instead?' } } },
  render: () => (
    <ComponentHarness>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <View style={{ padding: spacing[16] }}>
          <InlineMessage tone="info" message="Still loading cards. Your connection seems slow." />
        </View>
        <HomeSkeleton />
      </View>
    </ComponentHarness>
  ),
};

/** Eligibility check finds no eligible card: today the app shows nothing new (A9). */
export const NoneEligibleGroups: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2730', docs: { description: { story: 'Edge case (A9, Q5). The story runs the Home eligibility check (PIN 110001, income 75000) and the API answers "none eligible". There is no result sheet and no message, and the list regroups with every card under Ineligible. The story stops after the Check tap; wait about 8 seconds.' } } },
  render: () => <Home a={api.ok({ eligibility: eligibilityFixture.noneEligible })} steps={checkSteps} />,
};

/** The section header of the eligibility groups, rebuilt (it is private to HomeScreen). */
const SectionRule = ({ label }: { label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
    <Text variant="body14SemiBold" color={colors.text.secondary}>{label}</Text>
    <View style={{ flex: 1, height: borderWidth.thin, backgroundColor: colors.border.default }} />
  </View>
);

/** A card tile as Home builds it (fees show the GST-inclusive amount). */
const Tile = ({ card }: { card: (typeof MODELS)[number] }) => (
  <CardTile
    type="full"
    cardImage={card.cardImage}
    cardName={card.name}
    cashbackText={card.cashbackValue}
    rewardPrefix={card.rewardPrefix}
    inviteOnly={card.inviteOnly}
    tags={card.tags}
    benefits={card.tileBenefits}
    feeType={card.feeType}
    feeProps={{ joiningFee: card.detail?.fee.joining.amount ?? card.joiningFee, annualFee: card.detail?.fee.annual.amount ?? card.annualFee, joiningSub: card.detail?.fee.joining.sub || undefined, annualSub: card.detail?.fee.annual.sub || undefined }}
  />
);

/** Proposed: no eligible card, with a way forward. */
export const NoneEligibleProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/HomeScreen.tsx:1570', docs: { description: { story: 'Proposal for A9. InlineMessage, tone info, "No card fits these details yet. Edit your details or see cards you are closer to.", action "Edit details", then the Ineligible group as today. Open question Q5: show a message and a path (edit details, Cards you can get), or keep the plain Ineligible list? The "see cards you are closer to" link has no destination yet.' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <HomeHeader scrolled />
        <View style={{ padding: spacing[16], gap: spacing[16] }}>
          <InlineMessage tone="info" message="No card fits these details yet. Edit your details or see cards you are closer to." action="single" primaryActionLabel="Edit details" />
          <SectionRule label={`Ineligible Cards ${MODELS.length}`} />
          <Tile card={MODELS[0]} />
        </View>
      </View>
    </PhoneFrame>
  ),
};

/** A background refresh fails while cards are on screen: the error block stacks over the list (A14). Not seen in a browser. */
export const RefetchFailedWithCache: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2244', docs: { description: { story: 'Edge case (A14, Q4, inferred from code, not seen in a browser). The story seeds the card list in the cache, then 2 seconds after mount it refetches the cards, as the app does when the user comes back to Home. The call answers 500. Because the screen reads isError before the data, the "Couldn\'t load cards" block may show over a good list. Check the console line "[storybook] api GET ... cards".' } } },
  render: () => (
    <Home
      a={api.ok({ cards: reply.error(500) })}
      beforeMount={() => { queryClient.setQueryData(cardsQueryKey, { all: MODELS, shown: MODELS, filterOn: false }); }}
      steps={[[2000, () => { void queryClient.refetchQueries({ queryKey: cardsQueryKey }); }]]}
    />
  ),
};

/** Proposed: a failed refresh keeps the list and warns. */
export const RefetchFailedProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2244', docs: { description: { story: 'Proposal for A14. InlineMessage, tone warning, "Couldn\'t refresh cards. Showing what we loaded earlier.", action "Try again", above the cards the user already has. Open question Q4: keep the old list with a warning, or replace it with the error state?' } } },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: colors.surface.default }}>
        <HomeHeader scrolled />
        <View style={{ padding: spacing[16], gap: spacing[16] }}>
          <InlineMessage tone="warning" message="Couldn't refresh cards. Showing what we loaded earlier." action="single" primaryActionLabel="Try again" />
          <Tile card={MODELS[0]} />
        </View>
      </View>
    </PhoneFrame>
  ),
};

/** The session expires while Home is open: the login sheet opens by itself. */
export const SessionExpiredOnHome: Story = {
  tags: ['live'],
  parameters: { source: 'src/auth/LoginSheetProvider.tsx:427', docs: { description: { story: 'Edge case. Signed-in user, every user call answers 401 and the refresh is rejected. The app drops to guest and opens the login sheet over Home with its usual title; nothing says why (see the proposal in Login sheet). The harness reports the sheet open; it has not been seen in a visible browser.' } } },
  render: () => <Home a={api.ok()} auth="sessionExpired" />,
};

/** Cards whose art is missing or does not load. */
export const BrokenCardArt: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:327', docs: { description: { story: 'Edge case. Two cards come with an empty image and with an image address that fails to load. The tile keeps its art slot; check that the tile still reads clearly without art.' } } },
  render: () => (
    <Home a={api.ok({ cards: { ...cardsFixture.default, data: BK_CARDS.map((c, i) => (i === 0 ? { ...c, image: '' } : i === 1 ? { ...c, image: 'https://storybook.invalid/none.png' } : c)) } })} />
  ),
};

/** One card in the catalogue. */
export const OneCard: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2320', docs: { description: { story: 'Edge case. The catalogue returns one active card. Check the section titles and the "More to explore" block with a single tile.' } } },
  render: () => <Home a={api.ok({ cards: { ...cardsFixture.default, data: BK_CARDS.slice(0, 1) } })} />,
};

/** 200 cards: a long list. */
export const ManyCards: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/HomeScreen.tsx:2320', docs: { description: { story: 'Edge case. The catalogue returns 200 cards (the first 10 active ones repeated with new ids and aliases). Scroll to check the list stays smooth and the sections keep their order.' } } },
  render: () => {
    const base = BK_CARDS.filter((c) => c.status);
    const data = Array.from({ length: 200 }, (_, i) => { const c = base[i % base.length]; return { ...c, id: 5000 + i, card_alias: `${c.card_alias}-copy-${i}` }; });
    return <Home a={api.ok({ cards: { ...cardsFixture.default, data } })} />;
  },
};

/** Long card and bank names on the small Android viewport (360 dp). */
export const LongNames360: Story = {
  tags: ['live'],
  globals: { viewport: { value: 'android360', isRotated: false } },
  parameters: { source: 'src/screens/HomeScreen.tsx:327', docs: { description: { story: 'Edge case at 360 dp. Pinned to the Android small viewport. One card name and its bank name (bank id 6, HDFC Bank) are 71 characters long. Check the tile name, the tags and the fee strip for clipping or overlap.' } } },
  render: () => {
    const long = 'HDFC Bank Regalia Gold Premium Lifetime Free Travel Rewards Credit Card';
    const data = BK_CARDS.map((c, i) => (i === 0 ? { ...c, name: long } : c));
    const bank_data = initBundleFixture.default.data.bank_data.map((b) => (b.id === 6 ? { ...b, name: 'HDFC Bank Limited Retail Banking and Credit Cards Division India Mumbai' } : b));
    return <Home width={360} height={800} a={api.ok({ cards: { ...cardsFixture.default, data }, initBundle: { ...initBundleFixture.default, data: { ...initBundleFixture.default.data, bank_data } } })} />;
  },
};
