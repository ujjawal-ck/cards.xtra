/**
 * BottomNav — organism (Figma set 394:23561, refined 3614:171539)
 *
 * Floating dark pill with 4 tabs and a "light source" spotlight above the
 * active tab. Positioning is the caller's job (TabNavigator places it above
 * the home indicator).
 *
 * Layout
 *   • Pill: colors.surface.dark, radius.full, 60 tall, 8 inner padding.
 *   • Tabs: equal width (flex: 1) and full pill height, so every tab has the
 *     same ~76 × 60 tap area and the tabs sit on an even rhythm. (They were
 *     content-width with space-between, which left uneven gaps and
 *     28 × 36 targets.)
 *
 * States (Figma 3614:171539)
 *   • Active:   filled icon, label caption10SemiBold, colors.text.inverse.
 *   • Inactive: outline icon (baked at 70 % white), label caption10Regular,
 *               colors.text.inverseMuted — the active tab now reads at a
 *               glance instead of every label being pure white.
 *
 * Spotlight
 *   • One shared spotlight, not one per tab: it slides between tabs on a
 *     spring, so a tab switch reads as one continuous motion.
 *   • Drawn in SVG as a radial glow (soft on every edge) under a small
 *     rounded emitter bar. The old version was a rectangular linear
 *     gradient that rendered as a hard-edged grey box on Android.
 *
 * Motion
 *   • Press: content scales to 0.92 and springs back.
 *   • Activate: icon does a small settle (0.86 → 1) as the spotlight lands.
 *   • No size change between states, so labels never jiggle.
 *
 * Accessibility: container role "tablist", tabs role "tab" with selected
 * state.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, primitives, spacing, radius } from '../tokens';

export type BottomNavTab = 'home' | 'offers' | 'earnings' | 'profile';

export interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabPress?: (tab: BottomNavTab) => void;
  style?: StyleProp<ViewStyle>;
}

type TabSpec = {
  id: BottomNavTab;
  label: string;
  outline: IconName;
  filled: IconName;
};

const TABS: TabSpec[] = [
  { id: 'home', label: 'Home', outline: 'nav-home-outline', filled: 'nav-home-filled' },
  { id: 'offers', label: 'Offers', outline: 'nav-offers-outline', filled: 'nav-offers-filled' },
  { id: 'earnings', label: 'Earnings', outline: 'nav-earnings-outline', filled: 'nav-earnings-filled' },
  { id: 'profile', label: 'Profile', outline: 'nav-profile-outline', filled: 'nav-profile-filled' },
];

// Component-spec dims — not in the shared scales.
const PILL_HEIGHT = 60;
const PILL_PAD_X = spacing[8];
const ICON_SIZE = 22;
// Spotlight: soft glow box + the emitter bar on the pill's top edge.
const GLOW_W = 56;
const GLOW_H = 40;
const EMITTER_W = 20;
const EMITTER_H = 3;

const SPRING = { damping: 18, stiffness: 210, mass: 0.7 };

// ----------------------------------------------------------------------------
// Spotlight — radial glow falling from the top edge + a bright emitter bar.
// ----------------------------------------------------------------------------
function Spotlight() {
  return (
    <View pointerEvents="none" style={{ width: GLOW_W, height: GLOW_H, alignItems: 'center' }}>
      <Svg width={GLOW_W} height={GLOW_H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          {/* Centred on the top edge; the ellipse reaches the bottom of the
              box so the light falls onto the icon and fades out on all
              sides with no visible edge. */}
          <RadialGradient
            id="navSpot"
            cx="50%"
            cy="0%"
            rx="50%"
            ry="100%"
            fx="50%"
            fy="0%"
          >
            <Stop offset="0" stopColor={colors.text.inverse} stopOpacity={0.42} />
            <Stop offset="0.5" stopColor={colors.text.inverse} stopOpacity={0.14} />
            <Stop offset="1" stopColor={colors.text.inverse} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={GLOW_W} height={GLOW_H} fill="url(#navSpot)" />
      </Svg>
      <View
        style={{
          width: EMITTER_W,
          height: EMITTER_H,
          borderBottomLeftRadius: EMITTER_H,
          borderBottomRightRadius: EMITTER_H,
          backgroundColor: primitives.transparentWhite[80],
        }}
      />
    </View>
  );
}

// ----------------------------------------------------------------------------
// TabButton
// ----------------------------------------------------------------------------
function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: TabSpec;
  isActive: boolean;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);
  const settle = useSharedValue(1);

  // Small settle on the icon as the spotlight lands on it.
  useEffect(() => {
    if (!isActive) return;
    settle.value = withSequence(
      withTiming(0.86, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(1, SPRING)
    );
  }, [isActive, settle]);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.cubic) });
  }, [pressed]);
  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, SPRING);
  }, [pressed]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.08 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settle.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
      style={{
        flex: 1,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: spacing[4] }, contentStyle]}>
        <Animated.View style={iconStyle}>
          <Icon name={isActive ? tab.filled : tab.outline} size={ICON_SIZE} />
        </Animated.View>
        <Text
          variant={isActive ? 'caption10SemiBold' : 'caption10Regular'}
          color={isActive ? colors.text.inverse : colors.text.inverseMuted}
          align="center"
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomNav({ activeTab, onTabPress, style }: BottomNavProps) {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));
  const [tabWidth, setTabWidth] = useState(0);
  const spotX = useSharedValue(0);
  const spotOpacity = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTabWidth((e.nativeEvent.layout.width - PILL_PAD_X * 2) / TABS.length);
  }, []);

  // Centre of the active tab, minus half the glow. First placement jumps
  // (no slide-in from the left edge on mount); later changes spring.
  useEffect(() => {
    if (tabWidth === 0) return;
    const x = PILL_PAD_X + tabWidth * activeIndex + (tabWidth - GLOW_W) / 2;
    if (spotOpacity.value === 0) {
      spotX.value = x;
      spotOpacity.value = withTiming(1, { duration: 180 });
    } else {
      spotX.value = withSpring(x, SPRING);
    }
  }, [activeIndex, tabWidth, spotX, spotOpacity]);

  const spotStyle = useAnimatedStyle(() => ({
    opacity: spotOpacity.value,
    transform: [{ translateX: spotX.value }],
  }));

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[
        {
          height: PILL_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: PILL_PAD_X,
          borderRadius: radius.full,
          backgroundColor: colors.surface.dark,
          // Custom shadow per spec — #000 @ 16%, y4, blur12.
          shadowColor: primitives.slate[1000],
          shadowOpacity: 0.16,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      {/* Clipped to the pill shape so the glow never spills past the
          rounded ends on the outer tabs. Separate from the outer view,
          which must not clip (that would cut its shadow on iOS). */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, spotStyle]}>
          <Spotlight />
        </Animated.View>
      </View>
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTab}
          onPress={() => onTabPress?.(tab.id)}
        />
      ))}
    </View>
  );
}
