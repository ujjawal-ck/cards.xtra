/**
 * GetHelpScreen — "We're here to help!" landing (Figma 3632:194974).
 *
 * Reached from the Profile page's "Get Help" row. Layout (single column on a
 * background.muted page):
 *   1. Cobalt hero masthead — a full-bleed Figma export (gradient + headset
 *      illustration + baked "We're here to help!" heading, node 6308:31058),
 *      edge-to-edge with rounded bottom corners (radius 2xl = 24) and a
 *      floating white circular back button overlaid top-left.
 *   2. A 2-column grid of tappable help-topic cards (white, radius.sm,
 *      Shadow/Light/XS, padH 16 / padV 24): icon (24) above a Body/14/SemiBold
 *      label, left-aligned. Five cards → rows of 2, the last sitting alone at
 *      an explicit half width (matches a paired card exactly).
 *
 * The heading is part of the hero art (baked into the Figma image); swap to
 * live <Text> later if it needs localising. Card destinations: "Missing
 * Cashback or Rewards" routes into the existing missing-cashback flow; the
 * others are no-ops for now (their target screens aren't in scope yet).
 */
import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  ImageBackground,
  Pressable,
  Linking,
  Image,
  useWindowDimensions,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  elevation,
} from '../tokens';
import { images } from '../assets/images';
import { haptics } from '../lib/haptics';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';
import { HowItWorksSheet } from '../organisms';
import type { HowItWorksSheetRef } from '../organisms';
import { SUPPORT_PHONE_URL } from '../config/support';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GetHelp'>;

// Hero aspect ratio = the exported PNG's intrinsic 1454 × 1082 (≈1.343), so
// the masthead keeps the Figma proportions at any device width.
const MASTHEAD_ASPECT = 1454 / 1082;
// Back button — 40-px white circle (Figma I6308:31061;3034:222).
const BACK_BTN = 40;
// Grid metrics — 16-px page gutters, 8-px gap between the two columns.
const GRID_PAD = 16; // spacing[16]
const GRID_GAP = 8; // spacing[8]

interface HelpTopic {
  icon: IconName;
  /** Raster art shown instead of the icon (the app-logo tile). */
  image?: ImageSourcePropType;
  label: string;
  onPress?: () => void;
}

export function GetHelpScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Fixed column width so a lone trailing card is identical to a paired one.
  // A flex:1 card + flex:1 spacer can drift on the odd row; computing the
  // exact half-width (page minus gutters minus the single inter-column gap,
  // halved) pins every card — paired or alone — to the same size.
  const cardWidth = (width - GRID_PAD * 2 - GRID_GAP) / 2;
  const howItWorksRef = useRef<HowItWorksSheetRef>(null);

  // Once the cobalt hero scrolls away, back the status bar with the page
  // colour and switch to dark icons — light icons over the white cards were
  // unreadable, and content slid under them.
  const heroHeight = width / MASTHEAD_ASPECT;
  const [pastHero, setPastHero] = useState(false);

  // Five help topics — icons use tintable outline glyphs (the desc-* /
  // nav-* icons bake multi-colour art that ignores the tint). Every tile now
  // leads somewhere: four of five used to do nothing on tap.
  const callSupport = () => Linking.openURL(SUPPORT_PHONE_URL).catch(() => undefined);
  const topics: HelpTopic[] = [
    {
      // Figma 3632:194976 glyphs: app-logo tile, cash note, ticket, ₹,
      // user-off (were sparkle / piggy bank / clipboard / wallet / phone-off;
      // the sparkle baked a blue fill — the only coloured icon).
      icon: 'feat-sparkle-outline',
      image: images.help.appLogo,
      label: 'How Cards.xtra Works?',
      onPress: () => howItWorksRef.current?.present(),
    },
    {
      icon: 'help-cash-outline',
      label: 'Your Cashback',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Earnings' }),
    },
    {
      icon: 'help-ticket-outline',
      label: 'Missing Cashback or Rewards',
      onPress: () => navigation.navigate('MissingCashbackHelp'),
    },
    // No self-serve content for these yet — connect to support directly.
    { icon: 'help-rupee-outline', label: 'Payment related', onPress: callSupport },
    { icon: 'help-user-off-outline', label: 'Unable to Login?', onPress: callSupport },
  ];

  // Chunk into rows of 2 (the trailing odd card keeps half width via a spacer).
  const rows: HelpTopic[][] = [];
  for (let i = 0; i < topics.length; i += 2) rows.push(topics.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      {/* Light status-bar icons over the cobalt hero; dark once it's gone. */}
      <StatusBar style={pastHero ? 'dark' : 'light'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const next = e.nativeEvent.contentOffset.y > heroHeight - insets.top;
          if (next !== pastHero) setPastHero(next);
        }}
        contentContainerStyle={{
          gap: spacing[24],
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {/* 1. Cobalt hero — full-bleed, rounded bottom, floating back button. */}
        <ImageBackground
          source={images.help.masthead}
          resizeMode="cover"
          style={{ width: '100%', aspectRatio: MASTHEAD_ASPECT }}
          imageStyle={{
            borderBottomLeftRadius: radius['2xl'],
            borderBottomRightRadius: radius['2xl'],
          }}
        >
          {/* Back button is pinned outside the ScrollView (below) so it never
              scrolls up under the status bar. */}
        </ImageBackground>

        {/* 2. Help-topic grid — 2 columns, rows of 2. Each card carries an
            explicit half-width so the lone trailing card matches a paired one. */}
        <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
          {rows.map((row, ri) => (
            <View
              key={ri}
              style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing[8] }}
            >
              {row.map((topic) => (
                <HelpCard key={topic.label} topic={topic} width={cardWidth} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + spacing[4],
          left: spacing[16],
        }}
      >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={spacing[8]}
              onPress={() => {
                haptics.impact('light');
                navigation.goBack();
              }}
              style={({ pressed }) => [
                {
                  width: BACK_BTN,
                  height: BACK_BTN,
                  borderRadius: radius.full,
                  backgroundColor: colors.surface.default,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.9 : 1,
                },
                elevation.light.md,
              ]}
            >
              <BackArrowGlyph size={iconSize[24]} color={colors.text.primary} />
            </Pressable>
          </View>

      {/* Status-bar backing, shown once the hero has scrolled away. */}
      {pastHero ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: colors.background.muted,
          }}
        />
      ) : null}

      <HowItWorksSheet ref={howItWorksRef} title="How Cards.xtra works" />
    </View>
  );
}

function HelpCard({ topic, width }: { topic: HelpTopic; width: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={topic.label}
      onPress={() => {
        haptics.impact('light');
        analytics.track(Events.HELP_TOPIC_SELECT, { topic: topic.label });
        topic.onPress?.();
      }}
      style={({ pressed }) => [
        {
          width,
          backgroundColor: colors.background.default,
          borderRadius: radius.sm,
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[24],
          gap: spacing[12],
          alignItems: 'flex-start',
          opacity: pressed ? 0.9 : 1,
        },
        elevation.light.xs,
      ]}
    >
      {topic.image ? (
        <Image
          source={topic.image}
          style={{ width: iconSize[24], height: iconSize[24], borderRadius: radius.xs }}
          resizeMode="contain"
        />
      ) : (
        <Icon name={topic.icon} size={iconSize[24]} color={colors.text.primary} />
      )}
      <Text variant="body14SemiBold" color={colors.text.primary}>
        {topic.label}
      </Text>
    </Pressable>
  );
}

/**
 * Thin left-pointing back arrow — same 32-unit-viewBox glyph the Header
 * organism draws (no backarrow SVG ships in src/assets/icons), so the
 * 1.5-px stroke renders true at the rendered size.
 */
function BackArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M4 16 L28 16"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8 L4 16 L12 24"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
