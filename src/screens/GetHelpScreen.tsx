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
import React from 'react';
import {
  View,
  ScrollView,
  ImageBackground,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
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

  // Five help topics — icons use tintable outline glyphs (the desc-* /
  // nav-* icons bake multi-colour art that ignores the tint).
  const topics: HelpTopic[] = [
    { icon: 'feat-sparkle-outline', label: 'How CARDS.xtra Works?' },
    { icon: 'feat-savings-outline', label: 'Your Cashback' },
    {
      icon: 'clipboard-search-outline',
      label: 'Missing Cashback or Rewards',
      onPress: () => navigation.navigate('MissingCashbackHelp'),
    },
    { icon: 'wallet-outline', label: 'Payment related' },
    { icon: 'phone-off-outline', label: 'Unable to Login?' },
  ];

  // Chunk into rows of 2 (the trailing odd card keeps half width via a spacer).
  const rows: HelpTopic[][] = [];
  for (let i = 0; i < topics.length; i += 2) rows.push(topics.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      {/* Light status-bar icons read against the cobalt hero. */}
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
          <View
            style={{
              paddingTop: insets.top + spacing[4],
              paddingHorizontal: spacing[16],
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
      <Icon name={topic.icon} size={iconSize[24]} color={colors.text.primary} />
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
