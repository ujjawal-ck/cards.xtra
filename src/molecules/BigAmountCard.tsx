/**
 * DS-ADD(ds-figma-1, 2026-11-17): large amount with a label, optional status tag and a footer note with "Read more".
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1169:1057154 (bigmoneyDisplay, With Tag). Metrics from Figma values (2026-11-17):
 * root radius 16, hairline border, gap 14, onLight/sm shadow; amount Outfit 700 28; footer strip padding 6 / 16, top border, fill lavender.
 * Rollback: delete this file and its DS-ADD export lines in src/molecules/index.ts.
 *
 * BigAmountCard — molecule. New part (semantic name; Figma calls it bigmoneyDisplay). Composes Tag (status prop,
 * also added in this batch) for the status. The image that overlaps the top edge in Figma (logo box 112 x 68, radius 10) is a slot
 * (`media`), because we have no wallet illustration asset. The amount uses formatINR (exact paise).
 * Type (nearest Outfit): amount heading28Bold, label body12Regular (not read from Figma), footer caption10Regular (Figma 11, no 11 here).
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Tag } from '../atoms';
import type { StatusTagTone } from '../lib/tagVariants';
import { colors, spacing, radius, borderWidth, elevation } from '../tokens';
import { formatINR } from '../lib/money';

export interface BigAmountCardProps {
  amount: number;
  /** e.g. "All-time Rewards earned". */
  label: string;
  status?: { label: string; tone: StatusTagTone };
  /** Footer note. Needs `onReadMore` to show the link. */
  note?: string;
  onReadMore?: () => void;
  /** Optional element that sits above the card, centred (a logo tile or illustration). */
  media?: React.ReactNode;
}

export function BigAmountCard({ amount, label, status, note, onReadMore, media }: BigAmountCardProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      {media ? <View style={{ marginBottom: -spacing[24], zIndex: 1 }}>{media}</View> : null}
      <View
        style={[
          {
            alignSelf: 'stretch',
            borderRadius: radius.xl,
            borderWidth: borderWidth.hairline,
            borderColor: colors.border.subtle2,
            backgroundColor: colors.surface.default,
            gap: spacing[14],
          },
          elevation.light.sm,
        ]}
      >
        <View
          style={{
            alignItems: 'center',
            gap: spacing[4],
            paddingHorizontal: spacing[16],
            paddingTop: media ? spacing[32] : spacing[16],
            paddingBottom: note ? 0 : spacing[16],
          }}
        >
          {status ? <Tag label={status.label} status={status.tone} size="xs" /> : null}
          <Text variant="body12Regular" color={colors.text.secondary} align="center">
            {label}
          </Text>
          <Text
            variant="heading28Bold"
            color={colors.text.primary}
            align="center"
            accessibilityLabel={`${label}: ${formatINR(amount)}`}
          >
            {formatINR(amount)}
          </Text>
        </View>
        {note ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[8],
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[6],
              borderTopWidth: borderWidth.thin,
              borderTopColor: colors.border.subtle3,
              borderBottomLeftRadius: radius.xl,
              borderBottomRightRadius: radius.xl,
              backgroundColor: colors.background.lavender,
            }}
          >
            <Text variant="caption10Regular" color={colors.text.secondary} style={{ flex: 1 }} numberOfLines={2}>
              {note}
            </Text>
            {onReadMore ? (
              <Pressable onPress={onReadMore} hitSlop={spacing[12]} accessibilityRole="link" accessibilityLabel="Read more">
                <Text variant="caption10SemiBold" color={colors.text.link}>
                  Read more
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
