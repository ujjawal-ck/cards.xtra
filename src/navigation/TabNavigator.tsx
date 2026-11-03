/**
 * TabNavigator — 4 tabs (Home / Offers / Earnings / Profile).
 *
 * The actual chrome (dark pill, icons, labels, active-state treatment)
 * lives in the BottomNav organism. This file just wires React
 * Navigation's tab state into BottomNav's `activeTab` / `onTabPress`
 * props and handles the floating positioning (safe-area inset +
 * absolute layout above the home indicator).
 *
 * Also exposes a tiny `BottomNavVisibility` context so screens
 * (currently HomeScreen) can hide the floating bar on scroll-forward
 * and reveal it on scroll-backward without each tab needing its own
 * BottomNav copy. FloatingBottomNav reads the shared state and
 * animates translateY/opacity via reanimated.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Dimensions, Easing as RNEasing, View } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { BottomNav } from '../organisms';
import type { BottomNavTab } from '../organisms';
import { colors, sizing, spacing } from '../tokens';
import type { TabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { play } from '../lib/haptics';

// ----------------------------------------------------------------------------
// BottomNav visibility — shared between FloatingBottomNav (consumer)
// and any screen that wants to hide it on scroll (producer).
// ----------------------------------------------------------------------------
interface BottomNavVisibility {
  hidden: boolean;
  setHidden: (next: boolean) => void;
}
const BottomNavVisibilityContext = createContext<BottomNavVisibility>({
  hidden: false,
  setHidden: () => undefined,
});

/** Call inside any tab screen to hide / reveal the floating BottomNav. */
export function useBottomNavVisibility() {
  return useContext(BottomNavVisibilityContext);
}

const Tab = createBottomTabNavigator<TabParamList>();

// ----------------------------------------------------------------------------
// Tab switch motion — a directional horizontal slide (shared-axis X).
//
// Each scene translates on X by `progress * screenWidth`, where
// `current.progress` encodes a scene's position relative to the active tab:
//   -1 → one tab to the LEFT,  0 → active (centred),  +1 → one tab to the RIGHT.
// So the incoming tab slides in from whichever side it sits on and the outgoing
// tab slides off the opposite edge — moving right reads as "right tab slides in
// from the right", moving back reverses it.
//
// Crucially this uses NO opacity and NO scale: both scenes stay fully opaque the
// entire time. Mid-transition the incoming scene's left edge meets the outgoing
// scene's right edge exactly at screen centre (incoming at +w/2 covers the right
// half, outgoing at -w/2 covers the left half), so the two scenes tile the
// viewport with a single seam and NEVER leave a gap. That kills the black/shadow
// flash the earlier opacity+scale fade exposed on Android — scaling both scenes
// to 0.92 pulled their edges inward and the dip-to-zero opacity let the layer
// behind show through. A pure slide can't expose anything underneath.
//
// (Tabs more than one step away are snapped to ±1 by the navigator with no
// animation, so multi-tab jumps slide the destination in without flashing the
// in-between scenes.)
const SCREEN_WIDTH = Dimensions.get('window').width;
const slideInterpolator = ({
  current,
}: {
  current: { progress: { interpolate: (cfg: any) => any } };
}) => ({
  sceneStyle: {
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        }),
      },
    ],
  },
});

// Material "standard" easing (cubic-bezier 0.4, 0, 0.2, 1) — accelerate out,
// decelerate in. ~300 ms reads as a graceful transition without dragging.
const tabTransitionSpec = {
  animation: 'timing' as const,
  config: {
    duration: 300,
    easing: RNEasing.bezier(0.4, 0, 0.2, 1),
  },
};

// React Navigation route name ↔ BottomNav tab id.
const ROUTE_TO_TAB: Record<keyof TabParamList, BottomNavTab> = {
  Home: 'home',
  Offers: 'offers',
  Earnings: 'earnings',
  Profile: 'profile',
};
const TAB_TO_ROUTE: Record<BottomNavTab, keyof TabParamList> = {
  home: 'Home',
  offers: 'Offers',
  earnings: 'Earnings',
  profile: 'Profile',
};

// Bottom-fade colours. Transparent-WHITE at the top (NOT 'transparent',
// which is black-at-0-alpha and muddies the fade to grey), down to ~90%
// white at the bottom so the content underneath stays ~10% visible.
const FADE_COLORS: [string, string] = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.9)',
];

function FloatingBottomNav({ state, navigation }: BottomTabBarProps) {
  // Visual gap below the floating nav, measured from the screen's bottom
  // edge. ~20 px (down from 32) so the pill sits lower with less empty
  // space beneath it, while still clearing the iOS home indicator.
  const bottomOffset = spacing[20];

  const activeRouteName = state.routes[state.index]
    .name as keyof TabParamList;
  const activeTab = ROUTE_TO_TAB[activeRouteName];

  const handleTabPress = (tab: BottomNavTab) => {
    const routeName = TAB_TO_ROUTE[tab];
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (state.routes[state.index].key !== route.key && !event.defaultPrevented) {
      // Only on a real tab change (not re-tapping the active tab).
      play('tabSwitch');
      navigation.navigate(routeName as never);
    }
  };

  // Consume the shared visibility flag; animate translateY (off-screen
  // when hidden) + opacity for a smooth scroll-driven hide/reveal.
  // Distance below the screen accounts for the pill's height + bottom
  // offset + a fudge so shadows don't peek.
  const { hidden, setHidden } = useBottomNavVisibility();

  // Always reveal the nav when the tab changes — `hidden` is shared across
  // tabs, so without this a scroll-hide on one tab (Home / Offers) would
  // leave it hidden on a no-scroll tab (Earnings / Profile). The scrollable
  // tab then re-hides it on its own scroll.
  React.useEffect(() => {
    setHidden(false);
  }, [activeRouteName, setHidden]);

  const hideOffset =
    sizing.bottomNavHeight + bottomOffset + spacing[16];
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(hidden ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [hidden, progress]);
  // Hide animation: translateY off-screen + opacity fade + a scale-down
  // (1 → 0.8) so the bar shrinks as it dismisses, then expands back to
  // full size as it returns. Same shared `progress` value drives all
  // three so they stay perfectly in sync.
  // Cast the transform array because RN's TS types require each entry
  // to be a single-key object literal — mixing `translateY` and `scale`
  // in two consecutive objects trips the inferred union.
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * hideOffset },
      { scale: 1 - progress.value * 0.2 },
    ] as unknown as { translateY: number }[],
    opacity: 1 - progress.value,
  }));

  // Bottom fade — a translucent gradient (transparent → page bg) behind the
  // nav so content scrolling under it fades into the background instead of
  // peeking around/below the pill. Fades out together with the nav on
  // scroll-hide (so full content is visible while actively scrolling).
  const fadeStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const fadeHeight = bottomOffset + sizing.bottomNavHeight + spacing[40];

  return (
    <>
      {/* Bottom fade scrim — rendered BEHIND the pill, on every tab. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: fadeHeight,
          },
          fadeStyle,
        ]}
      >
        <LinearGradient
          colors={FADE_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={hidden ? 'none' : 'box-none'}
        style={[
          {
            position: 'absolute',
            // 16px gutter on both sides — the BottomNav now fills its
            // container width and centres itself horizontally that way.
            left: spacing[16],
            right: spacing[16],
            bottom: bottomOffset,
          },
          animStyle,
        ]}
      >
        <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
      </Animated.View>
    </>
  );
}

function BottomNavVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hidden, setHiddenState] = useState(false);
  // Stable setter — referential stability matters because screens use
  // this inside effects that compare deps.
  const setHidden = useCallback((next: boolean) => {
    setHiddenState((prev) => (prev === next ? prev : next));
  }, []);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);
  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function TabNavigator() {
  return (
    <BottomNavVisibilityProvider>
      {/* Solid app-background backdrop BEHIND the scenes. The per-scene
          `sceneStyle` bg fades out together with its scene (opacity is applied
          to the whole view, bg included), so at the fade-through hand-off —
          when both scenes are momentarily near opacity 0 — there is nothing
          opaque left in the scene layer. On Android that exposed the black
          window (and any lazily-mounting tab) as a dark "skeleton" flash. This
          non-animated layer guarantees what shows through that instant is the
          app's own page background, never black. */}
      <View style={{ flex: 1, backgroundColor: colors.background.default }}>
        <Tab.Navigator
          id={undefined}
          tabBar={(props) => <FloatingBottomNav {...props} />}
          // Mount all four tabs up front. With lazy mounting (the default) the
          // first switch to a tab triggers its mount mid-transition, so the
          // fade-through reveals a blank/black screen until React commits —
          // exactly the skeleton flash. Eager mount keeps every scene ready.
          detachInactiveScreens={false}
          screenOptions={{
            headerShown: false,
            lazy: false,
            // Directional horizontal slide between tabs (see slideInterpolator).
            // `animation: 'shift'` opts the navigator into JS-driven scene
            // transitions (vs the native static swap) so the custom interpolator
            // + spec below actually drive the change.
            animation: 'shift',
            transitionSpec: tabTransitionSpec,
            sceneStyleInterpolator: slideInterpolator,
            // Per-scene bg (fades with the scene — the backdrop View above is
            // what actually covers the hand-off instant).
            sceneStyle: { backgroundColor: colors.background.default },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Offers" component={OffersScreen} />
          <Tab.Screen name="Earnings" component={EarningsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </View>
    </BottomNavVisibilityProvider>
  );
}
