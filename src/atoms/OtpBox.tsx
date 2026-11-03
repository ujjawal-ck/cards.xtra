/**
 * OtpBox — atom
 *
 * One digit cell of an OTP input. Visual-only — the parent screen owns
 * the hidden TextInput and just feeds each cell a `value`, plus optional
 * `focused` / `error` flags. Border + background shift across states.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, radius, borderWidth } from '../tokens';
import { Text } from './Text';

export interface OtpBoxProps {
  value: string;
  focused?: boolean;
  error?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function OtpBox({
  value,
  focused = false,
  error = false,
  size = spacing[48],
  style,
}: OtpBoxProps) {
  const filled = value.length > 0;

  const borderColor = error
    ? colors.feedback.error.default
    : focused
    ? colors.border.focussed
    : filled
    ? colors.border.strong
    : colors.border.subtle;

  const backgroundColor = error
    ? colors.feedback.error.subtle
    : focused || filled
    ? colors.surface.default
    : colors.surface.sunken;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          borderWidth: focused ? borderWidth.heavy : borderWidth.thin,
          borderColor,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="heading22SemiBold" color={colors.text.primary}>
        {value}
      </Text>
    </View>
  );
}
