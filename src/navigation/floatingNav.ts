/**
 * Floating bottom-nav geometry, shared by the TabNavigator (which places the
 * pill) and the tab screens (which pad their scroll content to clear it).
 *
 * Android runs edge-to-edge, so the system navigation bar (≈48dp for
 * 3-button nav, ≈16–24dp for gesture nav) is drawn ON TOP of the app. A fixed
 * 20dp offset left the pill's lower half — the tab labels — underneath the
 * system bar. On Android the pill now sits above the real bottom inset; iOS
 * keeps the original 20dp (it already clears the home indicator).
 */
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sizing, spacing } from '../tokens';

/** Distance from the screen's bottom edge to the bottom of the nav pill. */
export function useFloatingNavOffset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? insets.bottom + spacing[12] : spacing[20];
}

/** Scroll-content bottom padding a tab screen needs to clear the pill. */
export function useFloatingNavClearance(): number {
  return useFloatingNavOffset() + sizing.bottomNavHeight + spacing[32];
}
