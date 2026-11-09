/**
 * FocusAwareStatusBar — expo-status-bar's <StatusBar>, applied only while
 * its screen is focused.
 *
 * Tab screens (and screens under a pushed stack screen) stay mounted, and
 * expo-status-bar lets the most recently mounted instance win. So after
 * visiting Earnings or Profile (style="dark"), returning to Home kept DARK
 * icons on Home's dark-blue hero — unreadable. Rendering the StatusBar only
 * for the focused screen makes each screen's own style apply every time it is
 * shown. Drop-in replacement: same props as expo-status-bar's StatusBar.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import type { StatusBarProps } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

export function FocusAwareStatusBar(props: StatusBarProps) {
  const isFocused = useIsFocused();
  return isFocused ? <StatusBar {...props} /> : null;
}
