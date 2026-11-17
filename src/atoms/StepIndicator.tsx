/**
 * DS-ADD(ds-figma-1, 2026-11-17): the marker at the start of a step: done, current, locked, info, footprints, cashback or an image.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1196:257899 (progress-done), 1201:305694 (current), 1196:257901 (locked), 1196:257902 (info),
 *   1196:257900 (footprints), 1196:257903 (cashback), 1196:257904 (image). Metrics from Figma values (2026-11-17).
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts (users: src/molecules/Stepper.tsx).
 *
 * StepIndicator — atom. New part. Timeline has 44 px tone circles with a dashed connector; this is the 20 px marker family.
 * Metrics: done / current / info / locked = 20 x 20 round; cashback = 32 x 32, radius 10, padding 4; footprints = 20 round; image = 56 x 56.
 * Roles: done and current fill feedback.success.default (inner: check 10 / dot 8 in inverse), info fill feedback.info.default (dot),
 * locked fill background.lavender with a hairline border text.disabled and a 14 lock, footprints fill feedback.success.onColor,
 * cashback fill gradients.saffronFade with border cashback.tagBorder and a 20 clock in cashback.default.
 * Not built: the shoe-prints glyph (no registered icon): footprints draws a small dot. Figma inner shadows on cashback and done are not drawn.
 */
import React from 'react';
import { View, Image, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { colors, spacing, radius, borderWidth, iconSize, gradients } from '../tokens';

export type StepIndicatorKind = 'done' | 'current' | 'locked' | 'info' | 'footprints' | 'cashback' | 'image';

export interface StepIndicatorProps {
  kind: StepIndicatorKind;
  /** Required for kind 'image'. */
  image?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

const SMALL = spacing[20];
const DOT = spacing[8]; // Figma 7.67

export function StepIndicator({ kind, image, style }: StepIndicatorProps) {
  if (kind === 'image') {
    return (
      <View
        style={[
          {
            width: iconSize[56],
            height: iconSize[56],
            borderWidth: borderWidth.hairline,
            borderColor: colors.border.subtle2,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {image ? (
          <Image
            source={image}
            accessibilityIgnoresInvertColors
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          />
        ) : null}
      </View>
    );
  }

  if (kind === 'cashback') {
    const g = gradients.saffronFade;
    return (
      <View
        style={[
          {
            width: iconSize[32],
            height: iconSize[32],
            padding: spacing[4],
            borderRadius: radius.md,
            borderWidth: borderWidth.hairline,
            borderColor: colors.cashback.tagBorder,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={g.colors}
          locations={g.locations}
          start={g.start}
          end={g.end}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <Icon name="clock-filled" size={iconSize[20]} color={colors.cashback.default} />
      </View>
    );
  }

  const round = {
    width: SMALL,
    height: SMALL,
    borderRadius: radius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (kind === 'locked') {
    return (
      <View
        style={[
          round,
          { borderWidth: borderWidth.hairline, borderColor: colors.text.disabled, backgroundColor: colors.background.lavender },
          style,
        ]}
      >
        <Icon name="lock-outline" size={iconSize[14]} color={colors.text.disabled} />
      </View>
    );
  }

  if (kind === 'footprints') {
    return (
      <View
        style={[
          round,
          { borderWidth: borderWidth.hairline, borderColor: colors.border.inverse, backgroundColor: colors.feedback.success.onColor },
          style,
        ]}
      >
        <View
          style={{ width: spacing[6], height: spacing[6], borderRadius: radius.full, backgroundColor: colors.feedback.success.default }}
        />
      </View>
    );
  }

  const fill = kind === 'info' ? colors.feedback.info.default : colors.feedback.success.default;
  return (
    <View style={[round, { backgroundColor: fill }, style]}>
      {kind === 'done' ? (
        <Icon name="check-outline" size={iconSize[10]} color={colors.icon.inverse} />
      ) : (
        <View style={{ width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: colors.icon.inverse }} />
      )}
    </View>
  );
}
