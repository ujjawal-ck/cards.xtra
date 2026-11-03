/**
 * MissingCashbackResult — screen (modelled on Figma 4129:24114
 * "help/missing-cashback/cashback-tracked").
 *
 * The terminal state of a queue submit / detail update, driven by params:
 *   variant 'tracked'  → cashback found (green check) — primary CTA "View
 *                        Details" deep-links to the order when cashbackId is set
 *   variant 'tracking' → under auto-tracking (amber clock)
 *   variant 'queued'   → added to queue (cobalt info)
 * Primary CTA otherwise returns to the live claims list ("Ok, Got It").
 *
 * Imports: Header, Text, Button (atoms); react-native-svg glyphs.
 */
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, elevation } from '../tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackResult'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackResult'>;

const ICON_SIZE = 72;

function ResultGlyph({ variant }: { variant: 'tracked' | 'tracking' | 'queued' }) {
  const tone =
    variant === 'tracked'
      ? colors.feedback.success.default
      : variant === 'tracking'
        ? colors.feedback.warning.default
        : colors.action.accent.default;
  const bg =
    variant === 'tracked'
      ? colors.feedback.success.subtle
      : variant === 'tracking'
        ? colors.feedback.warning.subtle
        : colors.feedback.info.subtle;

  return (
    <View
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: ICON_SIZE / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
        {variant === 'tracked' ? (
          <Path d="M5 13l4 4L19 7" stroke={tone} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : variant === 'tracking' ? (
          <>
            <Circle cx={12} cy={12} r={9} stroke={tone} strokeWidth={2} />
            <Path d="M12 7v5l3 2" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={9} stroke={tone} strokeWidth={2} />
            <Path d="M12 8h.01M11 12h1v4h1" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>
    </View>
  );
}

export function MissingCashbackResult() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { variant, title, message, cashbackId } = route.params;

  const canViewOrder = variant === 'tracked' && cashbackId != null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Header leading="back" onLeadingPress={() => navigation.goBack()} />

          {/* Centered result block */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[24], gap: spacing[16] }}>
            <ResultGlyph variant={variant} />
            <Text variant="body16Bold" color={colors.text.primary} align="center">
              {title}
            </Text>
            <Text variant="body14Regular" color={colors.text.secondary} align="center">
              {message}
            </Text>
          </View>

          {/* Footer CTA */}
          <View
            style={[
              {
                backgroundColor: colors.surface.default,
                paddingTop: spacing[8],
                paddingBottom: spacing[16],
                paddingHorizontal: spacing[16],
              },
              elevation.light.up,
            ]}
          >
            <Button
              label={canViewOrder ? 'View Details' : 'Ok, Got It'}
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              onPress={() => {
                if (canViewOrder) {
                  navigation.navigate('OrdersDetail', { id: String(cashbackId) });
                } else {
                  navigation.navigate('MissingCashbackDidYouShop');
                }
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
