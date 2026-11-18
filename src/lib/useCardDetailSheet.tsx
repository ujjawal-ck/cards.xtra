/**
 * useCardDetailSheet — the card detail sheet and Apply wiring for the card tool result screens.
 *
 * One place for: the sheet ref, the selected card, the deferred "present" (Home's pattern: present
 * after the selected card has committed to state), Apply (CARD_APPLY, then useClickOut), and
 * "View all benefits".
 *
 * Returns:
 *   openCard(card, cards, recommended)  open the sheet on `card`; `cards` is the swipe pager,
 *                                       `recommended` the sheet's recommended row.
 *   applyCard(card)                     Apply directly (row or button), same path as the sheet's Apply.
 *   sheets                              render once in the screen tree (detail sheet + click-out sheets).
 *
 * The card tools never know eligibility, so `eligibility_known` is always false.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { CardDetailSheet } from '../organisms/CardDetailSheet';
import type { CardModel } from '../molecules';
import type { RootStackParamList } from '../navigation/types';
import { analytics, Events } from '../analytics';
import { useClickOut } from './useClickOut';
import type { ClickOutSource } from './useClickOut';
import { haptics } from './haptics';

interface SheetLists {
  cards: CardModel[];
  recommended: CardModel[];
}

export function useCardDetailSheet(source: ClickOutSource) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openClickOut, clickOutSheets } = useClickOut();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [lists, setLists] = useState<SheetLists>({ cards: [], recommended: [] });
  const [presentSeq, setPresentSeq] = useState(0);
  useEffect(() => {
    if (presentSeq > 0) sheetRef.current?.present();
  }, [presentSeq]);

  const openCard = useCallback((card: CardModel, cards: CardModel[], recommended: CardModel[] = []) => {
    haptics.impact('light');
    setSelectedCard(card);
    setLists({ cards, recommended });
    setPresentSeq((s) => s + 1);
  }, []);

  const applyCard = useCallback(
    (card: CardModel) => {
      analytics.track(Events.CARD_APPLY, {
        item_id: card.id,
        item_name: card.name,
        item_brand: card.filterMeta?.bankName,
        redirect: true,
        eligibility_known: false,
        source,
      });
      openClickOut({
        kind: 'card',
        url: card.applyUrl,
        itemId: card.id,
        itemName: card.name,
        source,
        alias: card.crossSell?.alias ?? card.filterMeta?.cardAlias,
      });
    },
    [openClickOut, source],
  );

  const viewAllBenefits = useCallback(
    (card: CardModel) => {
      analytics.track(Events.CARD_VIEW_ALL_BENEFITS, { item_id: card.id, item_name: card.name });
      sheetRef.current?.dismiss();
      navigation.navigate('AllCardBenefits', { alias: card.filterMeta?.cardAlias, cardName: card.name });
    },
    [navigation],
  );

  const sheets = (
    <>
      {clickOutSheets}
      <CardDetailSheet
        ref={sheetRef}
        card={selectedCard}
        cards={lists.cards}
        recommended={lists.recommended}
        initialCardId={selectedCard?.id}
        onActiveCardChange={setSelectedCard}
        onRecommendedPress={setSelectedCard}
        onApply={applyCard}
        onViewAllBenefits={viewAllBenefits}
      />
    </>
  );

  return { openCard, applyCard, sheets };
}
