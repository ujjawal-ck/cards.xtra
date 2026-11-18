/**
 * CardsYouCanGetScreen — rejection flow, part B.
 *
 * Reached from the rejection bottom sheet ("You can't get card X"). Shows every
 * card the user CAN get, organised around the card they wanted.
 *
 *   1. <Header leading="back"> "Cards you can get".
 *   2. Context strip: art of the rejected card, "You wanted {name}", "{N} cards you can get".
 *   3. "Closest to what you wanted": up to 5 <CompareCard>s (same look as the
 *      cross-sell rail). Band = the context tag; stats = fee and Rewards vs the rejected card.
 *   4. "All cards you can get": filters (category chips preset from the rejected
 *      card, "Lifetime free only", sort) + a vertical list of <CardTile>, each with a context <Tag>.
 *
 * List logic (eligibility, closest row, filters, sorts): src/lib/eligibleList.ts.
 * Context tag text and similarity: src/lib/rejection.ts. Stat rows: presentPick in
 * src/lib/crossSellPresent.ts (the rail's own helper).
 *
 * Card detail: the same <CardDetailSheet> organism Home and StoreBestCards use,
 * mounted here (card detail exists only as that sheet; there is no route for it).
 * Apply: Home's gated handler is private to HomeScreen, so the tile does NOT apply:
 * its strip button is relabelled "View details" (existing `ctaLabel` prop) and opens the
 * detail. Only the detail sheet's sticky Apply Now applies, through useClickOut (the app's
 * single click-out path; StoreBestCards does the same). Every card here is already eligible.
 *
 * Not built: sticky filter bar (the filters sit inside the list header, so a sticky
 * header would pin the strip and the closest row too).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import type { RootStackParamList } from '../navigation/types';
import { Text, Chip, Tag } from '../atoms';
import { CompareCard, COMPARE_CARD_W } from '../molecules';
import type { CardModel } from '../molecules';
import { CardTile, CardDetailSheet, CardListSkeleton, Header, ScreenState } from '../organisms';
import { colors, spacing, radius, borderWidth } from '../tokens';
import { useCards } from '../query/useCards';
import { selectTileBenefits } from '../api/cardMapper';
import { useClickOut } from '../lib/useClickOut';
import { haptics } from '../lib/haptics';
import { analytics, Events } from '../analytics';
import { band } from '../lib/crossSell';
import type { CrossSellCard, CrossSellPick } from '../lib/crossSell';
import { presentPick, shortCardName } from '../lib/crossSellPresent';
import {
  buildEligibleList,
  categoryChips,
  presetCategories,
  type ContextTag,
  type EligibleSort,
} from '../lib/eligibleList';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CardsYouCanGet'>;
type Rt = RouteProp<RootStackParamList, 'CardsYouCanGet'>;

const SOURCE = 'cards_you_can_get';
const NO_CATEGORY_IDS: number[] = [];
const SORT_OPTIONS: Array<{ key: EligibleSort; label: string }> = [
  { key: 'closest', label: 'Closest match' },
  { key: 'reward', label: 'Highest Rewards' },
  { key: 'fee', label: 'Lowest fee' },
];
// Strip art: 64 wide at the CardTile art ratio (132:84), as CompareCard does.
const STRIP_ART_W = spacing[64];
const STRIP_ART_ASPECT = 132 / 84;

/** The rail's pick shape, built from a context tag. Only `card`, `lens` and `tone` are read by presentPick. */
function pickFor(c: CrossSellCard, tag: ContextTag): CrossSellPick {
  return {
    card: c, lens: 'similar', label: tag.text, tone: tag.tone, delta: tag.text, sim: 0,
    band: band(c), eligible: true, seenBefore: false, earn: c.earn, paid: c.reward, net: c.earn - c.reward,
  };
}

type EligibleTileProps = {
  card: CardModel;
  tag: ContextTag;
  onPress: (card: CardModel) => void;
};

/** One tile of the full list: context tag above, the Home CardTile below (same props Home passes). */
const EligibleTile = React.memo(function EligibleTile({ card, tag, onPress }: EligibleTileProps) {
  const benefits = useMemo(() => selectTileBenefits(card.tileBenefits, NO_CATEGORY_IDS), [card.tileBenefits]);
  const feeProps = useMemo(
    () => ({
      joiningFee: card.detail?.fee.joining.amount ?? card.joiningFee,
      annualFee: card.detail?.fee.annual.amount ?? card.annualFee,
      joiningSub: card.detail?.fee.joining.sub || undefined,
      annualSub: card.detail?.fee.annual.sub || undefined,
      // No Apply on the tile here (Home's gated apply is private): the strip button opens the card detail.
      ctaLabel: 'View details',
    }),
    [card],
  );
  return (
    <View style={{ gap: spacing[6] }}>
      <Tag label={tag.text} tone={tag.tone} appearance="subtle" size="xs" style={{ alignSelf: 'flex-start' }} />
      <Pressable
        onPress={() => onPress(card)}
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, ${tag.text}, view details`}
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

export function CardsYouCanGetScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { rejectedCardId, eligibleAliases, reasonKind, source = 'rejection', eligibilityKnown = false } = params;
  // Two doors lead here: the "we're sorry" sheet, and "View all cards" on the Home rail
  // after the user left a card. The page says which one brought them (see `why` below).
  const isBounce = source === 'bounce';
  const insets = useSafeAreaInsets();
  const { data: cards = [], isLoading, isError, refetch } = useCards();
  const { openClickOut, clickOutSheets } = useClickOut();

  const rejected = useMemo(() => cards.find((c) => c.id === rejectedCardId), [cards, rejectedCardId]);
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  // Filters. `userCategories` null = still the preset; [] = the user cleared it.
  const [userCategories, setUserCategories] = useState<string[] | null>(null);
  const [lifetimeFreeOnly, setLifetimeFreeOnly] = useState(false);
  const [sort, setSort] = useState<EligibleSort>('closest');

  const preset = useMemo(
    () => (rejected ? presetCategories(rejected, cards, eligibleAliases) : []),
    [rejected, cards, eligibleAliases],
  );
  const chips = useMemo(
    () => (rejected ? categoryChips(rejected, cards, eligibleAliases) : []),
    [rejected, cards, eligibleAliases],
  );
  const selected = userCategories ?? preset;

  const list = useMemo(
    () =>
      rejected
        ? buildEligibleList({
            rejected, cards, eligibleAliases, categories: selected, lifetimeFreeOnly, sort, reasonKind,
          })
        : null,
    [rejected, cards, eligibleAliases, selected, lifetimeFreeOnly, sort, reasonKind],
  );

  const filtersActive = selected.length > 0 || lifetimeFreeOnly || sort !== 'closest';

  const toggleCategory = (name: string) => {
    const on = selected.indexOf(name) === -1;
    setUserCategories(on ? selected.concat(name) : selected.filter((t) => t !== name));
    analytics.track(Events.CATEGORY_FILTER, { category: name, selected: on, source: SOURCE });
  };
  const toggleLifetimeFree = () => {
    const next = !lifetimeFreeOnly;
    setLifetimeFreeOnly(next);
    analytics.track(Events.FILTER_APPLY, { source: SOURCE, filter: 'lifetime_free', filter_value: next });
  };
  const changeSort = (next: EligibleSort) => {
    if (next === sort) return;
    setSort(next);
  };
  const clearFilters = () => {
    setUserCategories([]);
    setLifetimeFreeOnly(false);
    setSort('closest');
    analytics.track(Events.FILTER_CLEAR, { scope: 'all', source: SOURCE });
  };

  // Card detail sheet: present after the selected card has committed to state (Home's pattern).
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [presentSeq, setPresentSeq] = useState(0);
  useEffect(() => {
    if (presentSeq > 0) sheetRef.current?.present();
  }, [presentSeq]);

  // The sheet pager swipes through the closest row and the list, without repeats.
  const pagerCards = useMemo(() => {
    if (!list) return [];
    const seen = new Set<string>();
    return list.closest
      .concat(list.all)
      .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
      .map((i) => cardsById.get(i.id))
      .filter((c): c is CardModel => !!c);
  }, [list, cardsById]);

  const openCard = useCallback((card: CardModel, listName: string) => {
    haptics.impact('light');
    analytics.track(Events.SELECT_ITEM, {
      item_id: card.id,
      item_name: card.name,
      item_brand: card.filterMeta?.bankName,
      item_list_name: listName,
      source: SOURCE,
      entry: source,
    });
    analytics.track(Events.VIEW_ITEM, {
      item_id: card.id,
      item_name: card.name,
      item_brand: card.filterMeta?.bankName,
      snap: 'partial',
      source: SOURCE,
      entry: source,
    });
    setSelectedCard(card);
    setPresentSeq((s) => s + 1);
  }, [source]);
  const onTilePress = useCallback((card: CardModel) => openCard(card, SOURCE), [openCard]);

  const applyTo = useCallback(
    (card: CardModel) => {
      analytics.track(Events.CARD_APPLY, {
        item_id: card.id,
        item_name: card.name,
        item_brand: card.filterMeta?.bankName,
        redirect: true,
        // From the rejection sheet every card here is eligible, so Home's eligibility gate is
        // skipped on purpose. From the Home rail it is only true if the result was known.
        eligibility_known: !isBounce || eligibilityKnown,
        source: SOURCE,
        entry: source,
      });
      openClickOut({ kind: 'card', url: card.applyUrl, itemId: card.id, itemName: card.name });
    },
    [openClickOut, isBounce, eligibilityKnown, source],
  );

  const viewAllBenefits = useCallback(
    (card: CardModel) => {
      analytics.track(Events.CARD_VIEW_ALL_BENEFITS, { item_id: card.id, item_name: card.name });
      sheetRef.current?.dismiss();
      navigation.navigate('AllCardBenefits', { alias: card.filterMeta?.cardAlias, cardName: card.name });
    },
    [navigation],
  );

  const goBack = () => navigation.goBack();
  const sourceName = rejected ? shortCardName(rejected.name) : '';

  // ---- Header + non-list states ----
  const header = (
    <Header leading="back" title={isBounce ? 'More cards to consider' : 'Cards you can get'} onLeadingPress={goBack} />
  );
  const shell = (body: React.ReactNode) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      {header}
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
  // Zero eligible cards (not reachable from the rejection sheet), or the rejected card is not in the catalogue.
  if (!rejected || !list || list.count === 0) {
    return shell(
      <ScreenState
        title="No cards to show"
        body="We could not find a card you can get with these details."
        actionLabel="Change my details"
        onAction={goBack}
      />,
    );
  }

  // ---- Sections ----
  // Eligibility is claimed only where it is known: always from the rejection sheet,
  // from the rail only when the user's result exists.
  const claimsEligible = !isBounce || eligibilityKnown;
  const countText = claimsEligible
    ? list.count === 1
      ? '1 card you can get'
      : `${list.count} cards you can get`
    : list.count === 1
      ? '1 card, closest first'
      : `${list.count} cards, closest first`;
  // The PM lens on this page: say why the user is here, so the list reads as an answer to
  // what they just did and not as a generic catalogue. One line per door.
  const why = isBounce
    ? `You left ${sourceName} without applying. These may suit you better.`
    : `We can't offer you ${sourceName} with the details you gave. These you can get.`;

  const listHeader = (
    <View style={{ gap: spacing[24], paddingBottom: spacing[16] }}>
      {/* Context strip */}
      <View
        style={{
          marginHorizontal: spacing[16],
          marginTop: spacing[8],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          padding: spacing[12],
          borderRadius: radius.xl,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          backgroundColor: colors.surface.sunken2,
        }}
      >
        <Image
          source={rejected.cardImage}
          style={{
            width: STRIP_ART_W,
            aspectRatio: STRIP_ART_ASPECT,
            borderRadius: radius.sm,
            backgroundColor: colors.surface.sunken,
          }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1 }}>
          <Text variant="body14SemiBold" color={colors.text.primary}>
            {isBounce ? `You looked at ${sourceName}` : `You wanted ${sourceName}`}
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {why}
          </Text>
          <Text variant="body12SemiBold" color={colors.text.secondary}>
            {countText}
          </Text>
        </View>
      </View>

      {/* Section 1: closest to what you wanted */}
      {list.closest.length > 0 && rejected.crossSell ? (
        <View style={{ gap: spacing[12] }}>
          <Text
            variant="heading18SemiBold"
            color={colors.text.primary}
            accessibilityRole="header"
            style={{ paddingHorizontal: spacing[16] }}
          >
            {isBounce ? `Closest to ${sourceName}` : 'Closest to what you wanted'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={COMPARE_CARD_W + spacing[8]}
            snapToAlignment="start"
            contentContainerStyle={{ gap: spacing[8], paddingHorizontal: spacing[16] }}
          >
            {list.closest.map((item) => {
              const card = cardsById.get(item.id);
              if (!card || !card.crossSell || !rejected.crossSell) return null;
              const view = presentPick(rejected.crossSell, pickFor(card.crossSell, item.tag), card);
              return (
                <CompareCard
                  key={item.id}
                  cardImage={card.cardImage}
                  name={shortCardName(card.name)}
                  sourceName={sourceName}
                  bandTone={item.tag.tone}
                  bandIcon={view.icon}
                  bandText={item.tag.text}
                  stats={view.stats}
                  // Every card here is eligible; the strip above says so.
                  eligible={false}
                  onPress={() => openCard(card, `${SOURCE}_closest`)}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Section 2 title + filters */}
      <View style={{ gap: spacing[12] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[16],
          }}
        >
          <Text variant="heading18SemiBold" color={colors.text.primary} accessibilityRole="header">
            {claimsEligible ? 'All cards you can get' : 'All cards'}
          </Text>
          {filtersActive ? (
            <Pressable
              onPress={clearFilters}
              hitSlop={spacing[14]}
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
            >
              <Text variant="body14SemiBold" color={colors.text.link}>
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[8], paddingHorizontal: spacing[16], alignItems: 'center' }}
        >
          {chips.map((name) => (
            <Chip
              key={name}
              label={name}
              state={selected.indexOf(name) !== -1 ? 'selected' : 'default'}
              onPress={() => toggleCategory(name)}
            />
          ))}
          <Chip
            label="Lifetime free only"
            state={lifetimeFreeOnly ? 'selected' : 'default'}
            onPress={toggleLifetimeFree}
          />
        </ScrollView>
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
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.surface.default }}>
      <StatusBar style="dark" />
      {header}
      <FlatList
        data={list.all}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <ScreenState
            title="No cards match these filters"
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing[16] }} />}
        renderItem={({ item }) => {
          const card = cardsById.get(item.id);
          if (!card) return null;
          return (
            <View style={{ paddingHorizontal: spacing[16] }}>
              <EligibleTile card={card} tag={item.tag} onPress={onTilePress} />
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[24] }}
      />

      {clickOutSheets}

      <CardDetailSheet
        ref={sheetRef}
        card={selectedCard}
        cards={pagerCards}
        recommended={pagerCards}
        initialCardId={selectedCard?.id}
        onActiveCardChange={setSelectedCard}
        onRecommendedPress={setSelectedCard}
        onApply={applyTo}
        onViewAllBenefits={viewAllBenefits}
      />
    </SafeAreaView>
  );
}
