/**
 * BeatMyCardResultScreen: "Beat my card", result: the user's card against the best other card.
 *
 * The result is never passed through navigation: the screen reads `useCardSavings(spends)` and runs
 * `beatMyCard` on the filtered league. One template for every outcome (other card wins, your card
 * wins, tie): hero, podium, line table, savings by category, actions. States kept from the old
 * screen: loading, offline, error, and "card not in the list".
 *
 * The opponent is the best card that is not the user's card in the FILTERED list. The user's own
 * card is found in the full list, so a filter never hides it. Apply never shows for the user's own
 * card, and never for a card the app does not list.
 *
 * FILTERED includes the card rule (leagueForDisplay, owner rule D-A, 2026-11-24, mapped only): the
 * opponent and the "cards that beat yours" lists hold only cards that match a CashKaro store row. The
 * user's own card needs no CashKaro rate: it always gets its verdict. While the cards list loads, the
 * loading state shows; when it fails with nothing cached (cardsError), an error. Never the unfiltered
 * league.
 *
 * Under the hero, "Based on <categories>" (the categories picked on the spends page that have a spend)
 * opens the edit sheet with only those categories' questions; its "+ Add a category" row goes back to
 * the spends page, where the chips are. An edit here keeps the categories as they were.
 *
 * Analytics: the result view once (verdict, load_ms), the error once, a select on card details.
 * Never a spend amount and never the name or id of the user's card.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button, Skeleton, Chip, Tag, RemoteImage } from '../../atoms';
import { PodiumCompare, BreakdownTable, RankedCardRow, Accordion } from '../../molecules';
import type { CardModel } from '../../molecules';
import { EditSpendsSheet, Header, ScreenState, CARD_THUMB_ASPECT } from '../../organisms';
import type { EditSpendsSheetHandle } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import { leagueForDisplay } from '../../api/cardRates';
import { rewardLabel } from '../../api/cardMapper';
import type { LeagueRow } from '../../query/useCardSavings';
import { useSavedSpends } from '../../lib/savedSpends';
import {
  DEFAULT_LEAGUE_FILTERS,
  beatMyCard,
  buildSpends,
  filterLeague,
  hasAnySpend,
  totalYearlySpend,
} from '../../lib/cardTools';
import type { BeatRow, LeagueFilters, SpendKey } from '../../lib/cardTools';
import {
  beatTableRows,
  bestApplicable,
  heroKind,
  heroTitle,
  lineDetail,
  pickName,
  rowFooter,
  rowWinner,
  waivedNote,
  winLine,
} from '../../lib/beatView';
import type { ClickOutSource } from '../../lib/useClickOut';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import { formatINR } from '../../lib/money';
import { basedOnText } from '../../lib/beatFlow';
import { keysForCategories } from '../../lib/toolFlows';
import { shortCardName } from '../../lib/crossSellPresent';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardResult'>;
type Rt = RouteProp<RootStackParamList, 'BeatMyCardResult'>;

const TOOL = 'beat';
const SOURCE: ClickOutSource = 'beat_my_card';
const NOT_FOUND_SHOWN = 3;
const HERO_ART_W = spacing[96];

function artSource(row: LeagueRow) {
  return row.card ? row.card.cardImage : row.savings.imageUrl ? { uri: row.savings.imageUrl } : {};
}

/** One category: both amounts, the winner, and the why behind a toggle. */
function CategoryCompare({
  row,
  otherName,
  onEdit,
}: {
  row: BeatRow;
  otherName: string;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const winner = rowWinner(row);
  const footer = rowFooter(row, otherName);
  const cell = (who: string, amount: number, wins: boolean) => (
    <View style={{ flex: 1, gap: spacing[2] }}>
      <Text variant="caption10Medium" color={colors.text.secondary} numberOfLines={1}>
        {who}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}>
        <Text
          variant="heading18SemiBold"
          color={wins ? colors.feedback.success.text : colors.text.primary}
        >
          {formatINR(amount)}
        </Text>
        {wins ? <Tag label="Wins" size="xxs" tone="success" /> : null}
      </View>
    </View>
  );
  const body = [
    lineDetail('Your card', row.mineLine, row.mine),
    lineDetail(otherName, row.bestLine, row.best),
  ].join('\n\n');
  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.surface.default,
        padding: spacing[16],
        gap: spacing[12],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="body14SemiBold" color={colors.text.primary}>
            {row.label}
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {`Your spend: ${formatINR(row.spendYearly)} a year`}
          </Text>
        </View>
        <Chip label="Edit" size={24} leadingIcon="edit-outline" onPress={onEdit} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[12] }}>
        {cell('Your card', row.mine, winner === 'mine')}
        {cell(otherName, row.best, winner === 'other')}
      </View>
      {footer ? (
        <Text variant="body12SemiBold" color={colors.text.secondary}>
          {footer}
        </Text>
      ) : null}
      <Accordion
        state="bare"
        title={open ? 'Hide the details' : 'Show the details'}
        body={body}
        expanded={open}
        onToggle={setOpen}
        style={{ paddingVertical: 0 }}
      />
    </View>
  );
}

export function BeatMyCardResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { cardAlias, categories } = params;
  const insets = useSafeAreaInsets();

  const [answers, setAnswers] = useState(params.answers);
  const [spends, setSpends] = useState(params.spends);
  // New params (e.g. the league table edited the spends) replace local state.
  useEffect(() => {
    setAnswers(params.answers);
    setSpends(params.spends);
  }, [params.answers, params.spends]);
  const [filters, setFilters] = useState<LeagueFilters>(DEFAULT_LEAGUE_FILTERS);
  const { save } = useSavedSpends();
  const editRef = useRef<EditSpendsSheetHandle>(null);
  // Memoized: the sheet rebuilds its list when the `keys` array changes.
  const editKeys = useMemo(() => keysForCategories(categories), [categories]);
  const basedOn = basedOnText(categories, answers);

  const { league, shown, isLoading, isOffline, isError, cardsError, cardsNoMatch, refetch, loadMs } =
    useCardSavings(spends);
  const { openCard, applyCard, sheets } = useCardDetailSheet(SOURCE);

  // The app lists no card at all (mapped only): there is no opponent.
  const noShownCards = !!shown && shown.ids.size === 0;
  // cardsError: the card rule cannot run. Either state: no verdict (and no verdict event).
  const loaded = !isLoading && !isOffline && !isError && !cardsError && !noShownCards;
  // The card rule first (display only), then the chips. The user's own card always stays.
  const filtered = useMemo(
    () => filterLeague(leagueForDisplay(league, shown, cardAlias), filters),
    [league, shown, cardAlias, filters],
  );
  const mineRow = useMemo(() => league.find((r) => r.savings.alias === cardAlias), [league, cardAlias]);
  const result = useMemo(
    () =>
      loaded && mineRow
        ? beatMyCard(
            filtered.map((r) => r.savings),
            cardAlias,
            league.map((r) => r.savings),
          )
        : null,
    [loaded, mineRow, filtered, league, cardAlias],
  );
  const otherRow = result ? filtered.find((r) => r.savings.alias === result.best.alias) : undefined;
  const noSpend = !hasAnySpend(spends);
  // All spends 0 is not "card not found": no verdict is tracked for it.
  const verdict = loaded && !noSpend ? (!mineRow ? 'not_found' : result ? result.verdict : null) : null;

  // Analytics: once each. No spends, no name of the user's card.
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!verdict || viewTracked.current) return;
    viewTracked.current = true;
    analytics.track(Events.BEAT_RESULT_VIEW, { verdict, ...(loadMs !== undefined ? { load_ms: loadMs } : {}) });
  }, [verdict, loadMs]);
  const errorTracked = useRef(false);
  useEffect(() => {
    if (!isError || errorTracked.current) return;
    errorTracked.current = true;
    analytics.track(Events.TOOL_RESULT_ERROR, { tool: TOOL });
  }, [isError]);

  const openDetail = (row: LeagueRow, pager: CardModel[]) => {
    if (!row.card) return;
    analytics.track(Events.TOOL_RESULT_SELECT, { tool: TOOL, item_id: row.card.id, rank: row.rank });
    openCard(row.card, pager);
  };

  const onSubmitSpends = (next: Partial<Record<SpendKey, number>>) => {
    setAnswers(next);
    setSpends(buildSpends(next));
    save(next);
  };

  const rankedRow = (r: LeagueRow, pager: CardModel[]) =>
    r.card ? (
      <RankedCardRow
        key={r.savings.alias}
        rank={r.rank}
        cardImage={r.card.cardImage}
        name={r.card.name}
        headline={{ label: 'Annual savings', amount: r.savings.netYearly, period: 'year' }}
        onPress={() => openDetail(r, pager)}
      />
    ) : null;

  const filterChips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
      <Chip
        label="Lifetime free"
        size={32}
        state={filters.lifetimeFreeOnly ? 'selected' : 'default'}
        onPress={() => setFilters((f) => ({ ...f, lifetimeFreeOnly: !f.lifetimeFreeOnly }))}
      />
      <Chip
        label="Include invite only"
        size={32}
        state={filters.includeInviteOnly ? 'selected' : 'default'}
        onPress={() => setFilters((f) => ({ ...f, includeInviteOnly: !f.includeInviteOnly }))}
      />
    </View>
  );

  // Back to the pick screen with the spends as they are now (they may have been edited here).
  const tryAnother = () => navigation.popTo('BeatMyCardPick');

  let content: React.ReactNode;
  if (noSpend) {
    content = (
      <ScreenState
        title="Enter at least one spend"
        body="Every spend is 0 now, so there is nothing to compare."
        actionLabel="Edit spends"
        onAction={() => editRef.current?.present()}
      />
    );
  } else if (isLoading) {
    content = (
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16], gap: spacing[16] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>
          Checking every card against your spends. This can take up to a minute.
        </Text>
        <Skeleton height={spacing[96] + spacing[96]} radius="xl" />
        <Skeleton height={spacing[128]} radius="xl" />
        <Skeleton height={spacing[48]} radius="lg" />
      </View>
    );
  } else if (isOffline) {
    content = (
      <ScreenState
        title="You're offline"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (isError) {
    content = (
      <ScreenState
        title="Couldn't compare cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (cardsError) {
    // cardsNoMatch: no card matched a CashKaro store; not the connection.
    content = cardsNoMatch ? (
      <ScreenState
        title="Cards aren't available right now"
        body="Please try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    ) : (
      <ScreenState
        title="Couldn't load cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (noShownCards) {
    // Not a filter result: "Clear filters" would not help.
    content = (
      <ScreenState
        title="No cards are available right now"
        body="Please check back a little later."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else {
    let body: React.ReactNode;

    if (!mineRow) {
      // The card is not in the list the calculate call returned.
      const top = filtered
        .filter((r) => !!r.card && r.savings.alias !== cardAlias && r.savings.netYearly > 0)
        .slice(0, NOT_FOUND_SHOWN);
      const pager = top.map((t) => t.card as CardModel);
      body = (
        <View style={{ gap: spacing[16] }}>
          <View style={{ gap: spacing[4] }}>
            <Text variant="heading18SemiBold" color={colors.text.primary}>
              We can't compare this card yet
            </Text>
            <Text variant="body14Regular" color={colors.text.secondary}>
              {top.length > 0
                ? 'It is not in the list we can compare. These are the best cards for your spends.'
                : 'It is not in the list we can compare, and no other card saves you money on these spends after its fee.'}
            </Text>
          </View>
          {top.map((t) => rankedRow(t, pager))}
          <Button label="Try another card" variant="outline" tone="main" size={52} fullWidth onPress={tryAnother} />
        </View>
      );
    } else if (!result || !otherRow) {
      body = (
        <View style={{ gap: spacing[16] }}>
          {filterChips}
          <ScreenState
            title="No card matches these filters"
            body="Clear the filters to compare your card with the best other card."
            actionLabel="Clear filters"
            onAction={() => setFilters(DEFAULT_LEAGUE_FILTERS)}
          />
        </View>
      );
    } else {
      const kind = heroKind(result.verdict);
      const mine = result.mine;
      const other = result.best;
      const otherName = shortCardName(pickName(otherRow));
      const myName = shortCardName(pickName(mineRow));
      const heroRow = kind === 'other_wins' ? otherRow : mineRow;
      const heroName = kind === 'other_wins' ? otherName : myName;
      const win = winLine(result.gapYearly, otherName);
      const note = waivedNote(mine, other, otherName);
      const spendLabel = `Annual spends: ${formatINR(totalYearlySpend(spends))} a year`;
      const otherSaves = other.netYearly > 0;
      const applyRow = otherRow.card ? undefined : bestApplicable(filtered, cardAlias, mine.netYearly);

      body = (
        <View style={{ gap: spacing[16] }}>
          {filterChips}

          <Animated.View
            key={kind}
            entering={FadeInDown.duration(400)}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${heroTitle(kind)}. ${heroName}`}
            style={{
              alignItems: 'center',
              gap: spacing[8],
              padding: spacing[16],
              borderRadius: radius.xl,
              backgroundColor: kind === 'tie' ? colors.surface.sunken2 : colors.feedback.success.subtle,
            }}
          >
            <Text
              variant="heading18SemiBold"
              color={kind === 'tie' ? colors.text.primary : colors.feedback.success.text}
            >
              {heroTitle(kind)}
            </Text>
            {kind !== 'tie' ? (
              <>
                <RemoteImage
                  source={artSource(heroRow)}
                  style={{
                    width: HERO_ART_W,
                    aspectRatio: CARD_THUMB_ASPECT,
                    borderRadius: radius.sm,
                    backgroundColor: colors.surface.sunken,
                  }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
                <Text variant="body14SemiBold" color={colors.text.primary} align="center">
                  {kind === 'mine_wins' ? `${heroName} (your card)` : heroName}
                </Text>
              </>
            ) : null}
          </Animated.View>

          {basedOn ? (
            <Pressable
              onPress={() => editRef.current?.present()}
              accessibilityRole="button"
              accessibilityLabel={`${basedOn}. Edit spends`}
              hitSlop={spacing[8]}
              style={{ alignSelf: 'center' }}
            >
              <Text variant="body14SemiBold" color={colors.text.link} align="center">
                {basedOn}
              </Text>
            </Pressable>
          ) : null}

          <View style={{ gap: spacing[8] }}>
            <PodiumCompare
              title="Annual savings"
              contextLabel={spendLabel}
              onContextPress={() => editRef.current?.present()}
              a={{ name: 'Your card', image: artSource(mineRow), value: mine.netYearly }}
              b={{ name: otherName, image: artSource(otherRow), value: other.netYearly }}
            />
            {win ? (
              <Text variant="body14SemiBold" color={colors.text.primary} align="center">
                {win}
              </Text>
            ) : null}
            {mine.netYearly < 0 || other.netYearly < 0 ? (
              <Text variant="body12Regular" color={colors.text.secondary}>
                A value below zero means the annual fee is more than the savings.
              </Text>
            ) : null}
          </View>

          <BreakdownTable
            rows={beatTableRows(mine, other)}
            headers={{ label: 'Per year', a: 'Your card', b: 'Other card' }}
            totalLabel="Your annual savings"
            total={{ a: mine.netYearly, b: other.netYearly }}
          />
          {note ? (
            <Text variant="body12Regular" color={colors.text.secondary}>
              {note}
            </Text>
          ) : null}

          {result.rows.length > 0 ? (
            <View style={{ gap: spacing[12] }}>
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                Savings by category
              </Text>
              {result.rows.map((r) => (
                <CategoryCompare
                  key={r.key}
                  row={r}
                  otherName={otherName}
                  onEdit={() => editRef.current?.present(r.key as SpendKey)}
                />
              ))}
            </View>
          ) : null}

          <View style={{ gap: spacing[8] }}>
            {kind === 'other_wins' && otherRow.card ? (
              <>
                {rewardLabel(otherRow.card) ? (
                  <View style={{ gap: spacing[2] }}>
                    <Text variant="caption10Medium" color={colors.text.secondary}>
                      CashKaro Rewards
                    </Text>
                    <Text variant="body14SemiBold" color={colors.text.primary}>
                      {rewardLabel(otherRow.card)}
                    </Text>
                  </View>
                ) : null}
                {/* No Apply for a card that also loses money on these spends. */}
                {otherSaves ? (
                  <Button
                    label="Apply now"
                    variant="solid"
                    tone="main"
                    size={52}
                    fullWidth
                    onPress={() => otherRow.card && applyCard(otherRow.card)}
                  />
                ) : null}
                <Button
                  label="View card details"
                  variant="outline"
                  tone="main"
                  size={52}
                  fullWidth
                  onPress={() => openDetail(otherRow, [otherRow.card as CardModel])}
                />
              </>
            ) : null}
            {kind === 'other_wins' && !otherRow.card ? (
              <>
                <Text variant="body14Regular" color={colors.text.secondary}>
                  You cannot apply for this card in this app.
                </Text>
                {applyRow?.card ? (
                  <View style={{ gap: spacing[8] }}>
                    <Text variant="body14SemiBold" color={colors.text.primary}>
                      Best card you can apply for here
                    </Text>
                    {rankedRow(applyRow, [applyRow.card])}
                    <Button
                      label="Apply now"
                      variant="solid"
                      tone="main"
                      size={52}
                      fullWidth
                      onPress={() => applyRow.card && applyCard(applyRow.card)}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
            {kind === 'mine_wins' ? (
              <Text variant="body14SemiBold" color={colors.text.primary}>
                Keep your card. No card beats it on these spends.
              </Text>
            ) : null}
            {kind === 'tie' ? (
              <Text variant="body14SemiBold" color={colors.text.primary}>
                Keep your card. No card beats it on these spends, and one ties it.
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing[8] }}>
            <Button
              label="See the full ranking"
              variant="outline"
              tone="main"
              size={52}
              fullWidth
              onPress={() =>
                navigation.navigate('ToolResults', {
                  tool: 'beat',
                  spends,
                  answers,
                  title: 'All cards, ranked',
                  highlightAlias: cardAlias,
                })
              }
            />
            <Button label="Try another card" variant="outline" tone="main" size={52} fullWidth onPress={tryAnother} />
          </View>
        </View>
      );
    }

    content = (
      <ScrollView
        contentContainerStyle={{
          padding: spacing[16],
          gap: spacing[24],
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {body}
        <Text variant="body12Regular" color={colors.text.tertiary}>
          Estimates from the spends you entered, per year after the annual fee. A fee the bank waives at your spend is
          not counted, and lounge visits you entered are included. CashKaro Rewards are extra.
        </Text>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Beat my card" onLeadingPress={() => navigation.goBack()} />
      {content}
      {sheets}
      <EditSpendsSheet
        ref={editRef}
        keys={editKeys}
        answers={answers}
        onSubmit={onSubmitSpends}
        onAddCategory={() => {
          editRef.current?.dismiss();
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}
