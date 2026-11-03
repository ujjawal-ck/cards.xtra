/**
 * SearchBar — molecule (Figma node 1859:17)
 *
 * Three-state search bar:
 *   'default'  — search icon + "Search" placeholder (or a cycling
 *                `placeholders` ticker). No cursor. Tap-to-activate
 *                (fires `onFocus`).
 *   'focused'  — leading icon + live TextInput (empty). Native cursor
 *                shows once the keyboard activates (tinted via
 *                selectionColor → colors.action.primary.default).
 *   'filled'   — leading icon + TextInput with `value`, trailing X
 *                (clear), AND a results dropdown rendered below the bar
 *                (sections of {logo, title, subtitle} rows).
 *
 * Leading icon in the active states is set by `leadingIcon`: 'back'
 * (default — a back arrow firing `onBack`) or 'search' (a dark, static
 * search glyph; the bar collapses on blur instead). The trailing clear
 * X appears only once `value` is non-empty.
 *
 * Bar shell (shared across all 3 states):
 *   horizontal row, h spacing[48], radius.lg, gap spacing[12],
 *   padding-h spacing[16], bg surface.default, 1-px border.default.
 *
 * Results (filled only):
 *   vertical, gap spacing[16]. Each section = a section header
 *   (body14Regular, text.tertiary) + result rows. A row is 72 tall,
 *   gap spacing[12], padV spacing[12], horizontal alignItems center.
 *   The 40×40 logo slot is a matching bordered surface (radius.sm,
 *   border.default at borderWidth.thin — the spec's 0.71px lands on
 *   `thin` in this token scale; see note inline).
 *
 * Icons (none of these ship as SVGs in src/assets/icons):
 *   - SearchGlyph, BackGlyph, CloseGlyph, ChevronRightGlyph are all
 *     drawn inline via react-native-svg at exact stroke weights from
 *     borderWidth.* tokens. Stroke colour tracks the `color` prop so
 *     each one tints with its token.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   #d9e3ec → colors.border.default
 *   #c4c4c4 → colors.icon.disabled        (muted-icon)
 *   #878787 → colors.text.placeholder / colors.text.tertiary (slate-600)
 *   #262626 → colors.text.primary / colors.icon.actions       (slate-900)
 *   #ff6d1d → colors.action.primary.default                   (saffron)
 *   #0741ef → colors.icon.brand                               (cobalt)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../atoms';
import { play } from '../lib/haptics';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type SearchBarState = 'default' | 'focused' | 'filled';

export interface SearchResultRow {
  logo: ImageSourcePropType;
  title: string;
  subtitle: string;
}

export interface SearchResultSection {
  header: string;
  rows: SearchResultRow[];
}

export interface SearchBarProps {
  /** Visual state. Default 'default'. */
  state?: SearchBarState;
  value?: string;
  placeholder?: string;
  /** When provided and length ≥ 2, the 'default'-state placeholder
   *  cycles through these strings with a slide-up + fade animation
   *  (~2.4 s per swap). Falls back to the static `placeholder` if
   *  not provided or only one string is given. */
  placeholders?: string[];
  sections?: SearchResultSection[];
  /** Leading icon for the active (focused / filled) states.
   *  'back'   — a back arrow that fires `onBack` (default; used by the
   *             SearchTopSheet to close itself).
   *  'search' — the search glyph, rendered dark and non-interactive
   *             (used inline on Offers, where there's nothing to go
   *             "back" to — the bar just collapses on blur). */
  leadingIcon?: 'back' | 'search';
  onFocus?: () => void;
  onBlur?: () => void;
  onChangeText?: (text: string) => void;
  onBack?: () => void;
  onClear?: () => void;
  onResultPress?: (row: SearchResultRow, sectionIndex: number, rowIndex: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Bar + row geometry — fixed Figma specs, not in any global scale.
const BAR_H = spacing[48]; // 48
const ROW_H = 72;
const LOGO_SLOT = 40;

// ----------------------------------------------------------------------------
// Inline glyphs — no search/back/close/chevron SVGs ship in
// src/assets/icons, so they're drawn inline. Stroke widths use
// borderWidth.* tokens so the weights stay token-bound.
// ----------------------------------------------------------------------------
function SearchGlyph({ size = iconSize[20], color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle
        cx={9}
        cy={9}
        r={5.5}
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
      />
      <Path
        d="M13.5 13.5 L17 17"
        stroke={color}
        strokeWidth={borderWidth.iconDefault}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BackGlyph({ size = iconSize[20], color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12 4 L6 10 L12 16 M6 10 H18"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseGlyph({ size = iconSize[20], color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 5 L15 15 M15 5 L5 15"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronRightGlyph({ size = iconSize[20], color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M8 5 L13 10 L8 15"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ----------------------------------------------------------------------------
// AnimatedPlaceholder — ticker-style placeholder that cycles through a
// list of strings with a slide-up + fade. Used only by the 'default'
// state when `placeholders` is supplied.
//
// Single shared value `phase` drives the motion:
//   phase = 0   → current text at neutral position, fully visible
//   phase → -1  → text slides UP and fades OUT (exit)
//   snap to +1  → next text positioned BELOW, invisible (no flicker —
//                 opacity is mirrored by |phase|, so +1 reads as 0%)
//   phase → 0   → next text slides UP into neutral, fades IN (entry)
//
// Opacity uses |phase| so both poles read as transparent and only the
// neutral position is opaque — the swap happens entirely while
// invisible, so there's no jarring cross-fade.
// ----------------------------------------------------------------------------
const PLACEHOLDER_DWELL_MS = 2400;   // how long each string sits at rest
const PLACEHOLDER_OUT_MS   = 280;    // exit timing
const PLACEHOLDER_IN_MS    = 320;    // entry timing
const PLACEHOLDER_SHIFT_PX = 12;     // vertical travel each phase

function AnimatedPlaceholder({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0);
  const phase = useSharedValue(0);

  const advance = useCallback(
    () => setIndex((i) => (i + 1) % items.length),
    [items.length]
  );

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      // Exit: slide up + fade out. On completion, swap the text + snap
      // BELOW (phase = +1, still invisible), then animate back to 0
      // for the entry slide-up.
      phase.value = withTiming(
        -1,
        { duration: PLACEHOLDER_OUT_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (!finished) return;
          runOnJS(advance)();
          phase.value = 1;
          phase.value = withTiming(0, {
            duration: PLACEHOLDER_IN_MS,
            easing: Easing.out(Easing.cubic),
          });
        }
      );
    }, PLACEHOLDER_DWELL_MS);
    return () => clearInterval(timer);
  }, [items.length, advance, phase]);

  const animStyle = useAnimatedStyle(() => {
    // |phase|: 0 at neutral, 1 at either pole → opacity inverse.
    const abs = phase.value < 0 ? -phase.value : phase.value;
    return {
      opacity: interpolate(abs, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            phase.value,
            [-1, 0, 1],
            [-PLACEHOLDER_SHIFT_PX, 0, PLACEHOLDER_SHIFT_PX]
          ),
        },
      ] as unknown as { translateY: number }[],
    };
  });

  return (
    <Animated.View style={animStyle}>
      <Text variant="body14Regular" color={colors.text.placeholder}>
        {items[index]}
      </Text>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------
// Result row — used inside the filled state's results dropdown
// ----------------------------------------------------------------------------
function ResultRow({
  row,
  onPress,
}: {
  row: SearchResultRow;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${row.subtitle}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        paddingVertical: spacing[12],
        height: ROW_H,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Bordered 40×40 logo slot — matches the BrandLogo's shell at
          a smaller dimension. Spec's 0.71px → borderWidth.thin (1) is
          the closest existing token; the 0.71 in Figma is likely a
          float export artefact. */}
      <View
        style={{
          width: LOGO_SLOT,
          height: LOGO_SLOT,
          borderRadius: radius.sm,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.default,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={row.logo}
          style={{ width: spacing[32], height: spacing[24] }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={{ flex: 1, gap: spacing[4] }}>
        <Text variant="body16Regular" color={colors.text.primary}>
          {row.title}
        </Text>
        <Text
          variant="body14Medium"
          color={colors.action.primary.default}
        >
          {row.subtitle}
        </Text>
      </View>

      <ChevronRightGlyph color={colors.icon.brand} />
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// SearchResults — the sections/rows dropdown shown under the bar in the
// 'filled' state. Extracted so callers that need the results in their
// own scroll container (e.g. SearchTopSheet, which pins the bar and
// scrolls only the results) can render them independently of the bar.
// SearchBar renders this inline when given `sections` directly.
// ----------------------------------------------------------------------------
export function SearchResults({
  sections,
  onResultPress,
}: {
  sections: SearchResultSection[];
  onResultPress?: (row: SearchResultRow, sectionIndex: number, rowIndex: number) => void;
}) {
  if (sections.length === 0) return null;
  return (
    <View style={{ gap: spacing[16] }}>
      {sections.map((section, si) => (
        <View key={si} style={{ gap: spacing[8] }}>
          <Text variant="body14Regular" color={colors.text.tertiary}>
            {section.header}
          </Text>
          {section.rows.map((row, ri) => (
            <ResultRow
              key={ri}
              row={row}
              onPress={
                onResultPress
                  ? () => {
                      play('searchResultTap');
                      onResultPress(row, si, ri);
                    }
                  : undefined
              }
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------
export function SearchBar({
  state = 'default',
  value = '',
  placeholder = 'Search',
  placeholders,
  sections = [],
  leadingIcon = 'back',
  onFocus,
  onBlur,
  onChangeText,
  onBack,
  onClear,
  onResultPress,
  style,
}: SearchBarProps) {
  const animatePlaceholder =
    !!placeholders && placeholders.length >= 2;
  const isDefault = state === 'default';
  const isFocused = state === 'focused';
  const isFilled = state === 'filled';

  // Programmatically focus the TextInput whenever the bar enters
  // 'focused' or 'filled' — `autoFocus` on a TextInput is unreliable
  // inside a freshly-mounted Modal (the keyboard request can be
  // dropped while the modal animates in), so we drive focus via a
  // ref + a short timeout that lets the modal settle first.
  const inputRef = useRef<TextInput | null>(null);
  useEffect(() => {
    if (!(isFocused || isFilled)) return;
    // 50 ms is enough for RN to attach the Modal + the TextInput's
    // native peer on both platforms; longer than that is noticeable.
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isFocused, isFilled]);

  const barShell = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        height: BAR_H,
        paddingHorizontal: spacing[16],
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border.default,
        backgroundColor: colors.surface.default,
      }}
    >
      {/* Leading. Default state: muted search glyph (tap-to-activate).
          Active states: either a back arrow (default) or a dark search
          glyph that stays put (leadingIcon='search') — the glyph
          darkens from icon.disabled → icon.actions as the bar focuses. */}
      {isDefault ? (
        <SearchGlyph color={colors.icon.disabled} />
      ) : leadingIcon === 'search' ? (
        <SearchGlyph color={colors.icon.actions} />
      ) : (
        <Pressable
          onPress={onBack}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <BackGlyph color={colors.icon.actions} />
        </Pressable>
      )}

      {/* Content area — cursor comes from the native TextInput once the
          keyboard is active; no static cursor in any state. A single
          input serves both active states (it's bound to `value`, empty
          in 'focused'), so focused→filled never remounts and the
          keyboard never flickers on the first keystroke. */}
      <View style={{ flex: 1 }}>
        {isDefault ? (
          animatePlaceholder ? (
            <AnimatedPlaceholder items={placeholders!} />
          ) : (
            <Text
              variant="body14Regular"
              color={colors.text.placeholder}
            >
              {placeholder}
            </Text>
          )
        ) : (
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            selectionColor={colors.action.primary.default}
            style={{
              flex: 1,
              padding: 0,
              color: colors.text.primary,
            }}
            accessibilityLabel="Search input"
          />
        )}
      </View>

      {/* Trailing clear — shown once there's text to clear, in either
          active state (not the empty 'focused' state). */}
      {!isDefault && value.length > 0 ? (
        <Pressable
          onPress={onClear}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <CloseGlyph color={colors.icon.actions} />
        </Pressable>
      ) : null}
    </View>
  );

  // In 'default' state the entire bar is a tap target that fires
  // onFocus — parents typically use this to swap the bar into the
  // focused state.
  const barNode = isDefault ? (
    <Pressable
      onPress={() => {
        play('searchOpen');
        onFocus?.();
      }}
      accessibilityRole="search"
    >
      {barShell}
    </Pressable>
  ) : (
    barShell
  );

  return (
    <View style={[{ gap: spacing[16] }, style]}>
      {barNode}

      {/* Results dropdown — filled only */}
      {isFilled ? (
        <SearchResults sections={sections} onResultPress={onResultPress} />
      ) : null}
    </View>
  );
}
