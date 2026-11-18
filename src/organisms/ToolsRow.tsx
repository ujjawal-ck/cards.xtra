/**
 * ToolsRow — organism
 *
 * One horizontal row of four "card tool" tiles. Each tile: an icon on top,
 * a two-line label under it. Two tiles rotate their
 * second line through a word list (spend categories, brand names).
 *
 * Layout: at normal text size the four tiles share the row width evenly (fixed
 * width, labels wrap, no scroll). At a larger OS font size they keep their own
 * width and the row scrolls sideways.
 *
 * Rotation: one shared timer (tick every 2100 ms) drives both rotating tiles,
 * half a cycle apart: each word stays 4200 ms and the two tiles never change
 * on the same tick (src/lib/toolsRowRotation). It runs only while
 * the screen is focused (useScreenFocused) and never when the OS "reduce
 * motion" setting is on; then the first word stays. The screen-reader label
 * of a rotating tile is fixed text so it does not announce every change.
 *
 * App-agnostic: the only output is `onPress(tool, word)`. `word` is the word
 * the tile shows at the tap (undefined for fixed tiles), so the caller can open
 * the tool with that item already picked. The caller decides what each tool
 * opens, tracks analytics and fires haptics.
 */
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms/Icon';
import { useScreenFocused } from '../lib/useScreenFocused';
import { rotatingWordIndex, TOOLS_ROW_TICK_MS } from '../lib/toolsRowRotation';
import { TOOL_CATEGORIES, ROTATING_BRANDS } from '../lib/cardTools';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
  motion,
  typography,
} from '../tokens';

export type ToolId = 'category' | 'beat' | 'ultimate' | 'brands';

/** Tile order, left to right. Callers derive the 1-based position from it. */
export const TOOL_ORDER: ToolId[] = ['category', 'beat', 'ultimate', 'brands'];

// Up to this OS font scale the tiles share the row width and wrap their text.
// Above it they size to their text and the row scrolls.
const FIT_MAX_FONT_SCALE = 1;
// Wrapped labels never take more lines than this; the rotating word's box
// always reserves them, so a word change moves nothing.
const FIT_MAX_LINES = 2;

/** Row height at normal text size (fit mode), for loading skeletons. Same
 *  parts as a tile: vertical padding, icon, gap, one line1 line, the two
 *  reserved lines of the rotating word, and the border. */
export const TOOLS_ROW_FIT_H =
  spacing[8] * 2 +
  iconSize[24] +
  spacing[4] +
  typography.body12Regular.lineHeight +
  typography.body12SemiBold.lineHeight * FIT_MAX_LINES +
  borderWidth.thin * 2;

const CATEGORY_WORDS = TOOL_CATEGORIES.map((c) => c.label);
const BRAND_WORDS = ROTATING_BRANDS;

interface ToolTileSpec {
  icon: IconName;
  line1: string;
  /** Fixed second line. Omitted for rotating tiles. */
  line2?: string;
  /** Rotating second line. */
  words?: string[];
  /** Fixed screen-reader label. */
  a11yLabel: string;
}

// Icons: nearest existing glyphs (no dedicated tool icons in the set).
const TILES: Record<ToolId, ToolTileSpec> = {
  category: {
    icon: 'feat-discount-outline',
    line1: 'Best card for',
    words: CATEGORY_WORDS,
    a11yLabel: 'Find best card for a category',
  },
  beat: {
    icon: 'star-outline',
    line1: 'Try Beat',
    line2: 'My Card',
    a11yLabel: 'Try Beat My Card',
  },
  ultimate: {
    icon: 'feat-sparkle-outline',
    line1: 'Find My',
    line2: 'Ultimate Card',
    a11yLabel: 'Find My Ultimate Card',
  },
  brands: {
    // Not nav-offers-outline: the nav-* glyphs bake a white stroke for the
    // dark tab bar and ignore `color`, so they vanish on this white tile.
    icon: 'cart-outline',
    line1: 'Best card for',
    words: BRAND_WORDS,
    a11yLabel: 'Find best card for a brand',
  },
};

/** True while the OS "reduce motion" setting is on. Follows live changes. */
function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export interface ToolsRowProps {
  /** `word` is the rotating word on screen at the tap; undefined for fixed tiles. */
  onPress: (tool: ToolId, word?: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function ToolsRow({ onPress, style }: ToolsRowProps) {
  const focused = useScreenFocused();
  const reduceMotion = useReduceMotion();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const fit = fontScale <= FIT_MAX_FONT_SCALE;
  // Equal share of the row: window width minus both side paddings and the gaps.
  const gaps = spacing[8] * (TOOL_ORDER.length - 1);
  const fitWidth = Math.floor(
    (windowWidth - spacing[16] * 2 - gaps) / TOOL_ORDER.length
  );
  // One shared tick; each rotating tile reads its word with a modulo.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!focused || reduceMotion) return;
    const id = setInterval(() => setTick((t) => t + 1), TOOLS_ROW_TICK_MS);
    return () => clearInterval(id);
  }, [focused, reduceMotion]);

  // Reduce motion → always the first word. Category is phase 0, brands phase 1.
  const phaseOf = (id: ToolId): 0 | 1 => (id === 'brands' ? 1 : 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={!fit}
      style={[{ flexGrow: 0 }, style]}
      contentContainerStyle={{
        paddingHorizontal: spacing[16],
        gap: spacing[8],
      }}
    >
      {TOOL_ORDER.map((id) => {
        const tile = TILES[id];
        const word = tile.words
          ? tile.words[
              reduceMotion ? 0 : rotatingWordIndex(tick, phaseOf(id), tile.words.length)
            ]
          : tile.line2;
        return (
          <Pressable
            key={id}
            onPress={() => onPress(id, tile.words ? word : undefined)}
            accessibilityRole="button"
            accessibilityLabel={tile.a11yLabel}
            style={({ pressed }) => ({
              ...(fit ? { width: fitWidth } : { minWidth: spacing[96] }),
              minHeight: sizing.touchMin,
              alignItems: 'center',
              gap: spacing[4],
              paddingVertical: spacing[8],
              // Fit: no side padding, so "Best card for" (about 70 dp in
              // Outfit 12) stays on one line in a 76 dp tile at 360 dp width.
              paddingHorizontal: fit ? spacing[0] : spacing[12],
              borderRadius: radius.lg,
              borderWidth: borderWidth.thin,
              borderColor: colors.border.default,
              backgroundColor: pressed
                ? colors.action.secondary.pressed
                : colors.surface.default,
            })}
          >
            <Icon
              name={tile.icon}
              size={iconSize[24]}
              color={colors.action.accent.default}
            />
            <View style={{ alignItems: 'center' }}>
              <Text
                variant="body12Regular"
                color={colors.text.secondary}
                align="center"
                numberOfLines={fit ? FIT_MAX_LINES : 1}
              >
                {tile.line1}
              </Text>
              {/* Second line. Its height is reserved so a word change never
                  reflows the list below. */}
              <View
                style={{
                  minHeight:
                    typography.body12SemiBold.lineHeight *
                    (fit && tile.words ? FIT_MAX_LINES : 1),
                  alignItems: 'center',
                }}
              >
                {tile.words ? (
                  <Animated.View
                    key={word}
                    entering={
                      reduceMotion
                        ? undefined
                        : FadeIn.duration(motion.duration.base)
                    }
                  >
                    <Text
                      variant="body12SemiBold"
                      color={colors.text.primary}
                      align="center"
                      numberOfLines={fit ? FIT_MAX_LINES : 1}
                    >
                      {word}
                    </Text>
                  </Animated.View>
                ) : (
                  <Text
                    variant="body12SemiBold"
                    color={colors.text.primary}
                    align="center"
                    numberOfLines={fit ? FIT_MAX_LINES : 1}
                  >
                    {word}
                  </Text>
                )}
              </View>
              {/* Width holder: every rotating word, zero height and hidden.
                  The tile takes the widest word's width, so it does not
                  change size as the words rotate. Not needed when fitting:
                  the width is already fixed. */}
              {tile.words && !fit ? (
                <View
                  style={{ height: 0, overflow: 'hidden' }}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  {tile.words.map((w) => (
                    <Text key={w} variant="body12SemiBold" numberOfLines={1}>
                      {w}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
