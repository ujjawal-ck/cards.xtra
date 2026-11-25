/**
 * StickyFooter — molecule. Pins a bottom action bar (Submit, Continue,
 * FooterButtons) to the bottom of a screen and owns the two things that go
 * wrong on Android edge-to-edge:
 *   • the system nav bar is drawn over the app, so the bar is padded by the
 *     bottom safe-area inset;
 *   • RN's KeyboardAvoidingView does nothing there (see useKeyboardInset.ts),
 *     so the bar is lifted by the live keyboard height instead.
 *
 * Place it OUTSIDE the screen's SafeAreaView (whose edges are top/left/right),
 * as the last child of the screen root — the same shape the withdraw screens use:
 *
 *   <View style={{ flex: 1 }}>
 *     <SafeAreaView edges={['top','left','right']} style={{ flex: 1 }}>…</SafeAreaView>
 *     <StickyFooter>…bar…</StickyFooter>
 *   </View>
 *
 * The children keep their own look (fill, shadow, padding); this only adds the
 * inset below them.
 */
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardPadding } from '../lib/useKeyboardInset';
import { colors } from '../tokens';

export interface StickyFooterProps {
  children: React.ReactNode;
}

export function StickyFooter({ children }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  const keyboardPad = useKeyboardPadding();
  return (
    <Animated.View style={keyboardPad}>
      <View style={{ backgroundColor: colors.surface.default, paddingBottom: insets.bottom }}>
        {children}
      </View>
    </Animated.View>
  );
}
