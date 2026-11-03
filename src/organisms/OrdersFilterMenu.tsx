/**
 * OrdersFilterMenu — organism (Figma filters/category 5759:27928,
 * filters/dates 5820:26718, filters/cashback-reward 5820:26780;
 * file P7UcoZYBnfyefmJIA8wcM7)
 *
 * The master/detail body of the "My Order Details" Filters bottom-sheet.
 * Same shape as the Home <FilterMenu>: a STICKY 132-wide left rail and a
 * SCROLLABLE right panel (BottomSheetScrollView), sitting between the
 * BottomSheetHeader and the sticky FooterButtons (Clear / Apply Filter).
 *
 * Three rails (the Figma frames use placeholder status copy inside the
 * Dates / Cashback-Reward tabs; per the builder we use sensible filter
 * semantics instead):
 *   • Status          — multi-select checkboxes (Pending / Confirmed /
 *                        Paid / Requested / Cancelled). FUNCTIONAL: filters
 *                        the live order list by cashback_status.
 *   • Dates           — single-select date-range presets (All time /
 *                        Last 7 / 30 / 90 days) + an "Or" divider + a
 *                        "Choose Custom Date" From/To pair. FUNCTIONAL via
 *                        the server-side `filter[fromdate]`/`filter[todate]`
 *                        params (the custom From/To fields are visual — no
 *                        Expo-Go date-picker lib).
 *   • Cashback/Reward — multi-select checkboxes (Cashback / Rewards).
 *                        FUNCTIONAL: server-side `filter[cashbacktype]`.
 *   • Store           — multi-select checkboxes built from the stores in the
 *                        user's loaded orders (options passed in). FUNCTIONAL
 *                        client-side (the orders API has no store filter).
 *
 * Status / Dates / Cashback-Reward selections are index-based (static lists);
 * the Store rail keys by store id (dynamic list). The screen maps these onto
 * real values via the exported option tables below.
 *
 * Hex → token (no inline hex):
 *   #ffffff → colors.surface.default
 *   #f5f7f9 → colors.background.muted
 *   #d9e3ec → colors.border.default
 *   #0741ef → colors.action.accent.default
 *   #0036da → colors.text.link (gradient via gradients.primary)
 *   #878787 → colors.text.tertiary
 *   #5c5c5c → colors.text.secondary
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text, Divider } from '../atoms';
import { Choice } from '../molecules';
import type { StatusBadgeStatus } from '../atoms';
import type { OrderRowType } from './OrderRow';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  gradients,
  opacity as opacityTokens,
} from '../tokens';

// ── option tables (exported so the screen can map indices → values) ──────────

export interface OrderStatusOption {
  label: string;
  /** Badge statuses this checkbox matches (Pending also catches 'delayed'). */
  statuses: StatusBadgeStatus[];
}

export const ORDER_STATUS_OPTIONS: OrderStatusOption[] = [
  { label: 'Pending', statuses: ['pending', 'delayed'] },
  { label: 'Confirmed', statuses: ['confirmed'] },
  { label: 'Paid', statuses: ['paid'] },
  { label: 'Requested', statuses: ['requested'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
];

export interface OrderTypeOption {
  label: string;
  type: OrderRowType;
}

export const ORDER_TYPE_OPTIONS: OrderTypeOption[] = [
  { label: 'Cashback', type: 'cashback' },
  { label: 'Rewards', type: 'rewards' },
];

export interface OrderDatePreset {
  label: string;
  /** Look-back window in days; null = All time (no date filter). */
  days: number | null;
}

export const ORDER_DATE_PRESETS: OrderDatePreset[] = [
  { label: 'All time', days: null },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export type OrdersFilterTab = 'status' | 'dates' | 'cashback-reward' | 'store';

/** One selectable store in the Store rail (key = stable id, label = name). */
export interface OrderStoreOption {
  key: string;
  label: string;
}

// ── geometry (Figma component dims, off the general scale) ───────────────────
const RAIL_W = 132;
const SCROLL_BOTTOM_RESERVE = spacing[128];

interface RailItem {
  id: OrdersFilterTab;
  label: string;
}

const RAIL_ITEMS: RailItem[] = [
  { id: 'status', label: 'Status' },
  { id: 'dates', label: 'Dates' },
  { id: 'cashback-reward', label: 'Cashback/Reward' },
  { id: 'store', label: 'Store' },
];

/** 16px calendar glyph — no calendar icon in the registry (inline, per the
 *  FilterGlyph / ChevronRightGlyph precedent). */
function CalendarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect
        x={2}
        y={3}
        width={12}
        height={11}
        rx={2}
        stroke={color}
        strokeWidth={borderWidth.thick}
      />
      <Line x1={2} y1={6.5} x2={14} y2={6.5} stroke={color} strokeWidth={borderWidth.thick} />
      <Line x1={5} y1={1.5} x2={5} y2={4} stroke={color} strokeWidth={borderWidth.thick} strokeLinecap="round" />
      <Line x1={11} y1={1.5} x2={11} y2={4} stroke={color} strokeWidth={borderWidth.thick} strokeLinecap="round" />
    </Svg>
  );
}

// ── left-rail tab row (active = muted bg + cobalt label + gradient bar) ──────
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
        backgroundColor: active ? colors.background.muted : colors.background.default,
      }}
    >
      {hasSelection ? (
        <View
          style={{
            width: spacing[6],
            height: spacing[6],
            borderRadius: radius.full,
            backgroundColor: active ? colors.action.accent.default : colors.text.tertiary,
          }}
        />
      ) : null}
      <Text
        variant={active ? 'body14Medium' : 'body14Regular'}
        color={active ? colors.action.accent.default : colors.text.tertiary}
        style={{ flex: 1 }}
        numberOfLines={2}
      >
        {item.label}
      </Text>
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

// ── custom-date field (From / To) — presentational ──────────────────────────
function CustomDateField({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: borderWidth.thin,
        borderColor: colors.border.default,
        borderRadius: radius.lg,
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[12],
        backgroundColor: colors.surface.default,
      }}
    >
      <View style={{ gap: spacing[2] }}>
        <Text variant="body12Regular" color={colors.text.tertiary}>
          {label}
        </Text>
        <Text variant="body14Medium" color={colors.text.primary}>
          Date Range
        </Text>
      </View>
      <CalendarGlyph size={iconSize[16]} color={colors.text.secondary} />
    </View>
  );
}

export interface OrdersFilterMenuProps {
  activeTab?: OrdersFilterTab;
  onTabChange?: (next: OrdersFilterTab) => void;
  /** Selected indices into ORDER_STATUS_OPTIONS (multi-select). */
  statusIndices?: number[];
  onToggleStatus?: (index: number) => void;
  /** Selected indices into ORDER_TYPE_OPTIONS (multi-select). */
  typeIndices?: number[];
  onToggleType?: (index: number) => void;
  /** Selected index into ORDER_DATE_PRESETS (single-select). Default 0 = All time. */
  datePresetIndex?: number;
  onSelectDatePreset?: (index: number) => void;
  /** Store options derived from the user's orders (label = store name). */
  storeOptions?: OrderStoreOption[];
  /** Selected store keys (multi-select). */
  storeKeys?: string[];
  onToggleStore?: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

const CHECKBOX_HELPER_TEXT = 'Select all the options you wish to apply';

export function OrdersFilterMenu({
  activeTab = 'status',
  onTabChange,
  statusIndices = [],
  onToggleStatus,
  typeIndices = [],
  onToggleType,
  datePresetIndex = 0,
  onSelectDatePreset,
  storeOptions = [],
  storeKeys = [],
  onToggleStore,
  style,
}: OrdersFilterMenuProps) {
  // Per-rail "has any applied filter" → drives the dot beside the rail label.
  const railHasSelection: Record<OrdersFilterTab, boolean> = {
    status: statusIndices.length > 0,
    dates: datePresetIndex > 0,
    'cashback-reward': typeIndices.length > 0,
    store: storeKeys.length > 0,
  };

  return (
    <View
      style={[
        {
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
            active={item.id === activeTab}
            hasSelection={railHasSelection[item.id]}
            onPress={() => onTabChange?.(item.id)}
          />
        ))}
      </View>

      {/* Right panel — SCROLLABLE. */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing[20],
          paddingHorizontal: spacing[16],
          paddingBottom: SCROLL_BOTTOM_RESERVE,
          gap: spacing[16],
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'status' ? (
          <>
            <Text variant="body14Regular" color={colors.text.secondary}>
              {CHECKBOX_HELPER_TEXT}
            </Text>
            <View style={{ gap: spacing[20] }}>
              {ORDER_STATUS_OPTIONS.map((opt, i) => (
                <Choice
                  key={opt.label}
                  type="checkbox"
                  checked={statusIndices.includes(i)}
                  label={opt.label}
                  onChange={() => onToggleStatus?.(i)}
                />
              ))}
            </View>
          </>
        ) : activeTab === 'cashback-reward' ? (
          <>
            <Text variant="body14Regular" color={colors.text.secondary}>
              {CHECKBOX_HELPER_TEXT}
            </Text>
            <View style={{ gap: spacing[20] }}>
              {ORDER_TYPE_OPTIONS.map((opt, i) => (
                <Choice
                  key={opt.label}
                  type="checkbox"
                  checked={typeIndices.includes(i)}
                  label={opt.label}
                  onChange={() => onToggleType?.(i)}
                />
              ))}
            </View>
          </>
        ) : activeTab === 'store' ? (
          <>
            <Text variant="body14Regular" color={colors.text.secondary}>
              {CHECKBOX_HELPER_TEXT}
            </Text>
            {storeOptions.length === 0 ? (
              <Text variant="body14Regular" color={colors.text.tertiary}>
                No stores in your orders yet.
              </Text>
            ) : (
              <View style={{ gap: spacing[20] }}>
                {storeOptions.map((opt) => (
                  <Choice
                    key={opt.key}
                    type="checkbox"
                    checked={storeKeys.includes(opt.key)}
                    label={opt.label}
                    onChange={() => onToggleStore?.(opt.key)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          // Dates rail — preset radios + Or + custom From/To.
          <>
            <Text variant="body14Regular" color={colors.text.secondary}>
              Select Date Range
            </Text>
            <View style={{ gap: spacing[20] }}>
              {ORDER_DATE_PRESETS.map((preset, i) => (
                <Choice
                  key={preset.label}
                  type="radio"
                  checked={datePresetIndex === i}
                  label={preset.label}
                  onChange={() => onSelectDatePreset?.(i)}
                />
              ))}
            </View>
            <Divider style="or" />
            <Text variant="body14Medium" color={colors.text.primary}>
              Choose Custom Date
            </Text>
            <View style={{ gap: spacing[12] }}>
              <CustomDateField label="From" />
              <CustomDateField label="To" />
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
