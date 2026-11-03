/**
 * InlineMessage — molecule (Figma set 2820:8311)
 *
 * Larger sibling of Toast: padding 12 all sides, radius.xl (16), can
 * carry an optional title and 0/1/2 trailing actions. Same tone system
 * as Toast — every colour comes from colors.tones[tone].
 *
 * Layout:
 *   horizontal row, gap spacing[8]
 *   [leading Icon 24] + [content block (flex 1)] + [dismiss ✕ 18]
 *
 * Content block (vertical, gap spacing[4]):
 *   [Title body14Medium]?   ← only when `title` is supplied
 *   Body body14Medium
 *   [Actions row body14SemiBold]?   ← 'single' or 'two'
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

export type InlineMessageAction = 'none' | 'single' | 'two';

export interface InlineMessageProps {
  message: string;
  title?: string;
  tone?: ToneName;
  icon?: IconName;
  action?: InlineMessageAction;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DISMISS_SIZE = 18;

export function InlineMessage({
  message,
  title,
  tone = 'brand',
  icon,
  action = 'none',
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  onDismiss,
  style,
}: InlineMessageProps) {
  const t = colors.tones[tone];

  const renderActions = () => {
    if (action === 'none') return null;
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[16],
          marginTop: spacing[4],
        }}
      >
        {primaryActionLabel ? (
          <Pressable
            onPress={onPrimaryAction}
            hitSlop={spacing[8]}
            accessibilityRole="button"
            accessibilityLabel={primaryActionLabel}
          >
            <Text variant="body14SemiBold" color={t.text}>
              {primaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
        {action === 'two' && secondaryActionLabel ? (
          <Pressable
            onPress={onSecondaryAction}
            hitSlop={spacing[8]}
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
          >
            <Text variant="body14SemiBold" color={t.text}>
              {secondaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing[8],
          padding: spacing[12],
          borderRadius: radius.xl,
          borderWidth: borderWidth.thin,
          borderColor: t.border,
          backgroundColor: t.bgSubtle,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize[24]} color={t.text} />
      ) : null}

      <View style={{ flex: 1, gap: spacing[4] }}>
        {title ? (
          <Text variant="body14SemiBold" color={t.text}>
            {title}
          </Text>
        ) : null}
        <Text variant="body14Medium" color={t.text}>
          {message}
        </Text>
        {renderActions()}
      </View>

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
