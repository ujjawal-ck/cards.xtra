/**
 * useKeyboardPadding — a reanimated style whose paddingBottom tracks the live
 * keyboard height, for manual keyboard avoidance.
 *
 * Why reanimated's useAnimatedKeyboard (not RN's KeyboardAvoidingView or the
 * Keyboard events): under edge-to-edge (app.json edgeToEdgeEnabled) Android
 * doesn't resize the window for the IME and RN's keyboard height is unreliable,
 * so the keyboard ends up covering the input. reanimated reads the IME insets
 * natively on the UI thread, which works correctly under edge-to-edge.
 *
 * IMPORTANT (Android edge-to-edge): the isStatusBarTranslucentAndroid /
 * isNavigationBarTranslucentAndroid options are REQUIRED here. With
 * edgeToEdgeEnabled the system bars are translucent, and without these flags
 * reanimated mis-measures the IME inset (reports ~0), so the form never lifts
 * over the keyboard in the APK. They are no-ops on iOS.
 *
 * Usage (must use reanimated's Animated.View, not RN's):
 *   import Animated from 'react-native-reanimated';
 *   const kb = useKeyboardPadding();
 *   <Animated.View style={[{ flex: 1 }, kb]}>…</Animated.View>
 * paddingBottom shrinks the flex:1 hero and lifts the white form sheet above
 * the keys.
 */
import { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

export function useKeyboardPadding() {
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  return useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));
}
