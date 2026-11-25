/**
 * AdvisorResultsScreen: the full list behind "See all N cards" in the card advisor chat.
 *
 * Top to bottom: <Header leading="back">, then inside the list header the title, the count,
 * the user's answers (read-only), "Change answers", the proof line, an optional note, and the
 * sort and "Free cards only" controls. Then a virtualised list of <CardTile>.
 *
 * Tiles never apply. A tile opens the card detail sheet (useCardDetailSheet), which applies.
 * Route params hold card ids and display text only: no income, no pincode.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../../navigation/types';
import { Text, Chip, Tag } from '../../atoms';
import { InlineMessage } from '../../molecules';
import type { CardModel } from '../../molecules';
import { CardTile, CardListSkeleton, Header, ScreenState } from '../../organisms';
import { colors, spacing } from '../../tokens';
import { useCards } from '../../query/useCards';
import { selectTileBenefits } from '../../api/cardMapper';
import { useCardDetailSheet } from '../../lib/useCardDetailSheet';
import type { ClickOutSource } from '../../lib/useClickOut';
import { analytics, Events } from '../../analytics';
import { buildResults, hasFreeAndPaid, pickCards } from '../../lib/advisor/results';
import type { ResultsSort } from '../../lib/advisor/results';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdvisorResults'>;
type Rt = RouteProp<RootStackParamList, 'AdvisorResults'>;
type Proof = Rt['params']['proof'];

const SOURCE: ClickOutSource = 'advisor';
const NO_CATEGORY_IDS: number[] = [];
const SORT_OPTIONS: Array<{ key: ResultsSort; label: string }> = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'fee', label: 'Lowest fee' },
];

interface ResultsTileProps {
  card: CardModel;
  proof: Proof;
  onPress: (card: CardModel) => void;
}

/** One tile: an optional "Likely to qualify" tag above the CardTile (same props as CardsYouCanGetScreen). */
const ResultsTile = React.memo(function ResultsTile({ card, proof, onPress }: ResultsTileProps) {
  const benefits = useMemo(() => selectTileBenefits(card.tileBenefits, NO_CATEGORY_IDS), [card.tileBenefits]);
  const feeProps = useMemo(
    () => ({
      joiningFee: card.detail?.fee.joining.amount ?? card.joiningFee,
      annualFee: card.detail?.fee.annual.amount ?? card.annualFee,
      joiningSub: card.detail?.fee.joining.sub || undefined,
      annualSub: card.detail?.fee.annual.sub || undefined,
      // No Apply on the tile: the strip button opens the card detail.
      ctaLabel: 'View details',
    }),
    [card],
  );
  return (
    <View style={{ gap: spacing[6] }}>
      {proof === 'likely' ? (
        <Tag label="Likely to qualify" tone="success" size="xs" icon="icon-left" iconName="check-circle-outline" style={{ alignSelf: 'flex-start' }} />
      ) : null}
      <Pressable
        onPress={() => onPress(card)}
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, view details`}
      >
        <CardTile
          type="full"
          cardImage={card.cardImage}
          cardName={card.name}
          cashbackText={card.cashbackValue}
          rewardPrefix={card.rewardPrefix}
          inviteOnly={card.inviteOnly}
          tags={card.tags}
          benefits={benefits}
          feeType={card.feeType}
          feeProps={feeProps}
          onApply={() => onPress(card)}
        />
      </Pressable>
    </View>
  );
});

export function AdvisorResultsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { cardIds, header, chips, proof, note } = params;
  const insets = useSafeAreaInsets();
  const { data: cards, isLoading, isError, refetch } = useCards();
  const { openCard, sheets } = useCardDetailSheet(SOURCE);

  const [sort, setSort] = useState<ResultsSort>('recommended');
  const [freeOnly, setFreeOnly] = useState(false);

  const allPicked = useMemo(() => (cards ? pickCards(cards, cardIds) : []), [cards, cardIds]);
  const showFreeChip = useMemo(() => hasFreeAndPaid(allPicked), [allPicked]);
  const shown = useMemo(() => buildResults(allPicked, sort, freeOnly), [allPicked, sort, freeOnly]);

  // Fire the view event once, when the cards are first available.
  const viewed = useRef(false);
  useEffect(() => {
    if (!cards || viewed.current) return;
    viewed.current = true;
    analytics.track(Events.ADVISOR_RESULTS_VIEW, { card_count: allPicked.length, proof });
  }, [cards, allPicked.length, proof]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const changeSort = (next: ResultsSort) => {
    if (next === sort) return;
    setSort(next);
    analytics.track(Events.ADVISOR_RESULTS_SORT, { sort: next, free_only: freeOnly });
  };
  const toggleFreeOnly = () => {
    const next = !freeOnly;
    setFreeOnly(next);
    analytics.track(Events.ADVISOR_RESULTS_SORT, { sort, free_only: next });
  };

  const onTilePress = useCallback(
    (card: CardModel) => {
      analytics.track(Events.ADVISOR_CARD_TAP, { item_id: card.id, slot: 0, proof });
      analytics.track(Events.ADVISOR_EXIT, { destination: 'card', step: 0 });
      openCard(card, shown, shown);
    },
    [openCard, shown, proof],
  );

  const shell = (body: React.ReactNode) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      <Header leading="back" title="Your cards" onLeadingPress={goBack} />
      {body}
    </SafeAreaView>
  );

  if (isLoading) {
    return shell(
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[16] }}>
        <CardListSkeleton count={3} />
      </View>,
    );
  }
  if (isError) {
    return shell(
      <ScreenState
        title="Couldn't load cards"
        body="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => refetch()}
      />,
    );
  }
  if (allPicked.length === 0) {
    return shell(
      <ScreenState
        title="No cards to show"
        body="Go back and change an answer."
        actionLabel="Back to the chat"
        onAction={goBack}
      />,
    );
  }

  const listHeader = (
    <View style={{ gap: spacing[16], paddingTop: spacing[8], paddingBottom: spacing[16] }}>
      <View style={{ gap: spacing[8], paddingHorizontal: spacing[16] }}>
        <Text variant="heading18SemiBold" color={colors.text.primary} accessibilityRole="header">
          {header}
        </Text>
        <Text variant="body12SemiBold" color={colors.text.secondary}>
          {shown.length === 1 ? '1 card' : `${shown.length} cards`}
        </Text>
        {chips.length > 0 ? (
          <View style={{ gap: spacing[6] }}>
            <Text variant="body12Medium" color={colors.text.secondary}>
              Based on your answers
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[6] }}>
              {chips.map((label) => (
                <Tag key={label} label={label} tone="gray" appearance="subtle" size="xs" />
              ))}
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={goBack}
          hitSlop={spacing[14]}
          accessibilityRole="button"
          accessibilityLabel="Change answers"
          style={{ alignSelf: 'flex-start' }}
        >
          <Text variant="body14SemiBold" color={colors.text.link}>
            Change answers
          </Text>
        </Pressable>
        {proof === 'likely' ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            These fit your income and pincode. The bank makes the final decision.
          </Text>
        ) : null}
      </View>
      {note ? <InlineMessage message={note} tone="info" style={{ marginHorizontal: spacing[16] }} /> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[8], paddingHorizontal: spacing[16], alignItems: 'center' }}
      >
        <Text variant="body12Medium" color={colors.text.secondary}>
          Sort by
        </Text>
        {SORT_OPTIONS.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            state={sort === o.key ? 'selected' : 'default'}
            onPress={() => changeSort(o.key)}
          />
        ))}
        {showFreeChip ? (
          <Chip label="Free cards only" state={freeOnly ? 'selected' : 'default'} onPress={toggleFreeOnly} />
        ) : null}
      </ScrollView>
    </View>
  );

  return shell(
    <>
      <FlatList
        data={shown}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={{ height: spacing[16] }} />}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing[16] }}>
            <ResultsTile card={item} proof={proof} onPress={onTilePress} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[24] }}
      />
      {sheets}
    </>,
  );
}
