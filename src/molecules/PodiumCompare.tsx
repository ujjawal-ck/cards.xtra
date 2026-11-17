/**
 * DS-ADD(ds-figma-1, 2026-11-17): two cards standing on podium bars with a rupee value above each; the winner bar is green with a medal.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1481:1963848 (beat-my-card-graph, You Win) and 1481:1963892 (Equal). Metrics from Figma values (2026-11-17):
 * root radius 16, hairline border, padding top 16 only, gap 24; bars 128 wide, top corners 12, winner 87 / other 65 high (we scale by value, max 88);
 * heading Figma sf-pro 500 16; "40K Spends" link Figma 600 14 in link colour with a trailing edit icon; winner value Outfit 700 16 in success text;
 * other value sf-pro 600 18 in tertiary text.
 * Rollback: delete this file, src/lib/podium.ts (+ test), and its DS-ADD export lines in src/molecules/index.ts.
 *
 * PodiumCompare — molecule. New part (semantic name; Figma calls it beat-my-card-graph). Plain Views, no chart library.
 * Heights: podiumHeights(). Winner: podiumWinner(); it is also said in words ("Best") under the value and in the
 * screen-reader label, never by colour or medal alone. Ties: no winner, both bars neutral.
 * Type (nearest Outfit): heading body16Medium, link body14SemiBold, winner value body16Bold, other value heading18SemiBold.
 * Colours: winner bar colors.data.positive (Figma has a green-to-white gradient, flat here), other bar colors.tones.gray.bg,
 * medal colors.data.series2 with a star icon (Figma has a medal glyph, not registered).
 */
import React from 'react';
import { View, Image, Pressable, ImageSourcePropType } from 'react-native';
import { Text, Icon } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize } from '../tokens';
import { formatINR } from '../lib/money';
import { podiumHeights, podiumWinner } from '../lib/podium';

export interface PodiumEntry {
  name: string;
  image: ImageSourcePropType;
  /** Rupees. */
  value: number;
}

export interface PodiumCompareProps {
  /** Heading, e.g. the store name. */
  title: string;
  /** Context chip text, e.g. "₹40,000 spends". */
  contextLabel?: string;
  /** Makes the context label a tappable link with an edit icon (Figma "40K Spends" button). */
  onContextPress?: () => void;
  a: PodiumEntry;
  b: PodiumEntry;
}

const MAX_BAR = spacing[80] + spacing[8]; // 88 (Figma winner bar 87)
const MIN_BAR = spacing[24];
const BAR_W = spacing[128]; // Figma bars are 128 wide
const CARD_W = spacing[64];
const CARD_H = spacing[40];

export function PodiumCompare({ title, contextLabel, onContextPress, a, b }: PodiumCompareProps) {
  const winner = podiumWinner(a.value, b.value);
  const heights = podiumHeights(a.value, b.value, MAX_BAR, MIN_BAR);

  const column = (entry: PodiumEntry, side: 'a' | 'b') => {
    const wins = winner === side;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Text
          variant={wins ? 'body16Bold' : 'heading18SemiBold'}
          color={wins ? colors.feedback.success.text : colors.text.tertiary}
        >
          {formatINR(entry.value)}
        </Text>
        {wins ? (
          <Text variant="caption10SemiBold" color={colors.feedback.success.text}>
            Best
          </Text>
        ) : null}
        <View
          style={{
            width: BAR_W,
            maxWidth: '100%',
            height: heights[side],
            marginTop: spacing[4],
            alignItems: 'center',
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            backgroundColor: wins ? colors.data.positive : colors.tones.gray.bg,
          }}
        >
          <Image
            source={entry.image}
            accessibilityIgnoresInvertColors
            style={{ width: CARD_W, height: CARD_H, resizeMode: 'contain', marginTop: -spacing[16] }}
          />
          {wins ? (
            <View
              style={{
                marginTop: spacing[4],
                width: spacing[24],
                height: spacing[24],
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.data.series2,
                borderWidth: borderWidth.thin,
                borderColor: colors.surface.default,
              }}
            >
              <Icon name="star-filled" size={iconSize[16]} color={colors.text.onColor} />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View
      accessible
      accessibilityActions={
        onContextPress && contextLabel ? [{ name: 'activate', label: `Change ${contextLabel}` }] : undefined
      }
      onAccessibilityAction={onContextPress ? () => onContextPress() : undefined}
      accessibilityLabel={
        `${title}${contextLabel ? `, ${contextLabel}` : ''}. ${a.name}: ${formatINR(a.value)}. ${b.name}: ${formatINR(b.value)}.` +
        (winner === 'none' ? '' : ` ${winner === 'a' ? a.name : b.name} is best.`)
      }
      style={{
        borderRadius: radius.xl,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.surface.default,
        paddingTop: spacing[16],
        gap: spacing[24],
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[16],
        }}
      >
        <Text variant="body16Medium" color={colors.text.primary} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {contextLabel ? (
          <Pressable
            disabled={!onContextPress}
            onPress={onContextPress}
            hitSlop={spacing[12]}
            accessibilityRole={onContextPress ? 'button' : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
          >
            <Text variant="body14SemiBold" color={colors.text.link}>
              {contextLabel}
            </Text>
            {onContextPress ? <Icon name="edit-outline" size={iconSize[16]} color={colors.text.link} /> : null}
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {column(a, 'a')}
        {column(b, 'b')}
      </View>
    </View>
  );
}
