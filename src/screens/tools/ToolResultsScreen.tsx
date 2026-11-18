/**
 * ToolResultsScreen — card tools, ranked list.
 *
 * Reads its result from useCardSavings(spends); only the spends arrive through navigation.
 * States: loading (skeleton rows + an honest wait line), offline (retry), error (retry), empty (no
 * card saves money after its fee), list (RankedCardRow, first 10, then "Show all N cards").
 * Only cards with netYearly > 0 are listed. Row press opens CardDetailSheet; each row also has
 * Apply. Both go through useCardDetailSheet, so Apply goes through useClickOut.
 * Analytics: no spend amount is sent.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Button, Skeleton } from '../../atoms';
import { RankedCardRow } from '../../molecules';
import { Header, ScreenState } from '../../organisms';
import { colors, spacing, radius, borderWidth } from '../../tokens';
import { useCardSavings } from '../../query/useCardSavings';
import type { ToolCard } from '../../query/useCardSavings';
import { topReason } from '../../lib/cardTools';
import type { ClickOutSource } from '../../lib/useClickOut';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import { analytics, Events } from '../../analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ToolResults'>;
type Rt = RouteProp<RootStackParamList, 'ToolResults'>;

const SOURCE: ClickOutSource = 'tool_results';
const FIRST_PAGE = 10;
const SKELETON_ROWS = 4;

function SkeletonRow() {
  return (
    <View
      style={{
        gap: spacing[8],
        padding: spacing[12],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing[8] }}>
        <Skeleton width={spacing[24]} height={spacing[24]} radius="sm" />
        <Skeleton width={spacing[64]} height={spacing[40]} radius="sm" />
        <View style={{ flex: 1, gap: spacing[8] }}>
          <Skeleton width="80%" height={spacing[16]} />
          <Skeleton width="40%" height={spacing[24]} />
        </View>
      </View>
      <Skeleton width="90%" height={spacing[12]} />
    </View>
  );
}

export function ToolResultsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { tool, spends, title, subtitle } = params;
  const insets = useSafeAreaInsets();
  const { ranked, isLoading, isOffline, isError, refetch, loadMs } = useCardSavings(spends);
  const { openCard, applyCard, sheets } = useCardDetailSheet(SOURCE);

  const [showAll, setShowAll] = useState(false);

  // Only cards that still save money after their fee. `ranked` is already in rank order.
  const visible = useMemo(() => ranked.filter((r) => r.savings.netYearly > 0), [ranked]);
  const shown = showAll ? visible : visible.slice(0, FIRST_PAGE);
  const pagerCards = useMemo(() => visible.map((r) => r.card), [visible]);

  // Analytics, once each. The view fires only for a real result, never while offline.
  const viewTracked = useRef(false);
  const errorTracked = useRef(false);
  useEffect(() => {
    if (isError && !errorTracked.current) {
      errorTracked.current = true;
      analytics.track(Events.TOOL_RESULT_ERROR, { tool });
    }
  }, [isError, tool]);
  useEffect(() => {
    if (!isLoading && !isOffline && !isError && !viewTracked.current) {
      viewTracked.current = true;
      // loadMs is undefined when the result came from the cache: leave load_ms out.
      analytics.track(Events.TOOL_RESULT_VIEW, {
        tool,
        cards_shown: Math.min(visible.length, FIRST_PAGE),
        ...(loadMs !== undefined ? { load_ms: loadMs } : {}),
      });
    }
  }, [isLoading, isOffline, isError, tool, visible.length, loadMs]);

  const openRow = (item: ToolCard) => {
    analytics.track(Events.TOOL_RESULT_SELECT, { tool, item_id: item.card.id, rank: item.rank });
    openCard(item.card, pagerCards, pagerCards);
  };

  const goBack = () => navigation.goBack();

  const intro = (
    <View style={{ gap: spacing[8], paddingBottom: spacing[16] }}>
      {subtitle ? (
        <Text variant="body14Regular" color={colors.text.secondary}>
          {subtitle}
        </Text>
      ) : null}
      <Text variant="body12Regular" color={colors.text.secondary}>
        Savings are estimates from the spends you entered, shown per year after the annual fee. CashKaro Rewards are
        extra.
      </Text>
    </View>
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        {intro}
        <Text variant="body14Medium" color={colors.text.primary}>
          Checking every card against your spends. This can take up to a minute.
        </Text>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
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
        title="Couldn't load your cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  } else if (visible.length === 0) {
    content = (
      <View style={{ padding: spacing[16] }}>
        {intro}
        <ScreenState
          title="No card saves you money on these spends after its fee"
          body="Change your spends to see other cards."
          actionLabel="Change my spends"
          onAction={goBack}
        />
      </View>
    );
  } else {
    content = (
      <FlatList
        data={shown}
        keyExtractor={(item) => item.card.id}
        ListHeaderComponent={intro}
        ItemSeparatorComponent={() => <View style={{ height: spacing[12] }} />}
        renderItem={({ item }) => (
          <RankedCardRow
            rank={item.rank}
            cardImage={item.card.cardImage}
            name={item.card.name}
            headline={{ label: 'You save', amount: item.savings.netYearly, period: 'year' }}
            reason={topReason(item.savings)}
            onPress={() => openRow(item)}
            onApply={() => applyCard(item.card)}
          />
        )}
        ListFooterComponent={
          !showAll && visible.length > FIRST_PAGE ? (
            <View style={{ paddingTop: spacing[16] }}>
              <Button
                label={`Show all ${visible.length} cards`}
                variant="outline"
                tone="second"
                size={44}
                fullWidth
                onPress={() => setShowAll(true)}
              />
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: spacing[16], paddingBottom: insets.bottom + spacing[24] }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title={title} onLeadingPress={goBack} />
      {content}
      {sheets}
    </SafeAreaView>
  );
}
