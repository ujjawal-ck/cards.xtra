/**
 * FilterMenu — organism (Figma 3380:93329 body).
 *
 * Master/detail filter panel that fills the body of the Filters
 * bottom-sheet (between BottomSheetHeader and the sticky
 * FooterButtons). Layout responsibilities:
 *
 *   - The LEFT RAIL (132 wide) is STICKY — it does not scroll with
 *     the right panel. 4 stacked category buttons (Category /
 *     Annual Fee / Card Network / Banks). Active button gets a pale
 *     muted bg + cobalt label + 4-px gradient bar pinned to its
 *     right edge. The selection DOT next to each rail label is
 *     CONDITIONAL — it only renders when THAT rail has at least one
 *     applied filter (cobalt when the rail is active, grey when it's
 *     not). No selections in a rail → no dot.
 *
 *   - The RIGHT PANEL (flex 1) is SCROLLABLE via a nested
 *     `BottomSheetScrollView` so long category lists (e.g. Banks)
 *     can scroll under the sticky header + above the sticky footer.
 *     Body content for the active rail: helper text + REUSED Grid
 *     `'filters'` variant with 7 selectable category tiles —
 *     MULTI-SELECT: every tap toggles that tile's membership in the
 *     selection array, so the count strip in the sticky footer
 *     reflects the live total across all rails.
 *
 * Composition (existing only):
 *   - <Grid variant="filters" />          (organism — the 2-col
 *                                          Selector-based grid)
 *   - <Text> (atom) — rail labels + helper text
 *   - <LinearGradient> (expo-linear-gradient) for the active rail
 *     button's gradient bar
 *   - <BottomSheetScrollView> (@gorhom/bottom-sheet) for the right
 *     panel's gesture-aware scroll
 *
 * Flag: the spec'd active-bar gradient (#0036da → #3b67ed) doesn't
 * match an existing gradient token. `gradients.primary` is the
 * closest (#0036da → #4670f6) — used here and flagged in the
 * response so a `gradients.actionAccent` (or similar) token can be
 * added later with the exact #3b67ed second stop.
 *
 * Hex → token (no inline hex below):
 *   #ffffff → colors.surface.default
 *   #f5f7f9 → colors.background.muted
 *   #fcfcfd → colors.background.sunken
 *   #ebf0ff → colors.background.lavender
 *   #eeeeee → colors.border.subtle3
 *   #d9e3ec → colors.border.default
 *   #0741ef → colors.action.accent.default
 *   #0036da → colors.text.link  (gradient via gradients.primary)
 *   #878787 → colors.text.tertiary
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 */
import React, { useRef } from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../atoms';
import { Choice } from '../molecules';
import { Grid } from './Grid';
import type { FilterTileItem } from './Grid';
import { play } from '../lib/haptics';

// Distance (px) the filter list must scroll between micro-ticks — a gentle
// ratchet that adds texture without machine-gunning on a fast flick.
const FILTER_SCROLL_TICK_PX = 48;
import { images } from '../assets/images';
import {
  CATEGORY_OPTIONS,
  NETWORK_OPTIONS,
  ANNUAL_FEE_BUCKETS,
} from '../data/filterOptions';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  gradients,
  opacity as opacityTokens,
} from '../tokens';

// Component-spec dim — Figma fixed rail width that isn't on any
// general scale. Height is now flex:1 (fills the sheet body).
const RAIL_W = 132;

// Reserve enough scroll-bottom space to clear the sticky footer
// (FooterButtons size=44 with strip='caption' is ~120px). Nested
// BottomSheetScrollView doesn't always pick up gorhom's automatic
// footer inset, so we pad manually.
const SCROLL_BOTTOM_RESERVE = spacing[128];

export type FilterCategoryId =
  | 'category'
  | 'annual-fee'
  | 'card-network'
  | 'banks';

interface RailItem {
  id: FilterCategoryId;
  label: string;
}

const RAIL_ITEMS: RailItem[] = [
  { id: 'category', label: 'Category' },
  { id: 'annual-fee', label: 'Annual Fee' },
  { id: 'card-network', label: 'Card Network' },
  { id: 'banks', label: 'Banks' },
];

// Category tiles + fee/network option labels now come from the shared
// data/filterOptions module so the Home screen can translate the sheet's
// index-based selections into real values (tag ids, fee buckets, etc.).
const ANNUAL_FEE_OPTIONS = ANNUAL_FEE_BUCKETS.map((b) => b.label);
const CARD_NETWORK_OPTIONS = NETWORK_OPTIONS;

const CHECKBOX_HELPER_TEXT = 'Select all the options you wish to apply';

export interface FilterMenuProps {
  /** Active left-rail tab. Default 'category'. */
  activeCategory?: FilterCategoryId;
  onCategoryChange?: (next: FilterCategoryId) => void;
  /** Indices of selected tiles in the Category rail. Multi-select:
   *  tapping toggles membership. Default []. */
  selectedTileIndices?: number[];
  /** Fires on every tile tap with the index that should be toggled. */
  onToggleTile?: (index: number) => void;
  /** Indices of selected rows in the Annual Fee rail. Default []. */
  selectedAnnualFee?: number[];
  onToggleAnnualFee?: (index: number) => void;
  /** Indices of selected rows in the Card Network rail. Default []. */
  selectedCardNetwork?: number[];
  onToggleCardNetwork?: (index: number) => void;
  /** Indices of selected rows in the Banks rail. Default []. */
  selectedBanks?: number[];
  onToggleBanks?: (index: number) => void;
  /** Bank names shown in the Banks rail (derived from the loaded cards).
   *  Indices in `selectedBanks` map into this list. */
  bankOptions?: string[];
  style?: StyleProp<ViewStyle>;
}

// Right-panel body for the 3 multi-select rails (Annual Fee, Card
// Network, Banks). Helper text + a vertical list of <Choice> rows.
// Each Choice already handles its own checked-state label treatment
// (cobalt + medium when checked, primary + regular when not), so this
// panel just feeds it the row state + a toggle callback.
function CheckboxPanel({
  options,
  selectedIndices,
  onToggle,
}: {
  options: string[];
  selectedIndices: number[];
  onToggle?: (index: number) => void;
}) {
  return (
    <>
      <Text
        variant="body14Regular"
        color={colors.text.secondary}
      >
        {CHECKBOX_HELPER_TEXT}
      </Text>
      <View style={{ flexDirection: 'column', gap: spacing[20] }}>
        {options.map((label, i) => (
          <Choice
            key={label}
            type="checkbox"
            checked={selectedIndices.includes(i)}
            label={label}
            onChange={() => onToggle?.(i)}
          />
        ))}
      </View>
    </>
  );
}

function RailItemRow({
  item,
  active,
  hasSelection,
  onPress,
}: {
  item: RailItem;
  active: boolean;
  hasSelection: boolean;
  onPress: () => void;
}) {
  const grad = gradients.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        paddingHorizontal: spacing[12],
        paddingVertical: spacing[14],
        backgroundColor: active
          ? colors.background.muted
          : colors.background.default,
      }}
    >
      {/* Selection dot — only rendered when THIS rail has at least one
          applied filter. Hidden when the category has no selections,
          regardless of whether the rail is the currently-active tab. */}
      {hasSelection ? (
        <View
          style={{
            width: spacing[6],
            height: spacing[6],
            borderRadius: radius.full,
            backgroundColor: active
              ? colors.action.accent.default
              : colors.text.tertiary,
          }}
        />
      ) : null}
      <Text
        variant={active ? 'body14Medium' : 'body14Regular'}
        color={active ? colors.action.accent.default : colors.text.tertiary}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {/* Active-state gradient bar pinned to the rail's right edge.
          Inactive items render the same bar at opacity 0 so the row's
          layout box stays consistent. */}
      <LinearGradient
        colors={grad.colors}
        start={grad.start}
        end={grad.end}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: spacing[4],
          opacity: active ? opacityTokens[100] : opacityTokens[0],
        }}
      />
    </Pressable>
  );
}

export function FilterMenu({
  activeCategory = 'category',
  onCategoryChange,
  selectedTileIndices = [],
  onToggleTile,
  selectedAnnualFee = [],
  onToggleAnnualFee,
  selectedCardNetwork = [],
  onToggleCardNetwork,
  selectedBanks = [],
  onToggleBanks,
  bankOptions = [],
  style,
}: FilterMenuProps) {
  const insets = useSafeAreaInsets();
  const tiles: FilterTileItem[] = CATEGORY_OPTIONS.map((t, i) => ({
    image: images.filters[t.imageKey],
    label: t.label,
    selected: selectedTileIndices.includes(i),
  }));

  // Per-rail "has any applied filter" → drives the dot beside each
  // rail label. All 4 rails are wired now.
  const railHasSelection: Record<FilterCategoryId, boolean> = {
    category: selectedTileIndices.length > 0,
    'annual-fee': selectedAnnualFee.length > 0,
    'card-network': selectedCardNetwork.length > 0,
    banks: selectedBanks.length > 0,
  };

  // Micro tick as the filter list scrolls — throttled by distance.
  const lastTickY = useRef(0);
  const handleFilterScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (Math.abs(y - lastTickY.current) >= FILTER_SCROLL_TICK_PX) {
      lastTickY.current = y;
      play('filterScrollTick');
    }
  };

  return (
    <View
      style={[
        {
          // Fills the remaining sheet body between the sticky header
          // and the sticky footer.
          flex: 1,
          backgroundColor: colors.surface.default,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Left rail — STICKY (does not scroll). */}
      <View
        style={{
          width: RAIL_W,
          paddingTop: spacing[20],
          borderRightWidth: borderWidth.thin,
          borderRightColor: colors.border.subtle,
        }}
      >
        {RAIL_ITEMS.map((item) => (
          <RailItemRow
            key={item.id}
            item={item}
            active={item.id === activeCategory}
            hasSelection={railHasSelection[item.id]}
            onPress={() => {
              play('filterSelect');
              onCategoryChange?.(item.id);
            }}
          />
        ))}
      </View>

      {/* Right panel — SCROLLABLE via BottomSheetScrollView so gestures
          play nicely with the parent sheet. Bottom-reserve clears the
          sticky FooterButtons height. */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing[20],
          paddingHorizontal: spacing[16],
          // + bottom inset: the footer now sits above the nav bar, so it is
          // that much taller.
          paddingBottom: SCROLL_BOTTOM_RESERVE + insets.bottom,
          gap: spacing[16],
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleFilterScroll}
      >
        {activeCategory === 'category' ? (
          <>
            <Text
              variant="body14Regular"
              color={colors.text.secondary}
            >
              Select one category to apply for.
            </Text>
            <Grid
              variant="filters"
              items={tiles}
              // Multi-select: every tap toggles membership of that
              // index in the parent's selection array (parent does the
              // add/remove). Re-tapping a selected tile deselects it.
              onToggle={(i) => onToggleTile?.(i)}
            />
          </>
        ) : activeCategory === 'annual-fee' ? (
          <CheckboxPanel
            options={ANNUAL_FEE_OPTIONS}
            selectedIndices={selectedAnnualFee}
            onToggle={onToggleAnnualFee}
          />
        ) : activeCategory === 'card-network' ? (
          <CheckboxPanel
            options={CARD_NETWORK_OPTIONS}
            selectedIndices={selectedCardNetwork}
            onToggle={onToggleCardNetwork}
          />
        ) : activeCategory === 'banks' ? (
          // Banks list — derived from the loaded cards, so it can be long;
          // the parent BottomSheetScrollView handles scroll automatically.
          <CheckboxPanel
            options={bankOptions}
            selectedIndices={selectedBanks}
            onToggle={onToggleBanks}
          />
        ) : null}
      </BottomSheetScrollView>
    </View>
  );
}
