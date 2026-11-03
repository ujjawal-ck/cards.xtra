/**
 * BottomNav — organism (Figma set 394:23561, refined 3614:171539)
 *
 * Full-width floating dark pill with 4 tabs and a small "light source"
 * flourish that sits above the active tab's icon and follows the active
 * state. Standalone component — positioning is the caller's
 * responsibility (the wrapper in TabNavigator handles the absolute
 * placement above the home indicator).
 *
 * Container:
 *   bg colors.surface.dark, borderRadius radius.full, height 60,
 *   paddingVertical spacing[12], paddingHorizontal spacing[48],
 *   flex row, justifyContent space-between, alignItems center.
 *   Custom drop shadow per spec (#000 @ 16%, y4, blur12 — closest
 *   elevation token is neutral.md with 18%/blur16, but the spec values
 *   are inlined here for fidelity).
 *
 * Tabs (28 × 36, vertical column, gap spacing[4], centred):
 *   • icon 22×22 — nav-*-filled when active, nav-*-outline when inactive
 *   • label caption10SemiBold when active, caption10Regular when inactive
 *   • label colour text.inverse (white) in BOTH states
 *
 * Light source flourish (the new detail in 3614:171539):
 *   • 32 × 12 region positioned at the TOP edge of the pill, horizontally
 *     centred above the ACTIVE tab.
 *   • Downward-fading white gradient wash (~30% → 0% alpha) reads as a
 *     beam of light dropping onto the icon.
 *   • 16 × 2 rounded white bar (~90% alpha) sitting along the very top
 *     edge — the "emitter" of the beam.
 *   • Re-positions whenever activeTab changes because the flourish is
 *     rendered as an absolute child of each tab's Pressable; React only
 *     mounts the flourish on the active tab, so it visually "moves".
 *
 * Token mapping:
 *   #000000 → colors.surface.dark
 *   #ffffff → colors.text.inverse (label) / transparentWhite primitives (light flourish)
 *   transparent-black primitives are used for the small shadow on the
 *   light_source bar (also decorative/illustration use).
 */
import React, { useCallback, useEffect } from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  primitives,
  spacing,
  radius,
} from '../tokens';

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
const ICON_SIZE = 22;
const LIGHT_W = 46;
const LIGHT_H = 40;
const LIGHT_BAR_W = 16;
const LIGHT_BAR_H = 2;

// ----------------------------------------------------------------------------
// LightSource — recreated programmatically (no SVG asset shipped).
// Sized 32×12. Top-rim 16×2 white bar + downward gradient wash.
// ----------------------------------------------------------------------------
function LightSource() {
  return (
    <View
      pointerEvents="none"
      style={{ width: LIGHT_W, height: LIGHT_H }}
    >
      {/* Downward spotlight wash — brighter at the emitter, holding a mid
          glow longer before fading to 0 so the beam spreads further down
          onto the icon and reads as a true spotlight. */}
      <LinearGradient
        colors={[
          primitives.transparentWhite[40],
          primitives.transparentWhite[16],
          'transparent',
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: LIGHT_W,
          height: LIGHT_H,
        }}
      />
      {/* Top-rim white bar (~90% alpha) with a small drop shadow */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: (LIGHT_W - LIGHT_BAR_W) / 2,
          width: LIGHT_BAR_W,
          height: LIGHT_BAR_H,
          borderRadius: LIGHT_BAR_H / 2,
          backgroundColor: primitives.transparentWhite[80],
          shadowColor: primitives.slate[1000],
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 4,
          elevation: 2,
        }}
      />
    </View>
  );
}

// ----------------------------------------------------------------------------
// TabButton — single tab with delightful press + active-state animations:
//   • Press feedback: brief scale-down (1 → 0.92) on pressIn, springs back
//     on pressOut.  Adds a tactile "click" feel — the bar no longer snaps.
//   • Active state: spring (damping 16, stiffness 220) drives the icon/label
//     pop (scale 1 → 1.08) and the LightSource flourish fade-in (opacity
//     0 → 1, scale 0.7 → 1, translateY 4 → 0). Both motions share one
//     `activeProgress` shared value so they stay phase-locked.
//   • The flourish is now ALWAYS mounted (just invisible when inactive)
//     so we can animate it in/out instead of mount-on-active (which snaps).
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
  const activeProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withSpring(isActive ? 1 : 0, {
      damping: 16,
      stiffness: 220,
      mass: 0.6,
    });
  }, [isActive, activeProgress]);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, {
      duration: 80,
      easing: Easing.out(Easing.cubic),
    });
  }, [pressed]);
  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [pressed]);

  // Icon + label wrapper — combines press scale (1 → 0.92) and active
  // pop (1 → 1.08). Multiplying lets both effects co-exist.
  const contentStyle = useAnimatedStyle(() => {
    const pressScale = 1 - pressed.value * 0.08;
    const activeScale = 1 + activeProgress.value * 0.08;
    return {
      transform: [
        { scale: pressScale * activeScale },
      ] as unknown as { scale: number }[],
    };
  });

  // LightSource flourish — fades in + rises + scales up when this tab
  // becomes active; reverses when another tab takes over.
  const flourishStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [
      { translateY: interpolate(activeProgress.value, [0, 1], [4, 0]) },
      { scale: interpolate(activeProgress.value, [0, 1], [0.7, 1]) },
    ] as unknown as { translateY: number }[],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
      hitSlop={spacing[8]}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[4],
      }}
    >
      {/* Flourish — always mounted, animated visibility. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -spacing[12],
            left: 0,
            right: 0,
            alignItems: 'center',
          },
          flourishStyle,
        ]}
      >
        <LightSource />
      </Animated.View>

      {/* Icon + label — animated wrapper handles press + active scaling.
          The icon/label themselves still swap instantly (outline →
          filled, Regular → SemiBold) because RN can't morph weights /
          shapes; the scale around them masks the swap so it doesn't
          read as a hard snap. */}
      <Animated.View
        style={[
          { alignItems: 'center', gap: spacing[4] },
          contentStyle,
        ]}
      >
        <Icon
          name={isActive ? tab.filled : tab.outline}
          size={ICON_SIZE}
        />
        <Text
          variant={isActive ? 'caption10SemiBold' : 'caption10Regular'}
          color={colors.text.inverse}
          align="center"
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomNav({
  activeTab,
  onTabPress,
  style,
}: BottomNavProps) {
  return (
    <View
      style={[
        {
          height: PILL_HEIGHT,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing[12],
          paddingHorizontal: spacing[48],
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
