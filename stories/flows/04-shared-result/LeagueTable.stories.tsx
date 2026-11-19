import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../../src/screens/tools/ToolResultsScreen';
import { View } from 'react-native';
import { InlineMessage } from '../../../src/molecules';
import { Skeleton, Tag, Text } from '../../../src/atoms';
import { mapCalculateResponse, rankByNetValue, spendsKey } from '../../../src/lib/cardTools';
import { queryClient } from '../../../src/query/queryClient';
import { colors, radius, spacing } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness, routeParams } from '../../../storybook/harness';
import { api, calculateFixture, reply, spends, spendsFixture } from '../../../storybook/fixtures';
import {
  ANSWERS, SPENDS, TapScript, calcAllLose, calcAllPaid, calcLarge, calcNoArt, calcNullFee, calcOneCard, e500,
} from './_shared';

const meta: Meta = {
  title: 'Flows/4 Shared result/League table',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/tools/ToolResultsScreen.tsx';
const params = routeParams('ToolResults', { tool: 'ultimate', spends: SPENDS, answers: ANSWERS, title: 'Your best cards' });
const table = (a: ReturnType<typeof api.ok>) => <ScreenHarness name="ToolResults" component={ToolResultsScreen} params={params} api={a} />;

export const Loading: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:522`, docs: { description: { story: 'The calculate call never answers: four skeleton rows and the line "Checking every card against your spends. This can take up to a minute."' } } },
  render: () => table(api.loading()),
};

export const Loaded: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:176`, docs: { description: { story: 'Nine rows from the UAT calculate fixture in rank order. Controls on top: annual spends pill, "Search", "Lifetime free", "Include invite only", Quick view and By category tabs, sort chips. Rank 1 (CRED IndusInd) is a card the app does not list.' } } },
  render: () => table(api.ok()),
};

export const ByCategory: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:176`, docs: { description: { story: 'The "By category" tab, reached by one tap after mount: one savings column per spend the user entered.' } } },
  render: () => (
    <>
      {table(api.ok())}
      <TapScript steps={[{ click: 'By category' }]} />
    </>
  ),
};

export const Offline: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:536`, docs: { description: { story: '"You\'re offline" with "Try again". The query is paused, not failed. This is the only league state that handles the paused case; most other screens show a false empty state (see the offline finding in the UX audit).' } } },
  render: () => table(api.offline()),
};

export const Error: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:545`, docs: { description: { story: '"Couldn\'t load your cards" with "Try again". The calculate call answers 500; the state shows after the call\'s one retry.' } } },
  render: () => table(api.ok({ calculate: reply.error(500) })),
};

export const Empty: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:554`, docs: { description: { story: 'The calculate call answers with no rows: "No cards came back for these spends" with "Try again".' } } },
  render: () => table(api.ok({ calculate: calculateFixture.empty })),
};

export const NoFilterMatch: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:563`, docs: { description: { story: 'The calculate answer is cut to cards that have a joining fee, then "Lifetime free" is tapped after mount: "No card matches these filters" with "Clear filters".' } } },
  render: () => (
    <>
      {table(api.ok({ calculate: calcAllPaid() }))}
      <TapScript steps={[{ click: 'Lifetime free' }]} />
    </>
  ),
};

/** R7: a row for a card the app cannot sell. */
export const RowNotInApp: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:176`,
    docs: {
      description: {
        story:
          'Risk R7 (decision D27, directional). The first row (CRED IndusInd) is not in the app list, so it has no card page. The row is tapped after mount and the breakdown sheet says "You cannot apply for this card in this app." with no Apply. Open question: keep rows the app cannot sell?',
      },
    },
  },
  render: () => (
    <>
      {table(api.ok())}
      <TapScript steps={[{ click: 'CRED IndusInd', prefix: true }]} startMs={1800} />
    </>
  ),
};

// ── Edge cases and loaders ───────────────────────────────────────────────────

/** The calculate call fails more times than the app retries (2 calls), so the error state shows; "Try again" then gets the fixture. */
const RETRY_FIXTURE = reply.sequence(e500, e500, calculateFixture.league);

export const RetryAfterError: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:542`,
    docs: { description: { story: 'The calculate call answers 500 twice (the first call and the transport\'s one retry), so "Couldn\'t load your cards" shows. "Try again" is tapped after about 3 s; the third call answers with the fixture and the list loads.' } },
  },
  render: () => (
    <>
      {table(api.ok({ calculate: RETRY_FIXTURE }))}
      <TapScript steps={[{ wait: 2500 }, { click: 'Try again' }]} />
    </>
  ),
};

export const RecalculatingAfterEdit: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:332`,
    docs: { description: { story: 'The first calculate call answers; the second never does. After mount the script opens "Annual spends", types 12000 into the Amazon amount and taps "Update results": new spends give a new query key, so the shown list is thrown away and the skeleton returns (gap G8: the old result is not kept).' } },
  },
  render: () => (
    <>
      {table(api.ok({ calculate: reply.once(calculateFixture.league, reply.hang()) }))}
      <TapScript
        steps={[{ click: 'Annual spends', prefix: true }, { wait: 1200 }, { type: '12000', into: 'Amazon amount' }, { click: 'Update results' }]}
        startMs={1800}
      />
    </>
  ),
};

export const AllSpendsZero: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:513`, docs: { description: { story: 'Every spend is 0: "Enter at least one spend" with "Edit spends". No calculate call is made.' } } },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={routeParams('ToolResults', { tool: 'ultimate', spends: spendsFixture.none, answers: {}, title: 'Your best cards' })}
      api={api.ok()}
    />
  ),
};

export const OneCard: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:578`, docs: { description: { story: 'The calculate answer has one row. App bug (gap G10): the header reads "1 cards".' } } },
  render: () => table(api.ok({ calculate: calcOneCard() })),
};

export const LargeLeague: Story = {
  tags: ['live'],
  parameters: {
    source: `${SRC}:583`,
    docs: { description: { story: 'The 9 fixture rows cloned to 220 with new aliases; savings fall by ₹25 a row, so the order is the row order. FlatList windows the list. This is a web render, not proof of scroll cost on a low-end phone.' } },
  },
  render: () => table(api.ok({ calculate: calcLarge(220) })),
};

export const SearchNoMatch: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:428`, docs: { description: { story: '"Search" is tapped after mount and "zzz" typed into "Find a card or bank": the counter reads "No match".' } } },
  render: () => (
    <>
      {table(api.ok())}
      <TapScript steps={[{ click: 'Search' }, { type: 'zzz', into: 'Find a card or bank' }]} startMs={1800} />
    </>
  ),
};

export const AllLoseMoney: Story = {
  tags: ['live'],
  parameters: { source: 'src/molecules/LeagueCardRow.tsx:156', docs: { description: { story: 'One small spend (₹100 on water bills) and a calculate answer where every row saves 0 a year: cards with a fee show a negative annual figure ("-₹X") in the primary text colour.' } } },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={routeParams('ToolResults', { tool: 'ultimate', spends: spends({ water_bills: 100 }), answers: { water_bills: 100 }, title: 'Your best cards' })}
      api={api.ok({ calculate: calcAllLose() })}
    />
  ),
};

export const CardArtMissing: Story = {
  tags: ['live'],
  parameters: { source: 'src/molecules/LeagueCardRow.tsx:130', docs: { description: { story: 'The CRED row (not in the app) has no `image` and no `card_bg_image` in the calculate answer, so its art slot is an empty sunken box.' } } },
  render: () => table(api.ok({ calculate: calcNoArt() })),
};

export const NullFeeShowsLifetimeFree: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/lib/cardTools.ts:580',
    docs: { description: { story: 'App bug (gap G3, P1 trust). The first row has `annual_fees: null` and `joining_fees: null`. The mapper reads null as 0, so the card gets the "Lifetime free" tag and passes the "Lifetime free" filter, a money claim the data does not make. See the proposed twin.' } },
  },
  render: () => table(api.ok({ calculate: calcNullFee() })),
};

export const CatalogueFailedNoApply: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/query/useCardSavings.ts:70',
    docs: { description: { story: 'App bug (gap G1, P0 money and attribution). The card catalogue answers 500 while the calculate call works, so no row has an app card. After about 3 s the HSBC row is tapped: the sheet says "You cannot apply for this card in this app." for a card the app sells. Real reach: only when the catalogue never loaded this session.' } },
  },
  render: () => (
    <>
      {table(api.ok({ cards: e500 }))}
      <TapScript steps={[{ click: 'HSBC', prefix: true }]} startMs={3500} />
    </>
  ),
};

export const CatalogueSlowNoApply: Story = {
  tags: ['live'],
  parameters: { source: 'src/query/useCardSavings.ts:70', docs: { description: { story: 'Gap G1, slow variant. The card catalogue never answers: every row shows without Apply and the screen cannot tell the catalogue is still loading.' } } },
  render: () => table(api.ok({ cards: reply.hang() })),
};

export const OfflineWithCache: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/query/useCardSavings.ts:124',
    docs: { description: { story: 'The phone is offline, but the same spends were calculated earlier: the story seeds the query cache before the screen mounts. The cached list shows (the hook is not "offline" when it has data). The global offline banner is not mounted in this harness.' } },
  },
  render: () => (
    <ScreenHarness
      name="ToolResults"
      component={ToolResultsScreen}
      params={params}
      api={api.offline()}
      beforeMount={() => {
        queryClient.setQueryData(['bk', 'calculate', spendsKey(SPENDS)], {
          list: rankByNetValue(mapCalculateResponse(calculateFixture.league)),
          loadMs: 0,
        });
      }}
    />
  ),
};

export const Width360: Story = {
  tags: ['live'],
  globals: { viewport: { value: 'android360', isRotated: false } },
  parameters: { source: `${SRC}:449`, docs: { description: { story: 'Pinned to the Android 360 dp viewport, with the "By category" tab tapped after mount. The sort chips and filter row scroll sideways; the category cells wrap.' } } },
  render: () => (
    <>
      <ScreenHarness name="ToolResults" component={ToolResultsScreen} params={params} width={360} api={api.ok()} />
      <TapScript steps={[{ click: 'By category' }]} />
    </>
  ),
};

// ── Proposed ─────────────────────────────────────────────────────────────────

const Rows = ({ names }: { names: string[] }) => (
  <View style={{ gap: spacing[8] }}>
    {names.map((n) => (
      <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing[12], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.subtle3, backgroundColor: colors.surface.default }}>
        <Text variant="body14SemiBold" color={colors.text.primary}>{n}</Text>
        <Text variant="body14SemiBold" color={colors.text.primary}>₹X a year</Text>
      </View>
    ))}
  </View>
);

export const StillCheckingProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G6, Q8). The wait line says "up to a minute", but the worst case is about 90 s (two 45 s timeouts). After 20 s the screen adds this line under the wait line; the skeletons stay. Open question Q8: is 20 s the right "taking longer" time, and should the user get a cancel? Drawn from the loading state at `ToolResultsScreen.tsx:522`.' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>Checking every card against your spends. This can take up to a minute.</Text>
        <InlineMessage tone="info" message="Still checking. On a slow network this can take up to 2 minutes." />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={spacing[80]} radius="lg" />)}
      </View>
    </PhoneFrame>
  ),
};

export const NullFeeProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G3). A row whose fees are null shows "Fee not known" instead of "Lifetime free", and the row is left out of the "Lifetime free" filter. The row is drawn from DS parts, not from `LeagueCardRow`. Open question: what should the headline net show when the fee is unknown (savings only, or no figure)?' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ padding: spacing[16], gap: spacing[8] }}>
        <View style={{ padding: spacing[12], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.subtle3, gap: spacing[8] }}>
          <View style={{ flexDirection: 'row', gap: spacing[8], alignItems: 'center' }}>
            <View style={{ width: spacing[64], height: spacing[40], borderRadius: radius.sm, backgroundColor: colors.surface.sunken }} />
            <View style={{ flex: 1, gap: spacing[2] }}>
              <Text variant="body14SemiBold" color={colors.text.primary}>HSBC Live Plus Credit Card</Text>
              <Text variant="body12Regular" color={colors.text.secondary}>HSBC Bank</Text>
              <View style={{ flexDirection: 'row', paddingTop: spacing[2] }}><Tag size="xxs" tone="gray" label="Fee not known" /></View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing[6], alignItems: 'baseline' }}>
            <Text variant="body12Regular" color={colors.text.secondary}>Annual savings</Text>
            <Text variant="body16SemiBold" color={colors.text.primary}>₹X</Text>
          </View>
        </View>
      </View>
    </PhoneFrame>
  ),
};

export const CatalogueFailedProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G1, Q1). When the card catalogue fails, the list says so and offers a retry, and the sheet gives the reason instead of "You cannot apply for this card in this app." Open question Q1: hide Apply (today), show a retry, or block the league until the catalogue loads? Needs a catalogue error flag from `useCardSavings` (engineering). The sheet is drawn as a plain panel.' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <InlineMessage tone="warning" message="We couldn't load Apply links. Savings are still correct." action="single" primaryActionLabel="Try again" onPrimaryAction={() => undefined} />
        <Rows names={['HSBC Live Plus Credit Card', 'CRED IndusInd Credit Card']} />
        <View style={{ padding: spacing[16], borderRadius: radius.xl, backgroundColor: colors.surface.sunken, gap: spacing[8] }}>
          <Text variant="body14SemiBold" color={colors.text.primary}>In the breakdown sheet</Text>
          <Text variant="body14Regular" color={colors.text.secondary}>We couldn't load the Apply link for this card. Try again in a moment.</Text>
        </View>
      </View>
    </PhoneFrame>
  ),
};

export const EditOfflineProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Proposed (gap G8, Q4). After "Update results" while offline, the old list stays and a warning sits on top, instead of "You\'re offline" replacing a good list (`ToolResultsScreen.tsx:533`). Needs `placeholderData` on the calculate query (engineering). Open question Q4: keep the old result with a warning, or show the error alone (today)? The rows are simplified.' } },
  },
  render: () => (
    <PhoneFrame background={colors.surface.default}>
      <View style={{ padding: spacing[16], gap: spacing[12] }}>
        <InlineMessage tone="warning" message="You're offline. These results are for your old spends." action="single" primaryActionLabel="Try again" onPrimaryAction={() => undefined} />
        <Rows names={['HSBC Live Plus Credit Card', 'CRED IndusInd Credit Card', 'Kotak Solitaire Credit Card']} />
      </View>
    </PhoneFrame>
  ),
};
