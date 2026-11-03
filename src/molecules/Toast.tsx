/**
 * Toast — molecule (Figma set 2401:70388)
 *
 * Horizontal compact feedback row. Every colour comes from the matching
 * entry in `colors.tones[tone]` — the component itself never picks a
 * hex; theming the toast across all 9 tones is one prop change.
 *
 * Layout:
 *   padding top/bottom 8, left 8, right 12, gap spacing[4]
 *   borderRadius radius.lg (12), border 1px tone.border, bg tone.bgSubtle
 *   [leading Icon 20] + [body12Regular message] + optional [action] + [✕]
 *
 * Icons:
 *   leading — Icon atom (outline, tinted tone.text)
 *   dismiss — Unicode '×' rendered via raw RN Text so it can tint to
 *             tone.text (no plain X icon ships in src/assets/icons).
 */
import React from 'react';
import {
  View,
  Pressable,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, spacing, radius, borderWidth, iconSize } from '../tokens';
import type { ToneName } from '../tokens';

export type ToastAction = 'none' | 'single';

export interface ToastProps {
  message: string;
  tone?: ToneName;
  icon?: IconName;
  /** 'single' renders a trailing text action button before the dismiss. */
  action?: ToastAction;
  actionLabel?: string;
  onActionPress?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Dismiss glyph is rendered via raw Text at a fixed 18px (the Figma
// spec) since iconSize tokens skip from 16 → 20.
const DISMISS_SIZE = 18;

export function Toast({
  message,
  tone = 'brand',
  icon,
  action = 'none',
  actionLabel,
  onActionPress,
  onDismiss,
  style,
}: ToastProps) {
  const t = colors.tones[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          paddingTop: spacing[8],
          paddingBottom: spacing[8],
          paddingLeft: spacing[8],
          paddingRight: spacing[12],
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: t.border,
          backgroundColor: t.bgSubtle,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize[20]} color={t.text} />
      ) : null}

      <Text
        variant="body12Regular"
        color={t.text}
        style={{ flex: 1 }}
      >
        {message}
      </Text>

      {action === 'single' && actionLabel ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text variant="body12SemiBold" color={t.text}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <RNText
            style={{
              fontSize: DISMISS_SIZE,
              lineHeight: DISMISS_SIZE,
              color: t.text,
            }}
          >
            ×
          </RNText>
        </Pressable>
      ) : null}
    </View>
  );
}
