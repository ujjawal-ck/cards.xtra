/**
 * OrdersList — screen (Figma 4049:131896, file P7UcoZYBnfyefmJIA8wcM7)
 *
 * Reconciled against LIVE Figma (file P7UcoZYBnfyefmJIA8wcM7) — see flag log
 * at the bottom of this comment.
 *
 * Pure composition. Top → bottom:
 *   1. Header (back) — REUSED organism. Title "My Order Details".
 *   2. "Check Status" card (node 4049:131901) — faint-blue card w/ 1px border
 *      + XS shadow; 2 stacked texts + 24px chevron.
 *   3. Filter row (node 4049:131906) — full-bleed white, right-aligned:
 *      16px filter glyph + plain "Filter" text (NOT a chip).
 *      (the hidden inner `cntr` artifact 4049:131907 is NOT rendered.)
 *   4. Instruction band (node 4049:131919) — full-bleed Section-Orange tint.
 *   5. Order list — vertical stack of <OrderCard> timeline cards (Figma
 *      orders/list-v2-timeline 6194:26502): status-tinted strip + logo/amount
 *      + meta row + optional expandable note, per card.
 *
 * Token map (per property):
 *   screen bg          → colors.background.default
 *   check-status card  → bg colors.background.muted (#f5f7f9 ≈ Figma #f7f9ff,
 *                        closest token 🚩) · border.default (#d9e3ec) ·
 *                        radius.lg · px spacing[16] py spacing[16]
 *   card top text      → body14SemiBold / colors.text.primary (#262626)
 *   card sub text      → body12SemiBold / colors.text.secondary (#5c5c5c)
 *   card chevron       → inline 24px glyph / colors.icon.actions
 *   filter glyph       → inline 16px funnel (no filter icon registered) / colors.text.primary
 *   filter label       → body14SemiBold / colors.text.primary, plain "Filter"
 *   instruction band   → bg colors.background.emphasis (#fff4eb ≈ Figma #fff5ed,
 *                        closest token 🚩) · px spacing[24] py spacing[16]
 *   instruction text   → body12SemiBold / colors.text.secondary
 *   order rows         → <OrderRow> — REUSED organism
 *
 * FLAG LOG (reconciled vs live Figma):
 *   1. Check-Status card bg/copy   ✏️ FIXED — Figma card is faint-blue #f7f9ff
 *      (node 4049:131900/01)          w/ 1px #d9e3ec border + XS shadow. Added
 *                                     border; bg kept background.muted (#f5f7f9,
 *                                     nearest token 🚩 — no #f7f9ff token).
 *                                     Copy confirmed "Don’t see your order here?"
 *                                     / "Check Status"; sub-line is grey 12px
 *                                     (text.secondary), NOT a blue link — retoned.
 *                                     Top line retoned 14px → text.primary.
 *   2. Filter chip shape           ✏️ FIXED — Figma (node 4049:131918) is PLAIN
 *                                     "Filter" text (14px SemiBold #262626) beside
 *                                     the glyph, NO chip border/fill. Replaced the
 *                                     <Chip> with a plain Text; label singular
 *                                     "Filter" (was "Filters").
 *   3. Instruction token/copy      ✏️ FIXED — band has Section-Orange #fff5ed bg
 *      (node 4049:131919)             (was untinted), full-bleed px24/py16, text
 *                                     12px (was 14). Copy confirmed.
 *   4. filter_alt icon inline      ✅ CONFIRMED — no registry icon; 16px funnel
 *                                     glyph matches Figma node 4049:131915 (16×16).
 *   5. referral/bonus logo         ✅ CONFIRMED — Figma rows show the CK
 *                                     (Cards.xtra dark) logo; images.logos.darkSmall
 *                                     is exactly that asset, not a placeholder gap.
 *   6. hidden container 4049:131907 ✅ CONFIRMED NOT RENDERED — it is a hidden
 *                                     orphan inner `cntr` (a status tag + ₹amount +
 *                                     chevron), a leftover design artifact inside
 *                                     the filter row; correctly omitted.
 *
 * Imports: Header, OrderCard (organisms); Text (atoms).
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  ImageBackground,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import Svg, { Path } from 'react-native-svg';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Chip } from '../atoms';
import {
  Header,
  OrderCard,
  CashbackPip,
  BottomSheetHeader,
  FooterButtons,
  OrdersFilterMenu,
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  ORDER_DATE_PRESETS,
  ScreenState,
} from '../organisms';
import { images } from '../assets/images';
import type { OrdersFilterTab, OrderStoreOption } from '../organisms';
import { useOrders } from '../query/useOrders';
import type { OrdersApiFilters } from '../api/cashkaro';
import { colors, spacing, radius, iconSize, borderWidth, sizing, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrdersList'>;

/** 24px chevron — no `chevron-right` in the Icon registry (inline glyph). */
function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6 L15 12 L9 18"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


interface OrdersFilter {
  statusIndices: number[];
  typeIndices: number[];
  /** Index into ORDER_DATE_PRESETS; 0 = All time (no date filter). */
  datePresetIndex: number;
  /** Selected store keys (OrderListRow.merchantKey). */
  storeKeys: string[];
}

const EMPTY_FILTER: OrdersFilter = {
  statusIndices: [],
  typeIndices: [],
  datePresetIndex: 0,
  storeKeys: [],
};

const filterCount = (f: OrdersFilter) =>
  f.statusIndices.length +
  f.typeIndices.length +
  (f.datePresetIndex > 0 ? 1 : 0) +
  f.storeKeys.length;

/** `Date` → "yyyy-MM-dd" (the orders API's filter[fromdate]/[todate] format). */
function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** A date-preset look-back (days) → {fromdate, todate}. null = no window. */
function dateRangeFor(days: number | null): { fromdate?: string; todate?: string } {
  if (days == null) return {};
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { fromdate: isoDate(from), todate: isoDate(to) };
}

export function OrdersList() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // ── Filters sheet ──────────────────────────────────────────────────────
  // Draft/commit pattern (mirrors the Home Filters sheet): a DRAFT holds the
  // in-sheet selections; "Apply Filter" commits it to APPLIED, "Clear" resets
  // both. Status / Cashback-type / Dates commit to SERVER-SIDE query params
  // (the list refetches); Store filters CLIENT-SIDE (the orders API has no
  // store param). Opening the sheet seeds the draft from the applied set.
  const filtersSheetRef = useRef<BottomSheetModal>(null);
  const filtersSnapPoints = useMemo(() => ['70%'], []);
  const [activeTab, setActiveTab] = useState<OrdersFilterTab>('status');
  const [draft, setDraft] = useState<OrdersFilter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<OrdersFilter>(EMPTY_FILTER);

  // Applied status/type/date → server-side `filter[*]` params. Store is NOT
  // here — it's applied client-side below (no backend store filter exists).
  const apiFilters = useMemo<OrdersApiFilters>(() => {
    const f: OrdersApiFilters = {};
    const statuses = applied.statusIndices
      .map((i) => ORDER_STATUS_OPTIONS[i]?.label.toLowerCase())
      .filter(Boolean) as string[];
    if (statuses.length) f.status = statuses.join(',');
    const types = applied.typeIndices
      .map((i) => ORDER_TYPE_OPTIONS[i]?.type)
      .filter(Boolean) as string[];
    if (types.length) f.cashbacktype = types.join(',');
    const { fromdate, todate } = dateRangeFor(
      ORDER_DATE_PRESETS[applied.datePresetIndex]?.days ?? null
    );
    if (fromdate) f.fromdate = fromdate;
    if (todate) f.todate = todate;
    return f;
  }, [applied]);

  const { data: rows, isLoading, isError, refetch, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useOrders(apiFilters);

  // Load the next page of 20 when the user nears the bottom of the list.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - layoutMeasurement.height;
      if (nearEnd && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const openFilters = useCallback(
    (tab: OrdersFilterTab = 'status') => {
      setDraft(applied);
      setActiveTab(tab);
      filtersSheetRef.current?.present();
    },
    [applied]
  );

  const toggleIndex = useCallback(
    (key: 'statusIndices' | 'typeIndices') => (index: number) =>
      setDraft((prev) => {
        const arr = prev[key];
        return {
          ...prev,
          [key]: arr.includes(index) ? arr.filter((i) => i !== index) : [...arr, index],
        };
      }),
    []
  );
  const toggleStatus = useMemo(() => toggleIndex('statusIndices'), [toggleIndex]);
  const toggleType = useMemo(() => toggleIndex('typeIndices'), [toggleIndex]);
  const selectDatePreset = useCallback(
    (index: number) => setDraft((prev) => ({ ...prev, datePresetIndex: index })),
    []
  );
  const toggleStore = useCallback(
    (key: string) =>
      setDraft((prev) => ({
        ...prev,
        storeKeys: prev.storeKeys.includes(key)
          ? prev.storeKeys.filter((k) => k !== key)
          : [...prev.storeKeys, key],
      })),
    []
  );

  const applyFilters = useCallback(() => {
    analytics.track(Events.ORDERS_FILTER_APPLY, { filter_count: filterCount(draft) });
    setApplied(draft);
    filtersSheetRef.current?.dismiss();
  }, [draft]);

  const clearFilters = useCallback(() => {
    setDraft(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
  }, []);

  // Store rail options — distinct stores present in the loaded orders, keyed
  // by merchantKey (logo URL) and labelled by merchantName (or a logo-derived
  // name). Reflects the current server-filtered result set.
  const storeOptions = useMemo<OrderStoreOption[]>(() => {
    const map = new Map<string, string>();
    (rows ?? []).forEach((r) => {
      if (r.merchantKey && !map.has(r.merchantKey)) {
        map.set(r.merchantKey, r.merchantName || 'Store');
      }
    });
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [rows]);

  // Client-side Store filter, applied on top of the server-filtered rows.
  const filteredRows = useMemo(() => {
    if (!rows || applied.storeKeys.length === 0) return rows;
    return rows.filter((r) => applied.storeKeys.includes(r.merchantKey));
  }, [rows, applied.storeKeys]);

  const appliedCount = filterCount(applied);
  const draftCount = filterCount(draft);
  // The two filter chips split the applied set so neither double-counts:
  // "Brand" owns the store selections, "Filter" owns status/type/date.
  const brandCount = applied.storeKeys.length;
  const filterChipCount = appliedCount - brandCount;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  const renderFiltersFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <FooterButtons
          buttons="dual"
          // Same as Home's Filters footer (Figma 1791:4029): 44 dp, saffron strip.
          size={44}
          shadow="on"
          strip="caption"
          stripTone="brand"
          stripText={`${draftCount} filter${draftCount === 1 ? '' : 's'} selected`}
          color="second"
          primaryLabel="Apply Filter"
          secondaryLabel="Clear"
          onPrimary={applyFilters}
          onSecondary={clearFilters}
          style={{ paddingBottom: insets.bottom }}
        />
      </BottomSheetFooter>
    ),
    [draftCount, applyFilters, clearFilters, insets.bottom]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="My Order Details"
          onLeadingPress={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sizing.bottomNavHeight }}
          onScroll={onScroll}
          scrollEventThrottle={200}
        >
          {/* 2. Check Status card — vibrant blue hero (the same dark-blue
              backdrop as the "All Time Earnings" masthead), white copy +
              chevron, lifted with a soft shadow. */}
          <View style={{ paddingHorizontal: spacing[16], paddingVertical: spacing[8] }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('MissingCashbackHelp')}
              style={{
                borderRadius: radius.lg,
                backgroundColor: colors.surface.default,
                ...elevation.light.md,
              }}
            >
              <ImageBackground
                source={images.backgrounds.darkblue}
                resizeMode="cover"
                imageStyle={{ borderRadius: radius.lg }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing[16],
                  paddingVertical: spacing[16],
                }}
              >
                <Text variant="body14SemiBold" color={colors.text.inverse}>
                  Don’t see your order here?
                </Text>
                <ChevronRightGlyph size={iconSize[24]} color={colors.text.inverse} />
              </ImageBackground>
            </Pressable>
          </View>

          {/* 3. Filter row — left-aligned chips, in the same language as the
              Home filter pills: a "Filter" chip + a "Brand" chip with a
              dropdown caret. Both open the Filters sheet (Brand lands on the
              Store rail). Counts flip a chip into the selected look.
              Hidden when there are no orders at all and no filter applied —
              filtering an empty list is a dead end. */}
          {(rows?.length ?? 0) > 0 || appliedCount > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[8],
              paddingTop: spacing[16],
              paddingBottom: spacing[8],
              paddingHorizontal: spacing[16],
            }}
          >
            <Chip
              label="Filter"
              leadingIcon={filterChipCount > 0 ? 'filter-filled' : 'filter-outline'}
              count={filterChipCount > 0 ? filterChipCount : undefined}
              onPress={() => openFilters('status')}
            />
            <Chip
              label="Brand"
              count={brandCount > 0 ? brandCount : undefined}
              trailingIcon="chevron-down"
              style={{ paddingRight: spacing[6] }}
              onPress={() => openFilters('store')}
            />
          </View>
          ) : null}

          {/* 4. Order list — full-bleed rows (each carries its own bottom
              border). Live from CashKaro /users/orders; loading / empty /
              error states below. */}
          {isLoading ? (
            <View style={{ paddingVertical: spacing[40], alignItems: 'center' }}>
              <ActivityIndicator color={colors.action.primary.default} />
            </View>
          ) : isError ? (
            <ScreenState
              title="Couldn’t load your orders"
              body="Something went wrong. Please try again."
              actionLabel={isFetching ? 'Retrying…' : 'Try again'}
              onAction={() => refetch()}
            />
          ) : !filteredRows || filteredRows.length === 0 ? (
            // Empty: distinguish "no orders at all" from "filters excluded all"
            // (Figma section 27 "No matching results" pattern).
            appliedCount > 0 ? (
              <ScreenState
                title="No matching results"
                body="Try adjusting your filters."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <ScreenState
                image={images.screenstate.appOrders}
                title="No orders yet"
                body="Shop via Cards.xtra and your orders will show up here."
              />
            )
          ) : (
            // Revamped list — a stack of timeline-style cards (Figma
            // orders/list-v2-timeline). px16 gutter, spacing[12] between cards.
            <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12], gap: spacing[12] }}>
              {(filteredRows ?? []).map(({ id, type, status, amount, metaValue, note, logoSrc, showAmountChevron }) => (
                <OrderCard
                  key={id}
                  type={type}
                  status={status ?? 'pending'}
                  amount={amount}
                  metaValue={metaValue}
                  note={note}
                  logoSrc={logoSrc}
                  onPress={
                    showAmountChevron
                      ? () => {
                          analytics.track(Events.ORDER_SELECT, { order_id: id, status });
                          navigation.navigate('OrdersDetail', { id });
                        }
                      : undefined
                  }
                />
              ))}
              {isFetchingNextPage ? (
                <View style={{ paddingVertical: spacing[16], alignItems: 'center' }}>
                  <ActivityIndicator color={colors.action.primary.default} />
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        {/* Filters sheet — opens via the Filter row. Sticky BottomSheetHeader,
            sticky left rail + scrollable right panel (OrdersFilterMenu), sticky
            FooterButtons (Clear / Apply Filter + live count). Single 70% snap,
            dynamic sizing OFF so the height is the same across all rails. */}
        <BottomSheetModal
          ref={filtersSheetRef}
          snapPoints={filtersSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          footerComponent={renderFiltersFooter}
          handleComponent={() => null}
          backgroundStyle={{
            backgroundColor: colors.surface.default,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
          }}
        >
          <View style={{ flex: 1 }}>
            <BottomSheetHeader title="Filters" showStroke />
            <OrdersFilterMenu
              activeTab={activeTab}
              onTabChange={setActiveTab}
              statusIndices={draft.statusIndices}
              onToggleStatus={toggleStatus}
              typeIndices={draft.typeIndices}
              onToggleType={toggleType}
              datePresetIndex={draft.datePresetIndex}
              onSelectDatePreset={selectDatePreset}
              storeOptions={storeOptions}
              storeKeys={draft.storeKeys}
              onToggleStore={toggleStore}
            />
          </View>
        </BottomSheetModal>
      </SafeAreaView>

      {/* Draggable "Never miss your cashback" pip — floats over the screen,
          collapses to a right-edge notch (genie), and links to the
          Never-Miss-Cashback setup. Android-only; renders nothing elsewhere. */}
      <CashbackPip
        onPress={() => navigation.navigate('CashbackGuard')}
        // Stay a side notch over the empty state so it doesn't cover the copy.
        autoExpand={(rows?.length ?? 0) > 0}
      />
    </View>
  );
}
