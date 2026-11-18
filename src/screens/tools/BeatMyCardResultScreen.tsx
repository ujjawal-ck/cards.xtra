/**
 * BeatMyCardResultScreen — "Beat my card", result: the user's card against the best other card.
 *
 * The result is never passed through navigation: the screen reads `useCardSavings(spends)` (the same
 * query key the quiz warmed) and runs `beatMyCard` on it. Outcomes:
 *   not_found  the user's card is not in the comparable list: say so, show up to 3 other cards that
 *              save money (net yearly above 0), or none.
 *   best_wins  another card is better: podium, yearly gap, line-by-line table, Apply Now + View details.
 *   mine_wins / equal  the user's card is (as good as) the best. Its net yearly above 0: its yearly
 *              value, then the next best card as one row if that card saves money. Its net yearly 0
 *              or less: say plainly that the fee is larger than the savings, no amount card.
 *
 * Podium: PodiumCompare shows both values and marks no winner when both are 0 or less. A line under it
 * says what a value below zero means.
 *
 * Analytics: never the spend amounts, never the name or id of the user's card (it is kept out of every
 * row and pager). Apply goes through useCardDetailSheet, so through useClickOut.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button, Skeleton } from '../../atoms';
import { PodiumCompare, BreakdownTable, RankedCardRow, BigAmountCard } from '../../molecules';
import type { CardModel } from '../../molecules';
import { Header, ScreenState } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import type { ToolCard } from '../../query/useCardSavings';
import { beatMyCard } from '../../lib/cardTools';
import type { BeatResult } from '../../lib/cardTools';
import type { ClickOutSource } from '../../lib/useClickOut';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import { formatINR } from '../../lib/money';
import { shortCardName } from '../../lib/crossSellPresent';
import { analytics, Events } from '../../analytics';
import type { BreakdownRowData } from '../../lib/breakdownTable';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BeatMyCardResult'>;
type Rt = RouteProp<RootStackParamList, 'BeatMyCardResult'>;

type Verdict = BeatResult['verdict'] | 'not_found';

const TOOL = 'beat';
const SOURCE: ClickOutSource = 'beat_my_card';
const NOT_FOUND_SHOWN = 3;

export function BeatMyCardResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { cardAlias, spends } = params;
  const insets = useSafeAreaInsets();
  const { ranked, isLoading, isOffline, isError, refetch, loadMs } = useCardSavings(spends);
  const { openCard, applyCard, sheets } = useCardDetailSheet(SOURCE);

  const loaded = !isLoading && !isOffline && !isError;
  const result = useMemo(
    () => (loaded ? beatMyCard(ranked.map((r) => r.savings), cardAlias) : null),
    [loaded, ranked, cardAlias],
  );
  const verdict: Verdict | null = loaded ? (result ? result.verdict : 'not_found') : null;

  const byAlias = useMemo(() => new Map(ranked.map((r) => [r.savings.alias, r])), [ranked]);
  const mine = result ? byAlias.get(result.mine.alias) : undefined;
  const best = result ? byAlias.get(result.best.alias) : undefined;

  // The user's card, by either alias. Never listed, never sent to analytics.
  const isMine = (tc: ToolCard) => tc.savings.alias === cardAlias || tc.card.filterMeta?.cardAlias === cardAlias;
  const savesMoney = (tc: ToolCard) => tc.savings.netYearly > 0;

  // Analytics: once each, and the view only for a real result. No spends, no name of the user's card.
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!verdict || viewTracked.current) return;
    viewTracked.current = true;
    // loadMs is undefined when the result came from the cache: leave load_ms out.
    analytics.track(Events.BEAT_RESULT_VIEW, { verdict, ...(loadMs !== undefined ? { load_ms: loadMs } : {}) });
  }, [verdict, loadMs]);
  const errorTracked = useRef(false);
  useEffect(() => {
    if (!isError || errorTracked.current) return;
    errorTracked.current = true;
    analytics.track(Events.TOOL_RESULT_ERROR, { tool: TOOL });
  }, [isError]);

  const openDetail = (tc: ToolCard, pager: CardModel[]) => {
    analytics.track(Events.TOOL_RESULT_SELECT, { tool: TOOL, item_id: tc.card.id, rank: tc.rank });
    openCard(tc.card, pager);
  };

  const rankedRow = (tc: ToolCard, pager: CardModel[]) => (
    <RankedCardRow
      key={tc.savings.alias}
      rank={tc.rank}
      cardImage={tc.card.cardImage}
      name={tc.card.name}
      headline={{ label: 'You save', amount: tc.savings.netYearly, period: 'year' }}
      onPress={() => openDetail(tc, pager)}
    />
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16], gap: spacing[16] }}>
        <Text variant="body14Regular" color={colors.text.secondary}>
          Comparing cards for your spends. This can take up to a minute.
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
  } else {
    let body: React.ReactNode;

    if (verdict === 'not_found' || !result || !mine || !best) {
      const top = ranked.filter((r) => !isMine(r) && savesMoney(r)).slice(0, NOT_FOUND_SHOWN);
      const pager = top.map((t) => t.card);
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
        </View>
      );
    } else if (verdict === 'best_wins') {
      const mineVal = mine.savings.netYearly;
      const bestVal = best.savings.netYearly;
      const rows: BreakdownRowData[] = result.rows.map((r) => ({ label: r.label, a: r.mine, b: r.best }));
      if (result.mine.extraBenefits > 0 || result.best.extraBenefits > 0) {
        rows.push({ label: 'Other benefits', a: result.mine.extraBenefits, b: result.best.extraBenefits });
      }
      if (result.mine.annualFee > 0 || result.best.annualFee > 0) {
        rows.push({ label: 'Annual fee', a: -result.mine.annualFee, b: -result.best.annualFee });
      }
      body = (
        <View style={{ gap: spacing[16] }}>
          <Text variant="heading18SemiBold" color={colors.text.primary}>
            {bestVal > 0
              ? `${shortCardName(best.card.name)} can save you ${formatINR(result.gapYearly)} more a year`
              : 'No card saves you money on these spends after its fee'}
          </Text>
          <View style={{ gap: spacing[8] }}>
            <PodiumCompare
              title="Net a year"
              a={{ name: 'Your card', image: mine.card.cardImage, value: mineVal }}
              b={{ name: 'Best card', image: best.card.cardImage, value: bestVal }}
            />
            {mineVal < 0 || bestVal < 0 ? (
              <Text variant="body12Regular" color={colors.text.secondary}>
                A value below zero means the annual fee is more than the savings.
              </Text>
            ) : null}
          </View>
          <BreakdownTable
            rows={rows}
            headers={{ label: 'Per year', a: 'Your card', b: 'Best card' }}
            totalLabel="Net a year"
            total={{ a: mineVal, b: bestVal }}
          />
          <View style={{ gap: spacing[8] }}>
            {/* No Apply for a card that also loses money on these spends. */}
            {bestVal > 0 ? (
              <Button label="Apply Now" variant="solid" tone="main" size={52} fullWidth onPress={() => applyCard(best.card)} />
            ) : null}
            <Button
              label="View details"
              variant="outline"
              tone="main"
              size={52}
              fullWidth
              onPress={() => openDetail(best, [best.card])}
            />
          </View>
        </View>
      );
    } else {
      // mine_wins or equal. The next best row only when that card saves money.
      const mineName = shortCardName(mine.card.name);
      const mineSaves = savesMoney(mine);
      const next = !isMine(best) && savesMoney(best) ? best : null;
      body = (
        <View style={{ gap: spacing[16] }}>
          {mineSaves ? (
            <>
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                {verdict === 'equal'
                  ? `${mineName} is as good as the best for these spends`
                  : `${mineName} is already the best for these spends`}
              </Text>
              <BigAmountCard amount={mine.savings.netYearly} label="Your net a year with this card" />
            </>
          ) : (
            <View style={{ gap: spacing[4] }}>
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                {mine.savings.netYearly < 0
                  ? `${mineName} costs more than it saves on these spends`
                  : `${mineName} saves nothing on these spends after its fee`}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                {mine.savings.netYearly < 0
                  ? 'With these spends, its annual fee is larger than what it saves you.'
                  : 'With these spends, its annual fee is as large as what it saves you.'}
              </Text>
            </View>
          )}
          {next ? (
            <View style={{ gap: spacing[8] }}>
              <Text variant="body14SemiBold" color={colors.text.secondary}>
                {mineSaves ? 'Next best card' : 'Best other card'}
              </Text>
              {rankedRow(next, [next.card])}
            </View>
          ) : null}
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
          Estimates from the spends you entered, per year after the annual fee. CashKaro Rewards are extra.
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
    </SafeAreaView>
  );
}
