/**
 * StaggeredEntrance — a focus-driven entrance that cascades its children
 * into place (fade + rise), so a page reads as "content arriving" rather
 * than a flat cross-fade between screens.
 *
 * Two uses in this app:
 *   • Tab screens (Earnings / Profile): wrap the screen's section blocks so
 *     each one fades + rises a beat after the previous — the Blinkit / Swiggy
 *     "settle in" feel. Replays every time the tab regains focus, so switching
 *     tabs always feels alive (the tab screens stay mounted, so a plain
 *     re-focus would otherwise show them instantly with no motion).
 *   • Stack screens (via RootNavigator's `screenLayout`): wrap the whole
 *     screen as a single child with `fade={false}` so it rises + settles into
 *     place AFTER the native slide — no opacity fade there, which would show
 *     the screen underneath through it mid-slide.
 *
 * Each direct child becomes one cascade step. Steps start `step` ms apart,
 * capped at MAX_STEPS so a long column's tail doesn't wait seconds.
 *
 * iOS only — on Android the cascade is skipped entirely and children render
 * plain (layout, `gap`, and `fill` flex are preserved). Reanimated entrance
 * timing under Android edge-to-edge has been a recurring source of jank in
 * this app, so the delight is kept to iOS where it lands cleanly.
 */
import React from 'react';
import { Platform, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

// Quick, soft cascade. Tunable.
const STEP_MS = 65; // gap between successive items
const DURATION_MS = 380; // per-item fade+rise duration
const RISE = 16; // px each item travels up into place
const MAX_STEPS = 8; // cap so far-down items don't wait seconds

function StaggerItem({
  index,
  step,
  rise,
  duration,
  fade,
  fill,
  playKey,
  children,
}: {
  index: number;
  step: number;
  rise: number;
  duration: number;
  fade: boolean;
  fill: boolean;
  playKey: number;
  children: React.ReactNode;
}) {
  // Starts hidden (progress 0) and is animated to 1 on mount and on every
  // playKey bump (a refocus). Reset-then-animate so a refocus replays cleanly.
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      Math.min(index, MAX_STEPS) * step,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [playKey, index, step, duration, progress]);

  const style = useAnimatedStyle(() => ({
    // Stack screens slide in over the page below them — fading opacity there
    // would show that page through this one mid-slide, so fade is opt-out.
    opacity: fade ? progress.value : 1,
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [rise, 0],
          Extrapolation.CLAMP
        ),
      },
      // A whisper of scale gives the rise a bit more life. Negligible when
      // rise is small; carries the no-fade (stack) variant.
      {
        scale: interpolate(progress.value, [0, 1], [0.985, 1], Extrapolation.CLAMP),
      },
    ] as unknown as { translateY: number }[],
  }));

  // When the item wraps a full-screen child (a ScrollView / screen that relies
  // on flex:1), it must flex too or that child collapses to 0 height. Applied
  // as a static style, not via the animated worklet.
  return (
    <Animated.View style={[fill ? { flex: 1 } : null, style]}>
      {children}
    </Animated.View>
  );
}

export function StaggeredEntrance({
  children,
  step = STEP_MS,
  rise = RISE,
  duration = DURATION_MS,
  fade = true,
  fill = false,
  replayOnFocus = true,
  enabled = true,
  style,
}: {
  children: React.ReactNode;
  /** ms between successive items' starts. */
  step?: number;
  /** px each item rises into place. */
  rise?: number;
  /** per-item animation duration (ms). */
  duration?: number;
  /** Fade opacity in. Turn OFF for stack screens (slide would show-through). */
  fade?: boolean;
  /** flex:1 the container + items so a full-screen child (ScrollView / screen)
   *  fills the space instead of collapsing. Use for single full-screen wraps. */
  fill?: boolean;
  /** Replay the cascade each time the screen regains focus (tab switch / pop). */
  replayOnFocus?: boolean;
  /** Set false to render children with no animation. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // Animate only on iOS (see file header). On Android — and when explicitly
  // disabled — children render plain, preserving `fill` flex + `style` (gap).
  const active = enabled && Platform.OS === 'ios';

  const focused = useIsFocused();
  // Bump to (re)play the cascade. Children play on mount (initial 0); we only
  // bump on a false→true focus transition so the first mount plays once.
  const [playKey, setPlayKey] = React.useState(0);
  const wasFocused = React.useRef(true);
  React.useEffect(() => {
    if (!active || !replayOnFocus) return;
    if (focused && !wasFocused.current) setPlayKey((k) => k + 1);
    wasFocused.current = focused;
  }, [focused, active, replayOnFocus]);

  if (!active) return <View style={[fill && { flex: 1 }, style]}>{children}</View>;

  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[fill && { flex: 1 }, style]}>
      {items.map((child, i) => (
        <StaggerItem
          key={(React.isValidElement(child) && child.key) || i}
          index={i}
          step={step}
          rise={rise}
          duration={duration}
          fade={fade}
          fill={fill}
          playKey={playKey}
        >
          {child}
        </StaggerItem>
      ))}
    </View>
  );
}
