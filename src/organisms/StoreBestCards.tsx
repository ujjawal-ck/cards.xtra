/**
 * StoreBestCards — organism (store-page floor)
 *
 * "Best cards to use here" — the credit-card upsell floor on a store/brand
 * page. PURE COMPOSITION of existing pieces, mirroring the other Store* floors
 * (StoreSimilarStore, StoreAboutBrand):
 *
 *   - a full-bleed leading <Divider style="section" /> (matches the screen's
 *     floor separators), then
 *   - the existing <CardCarousel> organism (heading18SemiBold title + a
 *     horizontal row of <CardTile type="scrollable" />), then
 *   - the existing <CardDetailSheet> organism, opened when a card is tapped —
 *     the SAME card-detail interaction used on Home.
 *
 * Matching is a real, backend-driven join: the store's Offers category maps to
 * BankKaro card tag ids (storeCardMatch) and the live catalog (useCards) is
 * filtered through the SAME applyFilters predicate the Home filter rail uses.
 * No confident match (or no category) → the top cards, so the floor is never
 * empty when the catalog has loaded.
 *
 * Self-hiding: renders null (no divider, no gap) while the catalog is loading
 * or empty, so the screen's surrounding floors collapse cleanly.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Divider } from '../atoms';
import { CardCarousel } from './Carousels';
import type { CardCarouselItem } from './Carousels';
import { CardDetailSheet } from './CardDetailSheet';
import type { CardModel } from '../molecules';
import { spacing } from '../tokens';
import { useCards } from '../query/useCards';
import { applyFilters, EMPTY_FILTERS } from '../data/filterOptions';
import { cardTagIdsForCategory } from '../data/storeCardMatch';
import { openUrl, withTrackingUser } from '../lib/openUrl';
import { useProfile } from '../query/useProfile';
import type { RootStackParamList } from '../navigation/types';

// Max cards in the row — enough to feel like a curated set without flooding
// the floor. The carousel scrolls, so this is a soft cap.
const MAX_CARDS = 8;

export interface StoreBestCardsProps {
  /** Offers category label the user is browsing (e.g. "Fashion"). Drives the
   *  card match; absent → top cards. */
  category?: string;
  /** Section title above the row. Defaults per matched / fallback. */
  title?: string;
  style?: StyleProp<ViewStyle>;
}

/** CardModel → the CardCarousel's item shape (same mapping Home's result
 *  sheets use). */
function toCarouselItem(c: CardModel): CardCarouselItem {
  return {
    id: c.id,
    cardImage: c.cardImage,
    cardName: c.name,
    cashbackText: c.cashbackValue,
    tags: c.tags,
    benefits: c.tileBenefits,
  };
}

export function StoreBestCards({ category, title, style }: StoreBestCardsProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: cards = [] } = useCards();
  const { data: profile } = useProfile();

  // Category match → fall back to the top cards when there's no confident
  // mapping (or the match returned nothing in this catalog).
  const tagIds = cardTagIdsForCategory(category);
  const matched = useMemo(() => {
    if (!tagIds.length) return [];
    return applyFilters(cards, { ...EMPTY_FILTERS, categoryTagIds: tagIds });
  }, [cards, tagIds]);
  const isMatched = matched.length > 0;
  const list = useMemo(
    () => (isMatched ? matched : cards).slice(0, MAX_CARDS),
    [isMatched, matched, cards]
  );

  const items = useMemo(() => list.map(toCarouselItem), [list]);

  // Card-detail sheet — opened on tap, exactly like Home. Present after the
  // selected card commits to state (same deferred-present pattern as Home).
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [presentSeq, setPresentSeq] = useState(0);
  useEffect(() => {
    if (presentSeq > 0) sheetRef.current?.present();
  }, [presentSeq]);

  const handleCardPress = useCallback(
    (item: CardCarouselItem) => {
      const card = list.find((c) => c.id === item.id);
      if (!card) return;
      setSelectedCard(card);
      setPresentSeq((s) => s + 1);
    },
    [list]
  );

  const handleViewAllBenefits = useCallback(
    (card: CardModel) => {
      sheetRef.current?.dismiss();
      navigation.navigate('AllCardBenefits', {
        alias: card.filterMeta?.cardAlias,
        cardName: card.name,
      });
    },
    [navigation]
  );

  // Self-hide while loading / empty so the screen's floor separators collapse.
  if (items.length === 0) return null;

  const resolvedTitle =
    title ?? (isMatched ? 'Best cards to use here' : 'Popular credit cards');

  return (
    <View style={[{ width: '100%', gap: spacing[24] }, style]}>
      {/* Leading full-bleed separator — matches the screen's section floors. */}
      <Divider style="section" />

      <CardCarousel
        title={resolvedTitle}
        cards={items}
        onCardPress={handleCardPress}
        style={{ width: '100%' }}
      />

      {/* Card detail — the same interaction as Home. Apply opens the bank
          page directly; the eligibility result-sheets are Home-only, so those
          callbacks are intentionally omitted (the sheet's inline checker still
          works on its own). */}
      <CardDetailSheet
        ref={sheetRef}
        card={selectedCard}
        cards={list}
        recommended={list}
        initialCardId={selectedCard?.id}
        onActiveCardChange={setSelectedCard}
        onRecommendedPress={setSelectedCard}
        onApply={(card) => openUrl(withTrackingUser(card.applyUrl, profile?.id))}
        onViewAllBenefits={handleViewAllBenefits}
      />
    </View>
  );
}
