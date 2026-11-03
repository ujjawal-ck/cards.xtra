/**
 * MissingCashbackTrack — screen (Figma 4129:23675)
 *
 * The raise/track step reached from the "Have more cashback to track?"
 * CTA on the "Did You Shop?" screen (MissingCashbackDidYouShop, node
 * 4129:27642). It lists the recent purchases a user can raise a fresh
 * missing-cashback ticket against, then offers the same dark-gradient
 * CTA banner to keep tracking.
 *
 * NOTE: the Figma node 4129:23675 could not be read at build time (MCP
 * rate limit), so this layout is an APPROXIMATION assembled from the
 * established "Did You Shop?" pattern and shipped components only —
 * nothing is rebuilt. Verify exact content/order against Figma on phone.
 *
 * Composition (all REUSED components):
 *   FLOOR 1 — <Header leading='back' title />            (organism)
 *   FLOOR 2 — intro line + N× <HelpTicketCard status='in-review' />,
 *             each in a px16 wrapper, then a gradient CTA banner.
 *
 * Token mapping mirrors MissingCashbackDidYouShop exactly:
 *   screen bg          → colors.background.muted (#f5f7f9)
 *   root gap           → spacing[24]
 *   ticket container   → gap spacing[16]
 *   ticket wrapper     → paddingHorizontal spacing[16]
 *   cta banner bg      → gradients.dark (token; Figma "gradient/dark" is
 *                        an EMPTY style — a Figma-side gap, see gradients.ts)
 *   cta banner padding → px spacing[20] / py spacing[16]
 *   cta banner radius  → radius.lg
 *   cta left text      → typography.body16Medium / colors.text.inverse
 *   cta chevron        → iconSize[20] / colors.icon.inverse
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { Text } from '../atoms';
import { Header } from '../organisms';
import { HelpTicketCard } from '../molecules';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';
import {
  colors,
  spacing,
  radius,
  iconSize,
  sizing,
  borderWidth,
  gradients,
} from '../tokens';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackTrack'>;

/**
 * Right-pointing chevron — same inline glyph the "Did You Shop?" CTA uses
 * (no `chevron-right` ships in the Icon registry yet). Replace with
 * <Icon name="chevron-right" …> once that SVG lands.
 */
function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7 5 L13 10 L7 15"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Demo "trackable purchase" rows. The logo is a DELIBERATE placeholder:
// our assets carry no "HDFC BizBlack" art, so the closest shipped store
// asset (Axis Indian Oil) stands in inside the 74×32 box. It will look
// mismatched on an HDFC ticket — that is expected, not a build bug.
const TRACKABLE = [
  {
    brandLogo: images.stores.axisIndianOilCard1,
    title: 'We noticed a recent purchase — raise a ticket to track it',
    timerLabel: 'Raise within',
    timer: '71:59',
    orderId: '408-2295671-0034725',
    orderAmount: '1899',
  },
  {
    brandLogo: images.stores.axisIndianOilCard1,
    title: 'We noticed a recent purchase — raise a ticket to track it',
    timerLabel: 'Raise within',
    timer: '47:30',
    orderId: '171-9928340-1182093',
    orderAmount: '2499',
  },
];

export function MissingCashbackTrack() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* FLOOR 1 — Header (REUSED organism) */}
        <Header
          leading="back"
          title="Track Missing Cashback"
          onLeadingPress={() => navigation.goBack()}
        />

        {/* FLOOR 2 — scrolling content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing[24],
            gap: spacing[16],
            paddingBottom: sizing.bottomNavHeight + spacing[48],
          }}
        >
          {/* Intro line */}
          <View style={{ paddingHorizontal: spacing[16], width: '100%' }}>
            <Text variant="body14Regular" color={colors.text.secondary}>
              Pick a recent purchase to raise a missing-cashback ticket. We’ll
              track it and keep you posted.
            </Text>
          </View>

          {/* Trackable purchase tickets */}
          {TRACKABLE.map((ticket, i) => (
            <View key={i} style={{ paddingHorizontal: spacing[16], width: '100%' }}>
              <HelpTicketCard status="in-review" {...ticket} />
            </View>
          ))}

          {/* CTA banner wrapper — same dark-gradient banner as "Did You Shop?" */}
          <View style={{ paddingHorizontal: spacing[16], width: '100%' }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                // TODO(nav): open the manual "raise a ticket" form once that
                // route is built. Terminal for now so the demo doesn't loop.
              }}
              style={{ borderRadius: radius.lg, overflow: 'hidden' }}
            >
              <LinearGradient
                {...gradients.dark}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing[20],
                  paddingVertical: spacing[16],
                }}
              >
                <Text
                  variant="body16Medium"
                  color={colors.text.inverse}
                  style={{ flex: 1 }}
                >
                  Can’t find your purchase? Raise it manually
                </Text>
                <ChevronRightGlyph size={iconSize[20]} color={colors.icon.inverse} />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
