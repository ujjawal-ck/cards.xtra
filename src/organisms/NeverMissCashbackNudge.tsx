/**
 * NeverMissCashbackNudge — contextual Home prompt to enable "Never Miss
 * Cashback" AFTER the user has tracked at least one order ("you've earned
 * cashback before — turn this on so you never miss it again").
 *
 * Self-contained: renders nothing unless ALL hold —
 *   • Android with the native module linked (the feature only works there),
 *   • the feature isn't already armed (both permissions granted),
 *   • the user has ≥1 tracked order, and
 *   • they haven't dismissed the nudge (persisted).
 * So it never disturbs the Home flow on iOS / fresh installs / once enabled.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { Text, Icon } from '../atoms';
import { colors, spacing, radius, iconSize, borderWidth, elevation } from '../tokens';
import * as CashbackGuard from '../../modules/cashback-guard';
import { useOrders } from '../query/useOrders';
import type { RootStackParamList } from '../navigation/types';

const DISMISS_KEY = 'never_miss_cashback_nudge_dismissed';

export function NeverMissCashbackNudge() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: orders } = useOrders();
  // Start hidden; an effect resolves the persisted-dismiss + armed checks so we
  // never flash the card before we know whether to show it.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android' || !CashbackGuard.isSupported) {
      setHidden(true);
      return;
    }
    let cancelled = false;
    SecureStore.getItemAsync(DISMISS_KEY)
      .then((v) => {
        if (cancelled) return;
        const dismissed = v === '1';
        setHidden(dismissed || CashbackGuard.isFullyEnabled());
      })
      .catch(() => {
        if (!cancelled) setHidden(CashbackGuard.isFullyEnabled());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden) return null;
  if (!orders || orders.length === 0) return null;

  const dismiss = () => {
    setHidden(true);
    SecureStore.setItemAsync(DISMISS_KEY, '1').catch(() => {});
  };

  return (
    <View style={{ paddingHorizontal: spacing[16], marginTop: spacing[16] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Turn on Never Miss Cashback"
        onPress={() => navigation.navigate('CashbackGuard')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          backgroundColor: colors.feedback.success.subtle,
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: colors.feedback.success.border,
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
          ...elevation.light.xs,
        }}
      >
        <Icon
          name="feat-rewards-outline"
          size={iconSize[24]}
          color={colors.feedback.success.default}
        />
        <View style={{ flex: 1 }}>
          <Text variant="body14SemiBold" color={colors.text.primary}>
            Never miss cashback again
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            You’ve tracked an order before — turn on reminders so you always
            activate cashback when you shop.
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={spacing[8]} accessibilityLabel="Dismiss">
          <Text variant="body16SemiBold" color={colors.text.tertiary}>
            ✕
          </Text>
        </Pressable>
      </Pressable>
    </View>
  );
}
