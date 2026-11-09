/**
 * Accordion — molecule (Figma set 3108:11342, 36 variants)
 *
 * Expandable row. The Figma "Layout" axis (Title / Both / Body) maps to
 * the `expanded` boolean: collapsed = title only, expanded = title +
 * body. Whole header is pressable; tap fires `onToggle(!expanded)`.
 *
 * Structure (matches Figma axes exactly):
 *   Container (vertical, gap spacing[8], width-fill, radius 0)
 *     HeaderRow (horizontal, align flex-start, justify space-between,
 *                gap spacing[4] | spacing[12] when leadingIcon present)
 *       [LeadingIcon? 24×24 outline]
 *       ContentBlock (vertical, gap spacing[4], flex-fills middle)
 *         Title  — body16Medium / text.primary
 *         Body?  — body14Regular / text.secondary  (only when expanded)
 *       [TrailingIcon? 24×24 chevron — rotates 90→270 on expand]
 *
 * State → bg + padding:
 *   'default'   bg surface.default,   padding 16/16
 *   'highlight' bg action.secondary.default (pale cobalt), padding 16/16
 *   'bare'      bg transparent,       padding 16 top/bottom, 0 left/right
 *
 * Chevron: no chevron SVG ships in src/assets/icons, so the glyph is
 * the Unicode '›' rendered via raw RN Text, sized with `iconSize[24]`,
 * and rotated via Animated.Value — 90° = pointing down (collapsed),
 * 270° = pointing up (expanded). The transition animates over 200ms.
 *
 * Hex → token mapping:
 *   #ffffff → colors.surface.default
 *   #ebf0ff → colors.action.secondary.default
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 */
import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  View,
  Animated,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, spacing, iconSize } from '../tokens';

export type AccordionState = 'default' | 'highlight' | 'bare';

export interface AccordionProps {
  title: string;
  body?: string;
  expanded: boolean;
  onToggle?: (next: boolean) => void;
  state?: AccordionState;
  leadingIcon?: IconName;
  /** Render the trailing chevron. Default true. */
  trailingIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

type StateSpec = {
  bg?: string;
  padH: number;
  padV: number;
};

const STATE_SPEC: Record<AccordionState, StateSpec> = {
  default: { bg: colors.surface.default, padH: spacing[16], padV: spacing[16] },
  highlight: {
    bg: colors.action.secondary.default,
    padH: spacing[16],
    padV: spacing[16],
  },
  bare: { bg: undefined, padH: 0, padV: spacing[16] },
};

const ANIM_DURATION_MS = 200;

export function Accordion({
  title,
  body,
  expanded,
  onToggle,
  state = 'default',
  leadingIcon,
  trailingIcon = true,
  style,
}: AccordionProps) {
  const spec = STATE_SPEC[state];
  const headerGap = leadingIcon ? spacing[12] : spacing[4];

  // Rotation driver: 0 = collapsed, 1 = expanded.
  const rotation = useRef(
    new Animated.Value(expanded ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: ANIM_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);

  const chevronRotate = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          // chevron-down icon: 0° closed, 180° open.
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  return (
    <Pressable
      onPress={() => onToggle?.(!expanded)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={[
        {
          width: '100%',
          paddingVertical: spec.padV,
          paddingHorizontal: spec.padH,
          backgroundColor: spec.bg,
          gap: spacing[8],
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: headerGap,
        }}
      >
        {leadingIcon ? (
          <Icon
            name={leadingIcon}
            size={iconSize[24]}
            color={colors.text.primary}
          />
        ) : null}

        <View style={{ flex: 1, gap: spacing[4] }}>
          <Text variant="body16Medium" color={colors.text.primary}>
            {title}
          </Text>
          {expanded && body ? (
            <Text variant="body14Regular" color={colors.text.secondary}>
              {body}
            </Text>
          ) : null}
        </View>

        {trailingIcon ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                width: iconSize[24],
                height: iconSize[24],
                alignItems: 'center',
                justifyContent: 'center',
              },
              chevronRotate,
            ]}
          >
            {/* Token-sized chevron icon. The Unicode '›' glyph scaled with the
                OS font size and drifted ~8 px between open and closed rows. */}
            <Icon name="chevron-down" size={iconSize[24]} color={colors.icon.actions} />
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
}
