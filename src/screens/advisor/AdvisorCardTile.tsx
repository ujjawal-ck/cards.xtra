/**
 * AdvisorCardTile: one card in the advisor's horizontal card rail.
 *
 * Top to bottom: card art with the label and "New" tags beside it, the name (2 lines), the fee
 * line (1 line), the reason (2 lines), the proof tag, then a footer row: the CashKaro reward on
 * the left and a separate "I have this" on the right.
 * The tile fills the height its parent gives it (the rail stretches every tile to the tallest).
 * No fixed heights on text: the tile grows with the font size.
 */
import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text, Tag } from '../../atoms';
import { colors, spacing, radius, borderWidth, elevation, opacity, sizing, mediaSize } from '../../tokens';
import type { CardModel } from '../../molecules';
import type { ProofLevel, RevealLabel } from '../../lib/advisor/types';

const ART_W = mediaSize[56];
const ART_ASPECT = 132 / 84; // same art ratio as RankedCardRow

const PROOF_TEXT: Record<Exclude<ProofLevel, 'none'>, string> = {
  likely: 'Likely to qualify',
  matches: 'Matches your answers',
};

export interface AdvisorCardTileProps {
  card: CardModel;
  label?: RevealLabel;
  proof: ProofLevel;
  reason: string;
  isNew: boolean;
  onPress: () => void;
  onHaveThis: () => void;
}

export function AdvisorCardTile({ card, label, proof, reason, isNew, onPress, onHaveThis }: AdvisorCardTileProps) {
  const fee = card.feeType === 'lifetime-free' ? 'Lifetime free' : `Joining ${card.joiningFee} · Annual ${card.annualFee}`;
  const proofText = proof === 'none' ? '' : PROOF_TEXT[proof];
  const a11yLabel = [card.name, fee, reason, proofText].filter(Boolean).join('. ');

  return (
    // Two sibling buttons, not one inside the other: a screen reader cannot reach a
    // button that sits inside another accessible button.
    <View
      style={[
        {
          flex: 1,
          paddingHorizontal: spacing[12],
          paddingTop: spacing[12],
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          backgroundColor: colors.surface.default,
        },
        elevation.light.xs,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Opens card details"
        style={({ pressed }) => ({ flex: 1, gap: spacing[4], opacity: pressed ? opacity[80] : opacity[100] })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[8], marginBottom: spacing[4] }}>
          <Image
            source={card.cardImage}
            style={{
              width: ART_W,
              aspectRatio: ART_ASPECT,
              borderRadius: radius.sm,
              backgroundColor: colors.surface.sunken,
            }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          {label || isNew ? (
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] }}>
              {label ? <Tag label={label} size="xs" tone="brand" /> : null}
              {isNew ? <Tag label="New" size="xs" tone="info" /> : null}
            </View>
          ) : null}
        </View>
        <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={2}>
          {card.name}
        </Text>
        <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={1}>
          {fee}
        </Text>
        <Text variant="body12Regular" color={colors.text.secondary} numberOfLines={2}>
          {reason}
        </Text>
        {proof !== 'none' ? (
          <View style={{ flexDirection: 'row', marginTop: spacing[2] }}>
            <Tag label={proofText} size="xs" tone={proof === 'likely' ? 'success' : 'info'} />
          </View>
        ) : null}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
        <View style={{ flex: 1 }}>
          {card.cashback ? (
            <Text variant="body12SemiBold" color={colors.cashback.default} numberOfLines={1}>
              {card.cashback}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onHaveThis}
          accessibilityRole="button"
          accessibilityLabel={`I have ${card.name}`}
          style={{ minHeight: sizing.touchMin, justifyContent: 'center' }}
        >
          <Text variant="body12SemiBold" color={colors.text.link}>
            I have this
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
