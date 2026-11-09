/**
 * Selector — atom (Figma set 2839:201785 — Default 2839:201765,
 * Selected 2839:201786).
 *
 * 160 × 48 pressable chip with a 32-px icon slot + body12Medium title.
 * Two visual states driven by the `selected` prop:
 *
 *   default  — white bg, 1px border.default, title text.primary
 *   selected — gradient.slate150Cobalt150 bg (bottom→top, #f5f7f9 →
 *              #d7e1fe), 1px border.focussed (#0741ef), title in the
 *              same cobalt.
 *
 * Layout (both states identical):
 *   container: w 160 / h 48 / radius.lg (12) / 1-px border, padding
 *              left spacing[12], top spacing[4], bottom spacing[4],
 *              right 39 (the Figma right-pad is a raw 39 px and isn't
 *              on the spacing scale — left as a literal with a note).
 *   inner row: flexDirection row, alignItems center, gap spacing[6].
 *   icon slot: mediaSize[32] × mediaSize[32], image resizeMode cover.
 *   title:     body12Medium via the Text atom, numberOfLines 1.
 *
 * Atoms folder convention is flat .tsx files, so this lives at
 * src/atoms/Selector.tsx (rather than a Selector/ folder) to match
 * the existing Button.tsx / Chip.tsx pattern.
 *
 * Hex → token:
 *   #ffffff   → colors.surface.default
 *   #d9e3ec   → colors.border.default
 *   #262626   → colors.text.primary
 *   #0741ef   → colors.border.focussed
 *   #f5f7f9 → #d7e1fe gradient → gradients.slate150Cobalt150
 */
import React from 'react';
import {
  View,
  Image,
  Pressable,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { haptics } from '../lib/haptics';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  mediaSize,
  gradients,
} from '../tokens';

// Component-spec dims — Figma fixed.
const CHIP_W = 160;
const CHIP_H = 48;
// Figma reads `paddingRight: 39`, which is only the leftover space in its
// fixed 160-wide chip. Kept as 39 that squeezed the title to ~68 dp in a
// flex chip and Android split "Self-employed" mid-word ("Self-emp / loyed")
// at large OS font sizes. Symmetric 12 keeps the Figma look at 1× and gives
// the title room.
const CHIP_PAD_RIGHT = spacing[12];

export interface SelectorProps {
  title: string;
  /** Drives the visual state — true → selected. Default false. */
  selected?: boolean;
  /** Icon slot image source. Falls back to a flat neutral square when
   *  omitted so the chip never renders broken art. */
  source?: ImageSourcePropType;
  onPress?: () => void;
  /** A11y label override. Defaults to the title. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Selector({
  title,
  selected = false,
  source,
  onPress,
  accessibilityLabel,
  style,
}: SelectorProps) {
  const borderColor = selected
    ? colors.border.focussed
    : colors.border.default;
  const titleColor = selected
    ? colors.border.focussed
    : colors.text.primary;

  // Inner container fills the Pressable (so callers can override the
  // chip's outer width by passing `style={{ flex: 1 }}` and get an
  // equal-split row instead of the default 160 fixed).
  const containerStyle: ViewStyle = {
    width: '100%',
    // minHeight + 2-line title: "Self-employed" was cut to "Self Emplo…"
    // at larger OS font sizes on a 360-dp phone.
    minHeight: CHIP_H,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    borderColor,
    paddingLeft: spacing[12],
    paddingRight: CHIP_PAD_RIGHT,
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    overflow: 'hidden',
  };

  const content = (
    <>
      <View
        style={{
          width: mediaSize[32],
          height: mediaSize[32],
          // Neutral placeholder bg so the slot reads even when no
          // `source` is supplied yet (Dev swap incoming).
          backgroundColor: colors.surface.sunken,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}
      >
        {source ? (
          <Image
            source={source}
            style={{ width: mediaSize[32], height: mediaSize[32] }}
            // `contain` for square icons — `cover` would crop the
            // edges of a 96×96 source rendered into a 32×32 slot.
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      <Text
        variant="body12Medium"
        color={titleColor}
        align="left"
        numberOfLines={2}
        style={{ flexShrink: 1 }}
      >
        {/* Zero-width space after each hyphen: Android's line breaker did
            not treat the hyphen as a break point and split "Self-employed"
            as "Self-employ / ed". Invisible when the title fits one line. */}
        {title.replace(/-/g, '-\u200B')}
      </Text>
    </>
  );

  const body = selected ? (
    <LinearGradient
      colors={gradients.slate150Cobalt150.colors}
      start={gradients.slate150Cobalt150.start}
      end={gradients.slate150Cobalt150.end}
      style={containerStyle}
    >
      {content}
    </LinearGradient>
  ) : (
    <View
      style={[
        containerStyle,
        { backgroundColor: colors.surface.default },
      ]}
    >
      {content}
    </View>
  );

  const handlePress = onPress
    ? () => {
        haptics.selection();
        onPress();
      }
    : undefined;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? title}
      // Default to the Figma-fixed 160×48 footprint; callers can pass
      // `style={{ flex: 1 }}` to take an equal share of a parent row
      // (the inner container is width: '100%' so it follows).
      style={[{ width: CHIP_W, minHeight: CHIP_H }, style]}
    >
      {body}
    </Pressable>
  );
}
