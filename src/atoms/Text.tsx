/**
 * Text — atom
 *
 * Thin wrapper over React Native's <Text>. The whole point of this
 * component is to make `<Text>` consume the typography token scale
 * directly: every variant in `typography` (display40ExtraBold,
 * heading20SemiBold, body14Regular, caption10Medium, …) is a one-word
 * `variant` prop.
 *
 * Rules:
 *   - Never set fontFamily, fontSize, fontWeight, lineHeight, or
 *     letterSpacing by hand on a <Text> elsewhere in the app — use a
 *     `variant` here, or extend src/tokens/typography.ts.
 *   - `color` is a CSS-string colour (e.g. colors.text.primary,
 *     colors.feedback.error.text, '#fff'). Default = colors.text.primary.
 *   - `align` is a sugar prop for textAlign; pass left | center | right.
 *   - All other React Native <Text> props (numberOfLines, onPress,
 *     ellipsizeMode, accessibilityRole, …) pass straight through.
 */
import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { typography, colors } from '../tokens';

export type TextVariant = keyof typeof typography;
export type TextAlign = 'left' | 'center' | 'right';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextAlign;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body16Regular',
  color = colors.text.primary,
  align = 'left',
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color, textAlign: align }, style]}
    >
      {children}
    </RNText>
  );
}
