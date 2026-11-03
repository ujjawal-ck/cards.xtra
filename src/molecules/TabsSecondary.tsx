/**
 * TabsSecondary — molecule (Figma 3232:32047)
 *
 * iOS-style segmented control: a pale-cobalt pill track with a white
 * thumb that slides under the active segment. Equal-width segments.
 *
 * Container: backgroundColor cobalt-50, border 1px slate-350, radius.full,
 * overflow hidden (so the thumb stays within the rounded track), height
 * driven by content (padY 8 + body14 lh 20 = 36, matching the Figma 36).
 *
 * Active segment:   label body14SemiBold cobalt-700, optional leading
 *                   icon shown (tinted cobalt-700).
 * Inactive segment: label body14Regular slate-700, no icon.
 *
 * The thumb is an absolutely-positioned Animated.View that translates
 * along the X axis by activeIndex × segmentWidth. Width is derived from
 * the container's measured layout, so this works for any segment count.
 *
 * Token mapping:
 *   #ebf0ff → colors.action.secondary.default (track)
 *   #d9e3ec → colors.border.default           (track border)
 *   #fff    → colors.surface.default          (thumb)
 *   #0036da → colors.text.link                (active label + icon)
 *   #5c5c5c → colors.text.secondary           (inactive label)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';
import { haptics } from '../lib/haptics';

export interface TabsSecondarySegment {
  label: string;
  icon?: IconName;
}

export interface TabsSecondaryProps {
  segments: TabsSecondarySegment[];
  activeIndex: number;
  onChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

const ANIM_DURATION_MS = 200;

export function TabsSecondary({
  segments,
  activeIndex,
  onChange,
  style,
}: TabsSecondaryProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const count = segments.length;
  const segmentWidth = count > 0 ? containerWidth / count : 0;

  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (segmentWidth === 0) return;
    Animated.timing(translate, {
      toValue: activeIndex * segmentWidth,
      duration: ANIM_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, segmentWidth, translate]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.action.secondary.default,
          borderRadius: radius.full,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          // overflow:hidden clips the thumb to the rounded track edges
          // (otherwise its square corners peek out under the radius).
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Sliding white thumb — rendered first so segment buttons stack
          on top in JSX order. */}
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: segmentWidth,
            backgroundColor: colors.surface.default,
            borderRadius: radius.full,
            transform: [{ translateX: translate }],
          }}
        />
      ) : null}

      {segments.map((seg, i) => {
        const isActive = i === activeIndex;
        const fg = isActive ? colors.text.link : colors.text.secondary;
        return (
          <Pressable
            key={`${seg.label}-${i}`}
            onPress={() => {
              haptics.selection();
              onChange?.(i);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[4],
              paddingVertical: spacing[8],
              paddingHorizontal: spacing[12],
            }}
          >
            {isActive && seg.icon ? (
              <Icon name={seg.icon} size={iconSize[16]} color={fg} />
            ) : null}
            <Text
              variant={isActive ? 'body14SemiBold' : 'body14Regular'}
              color={fg}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
