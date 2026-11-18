/**
 * IneligibleSheet — organism (Figma 3762:85818)
 *
 * The red sibling of MaybeSheet. Content, top to bottom:
 *   1. <EligibilityMasthead variant='ineligible' />  (organism — red radial
 *      hero; the bulleted `reasons` in the reason window; the pincode / income /
 *      occupation row with its Edit pill = "change my details"; its own
 *      Continue-to-Apply CTA)
 *   2. "Cards you can get instead": up to 3 CompareCards (molecule) from
 *      src/lib/rejection.ts, in a horizontal row (one pick: full width)
 *   3. "See all N cards you can get" (Button, outline)
 * No picks → blocks 2 and 3 are left out.
 *
 * Pure presentation: the reason text, the picks and the open / navigate actions
 * come from HomeScreen. Stats text reuses src/lib/crossSellPresent.ts.
 *
 * Hex → token: every value sourced from src/tokens.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
// RNGH ScrollView so the row wins the horizontal gesture over gorhom's sheet (Android).
import { ScrollView } from 'react-native-gesture-handler';
import { Text, Button } from '../atoms';
import type { IconName } from '../atoms';
import { CompareCard } from '../molecules';
import type { CardModel } from '../molecules';
import { EligibilityMasthead } from './EligibilityMasthead';
import { colors, spacing, radius } from '../tokens';
import type { RejectionPick, RejectionSlot } from '../lib/rejection';
import { feeAndRewardStats, shortCardName } from '../lib/crossSellPresent';

const SLOT_ICON: Record<RejectionSlot, IconName> = {
  closest: 'check-circle-outline',
  topRewards: 'feat-rewards-outline',
  lifetimeFree: 'feat-savings-outline',
};

export interface IneligibleSheetProps {
  // 'ineligible' masthead pass-through props
  message?: string;
  /** Bulleted reason lines shown in the red reason window. */
  reasons?: string[];
  pincode?: string;
  amount?: string;
  occupation?: string;
  ctaLabel?: string;
  onContinue?: () => void;
  onEditPress?: () => void;

  /** The card the user was rejected for (the picks are compared with it). */
  sourceCard?: CardModel | null;
  /** Alternatives the user can get (src/lib/rejection.ts). */
  picks?: RejectionPick[];
  /** pick card id → the full CardModel (image, reward badge). */
  cardsById?: Map<string, CardModel>;
  /** The number on the "See all" link. */
  eligibleCount?: number;
  onPickPress?: (pick: RejectionPick, card: CardModel) => void;
  onSeeAll?: () => void;

  style?: StyleProp<ViewStyle>;
}

export function IneligibleSheet({
  message,
  reasons,
  pincode,
  amount,
  occupation,
  ctaLabel,
  onContinue,
  onEditPress,
  sourceCard,
  picks = [],
  cardsById,
  eligibleCount = 0,
  onPickPress,
  onSeeAll,
  style,
}: IneligibleSheetProps) {
  const src = sourceCard?.crossSell;
  const items = picks.flatMap((pick) => {
    const card = cardsById?.get(pick.card.id);
    return card && src ? [{ pick, card }] : [];
  });
  const cardEls = items.map(({ pick, card }) => (
    <CompareCard
      key={pick.card.id}
      cardImage={card.cardImage}
      name={shortCardName(card.name)}
      sourceName={shortCardName(sourceCard?.name ?? '')}
      bandTone={pick.tone}
      bandIcon={SLOT_ICON[pick.slot]}
      bandText={pick.tag}
      stats={feeAndRewardStats(src!, pick.card, card)}
      // The heading above already says the user can get these.
      onPress={() => onPickPress?.(pick, card)}
      style={items.length === 1 ? { width: '100%' } : undefined}
    />
  ));

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
          paddingBottom: spacing[24],
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* 1. Reason + details + Edit — masthead REUSED (carries its own ghost Continue-to-Apply CTA) */}
      <EligibilityMasthead
        variant="ineligible"
        message={message}
        reasons={reasons}
        pincode={pincode}
        amount={amount}
        occupation={occupation}
        ctaLabel={ctaLabel}
        onContinue={onContinue}
        onEditPress={onEditPress}
      />

      {/* 2 + 3. Alternatives and the "See all" link */}
      {cardEls.length ? (
        <View style={{ gap: spacing[12], paddingTop: spacing[16] }}>
          <Text
            variant="body16SemiBold"
            color={colors.text.primary}
            accessibilityRole="header"
            style={{ paddingHorizontal: spacing[16] }}
          >
            Cards you can get instead
          </Text>
          {cardEls.length === 1 ? (
            <View style={{ paddingHorizontal: spacing[16] }}>{cardEls}</View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[8], paddingHorizontal: spacing[16] }}
            >
              {cardEls}
            </ScrollView>
          )}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <Button
              variant="outline"
              tone="second"
              fullWidth
              icon="trailing"
              iconName="chevron-right"
              label={`See all ${eligibleCount} ${eligibleCount === 1 ? 'card' : 'cards'} you can get`}
              onPress={onSeeAll}
            />
          </View>
        </View>
      ) : null}

    </View>
  );
}
