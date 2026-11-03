/**
 * BottomSheetHeader — organism (Figma 2837:201352)
 *
 * Sits at the top of the BottomSheet's content area. Two independently
 * toggleable elements: an optional title (Outfit SemiBold 18, dark)
 * and an optional bottom 1-px stroke.
 *
 * Geometry:
 *   vertical column, gap spacing[12]
 *   padding: top 12, right 16, bottom 16, left 16
 *   bg: colors.surface.default (white)
 *
 * Drag handle:
 *   44 × 4 pill (`sizing.touchMin` × literal 4), radius.full,
 *   colors.border.default, horizontally centred. Spec says the handle
 *   lives inside the header — so the parent BottomSheet hides @gorhom's
 *   default handle via `handleComponent={() => null}` and lets this
 *   visual stand in.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #d9e3ec → colors.border.default
 *   #262626 → colors.text.primary
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  sizing,
} from '../tokens';

export interface BottomSheetHeaderProps {
  /** Title text. Hidden when omitted. */
  title?: string;
  /** Render a 1-px bottom border in border.default. Default false. */
  showStroke?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Drag handle dims — height 4 isn't in the spacing scale.
const HANDLE_W = sizing.touchMin; // 44
const HANDLE_H = 4;

export function BottomSheetHeader({
  title,
  showStroke = false,
  style,
}: BottomSheetHeaderProps) {
  return (
    <View
      style={[
        {
          paddingTop: spacing[12],
          paddingRight: spacing[16],
          paddingBottom: spacing[16],
          paddingLeft: spacing[16],
          gap: spacing[12],
          backgroundColor: colors.surface.default,
          // Match the BottomSheet container's top-corner radius so the
          // white header clips to the same curve the sheet's background
          // already paints — otherwise this header's rectangular white
          // fill covers the rounded corners from above.
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          borderBottomWidth: showStroke ? borderWidth.thin : 0,
          borderBottomColor: showStroke ? colors.border.default : undefined,
        },
        style,
      ]}
    >
      {/* Drag handle — centred via alignSelf */}
      <View
        style={{
          alignSelf: 'center',
          width: HANDLE_W,
          height: HANDLE_H,
          borderRadius: radius.full,
          backgroundColor: colors.border.default,
        }}
      />

      {title ? (
        <Text
          variant="heading18SemiBold"
          color={colors.text.primary}
          align="center"
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}
