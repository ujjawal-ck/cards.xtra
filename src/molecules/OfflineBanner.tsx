/**
 * OfflineBanner — a slim strip shown at the top of the app while the device
 * has no internet. Data that's already loaded stays on screen; React Query
 * refetches automatically once the connection is back.
 */
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../atoms';
import { colors, spacing } from '../tokens';
import { useIsOffline } from '../lib/network';

export function OfflineBanner() {
  const offline = useIsOffline();
  const insets = useSafeAreaInsets();
  if (!offline) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + spacing[4],
        paddingBottom: spacing[4],
        paddingHorizontal: spacing[16],
        backgroundColor: colors.feedback.warning.subtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.feedback.warning.border,
        alignItems: 'center',
      }}
    >
      <Text variant="body12SemiBold" color={colors.feedback.warning.text} align="center">
        You're offline. We'll refresh when you're back online.
      </Text>
    </View>
  );
}
