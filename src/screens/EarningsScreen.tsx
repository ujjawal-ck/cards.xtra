/**
 * EarningsScreen — Figma earnings/day-n-confirmed/landing (4878:48463).
 *
 * Pure composition of existing components. The Earnings tab in the
 * existing TabNavigator already wires this screen + provides the
 * FloatingBottomNav (the visual tab bar), so no <BottomNav> is
 * rendered inside the screen — see the "Navigation note" below.
 *
 * Layout (vertical column, screen bg colors.background.muted). This is a
 * TAB section, so there is NO Header / back arrow — the masthead leads.
 * Paytm "My Cashback" structure (spec docs/specs/earnings-split.md v2):
 *   1. <Masthead variant='earnings' />  — all-time total + Cashback / Rewards
 *      stat cards (each opens its EarningsBreakupSheet). The only split.
 *   2. Two stacked <AmountActionRow>s — Confirmed (combined) + Withdraw,
 *      Pending (combined) + Know Why?
 *   3. "Don't see your order here?" row → Missing Cashback flow.
 *   4. Transactions — status <Chip>s, first 10 <OrderRow>s under month
 *      headings, "View all orders".
 *   5. Get Help row.
 *
 * Navigation note: src/navigation/TabNavigator.tsx provides the
 * Earnings tab and floats the BottomNav via its `tabBar` prop, so this
 * screen does NOT render its own BottomNav (avoids the double-tab-bar
 * the spec calls out). The spec'd 360×102 white-fade wrapper for the
 * tab bar isn't in the current FloatingBottomNav — left as a flag.
 */
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { Text, Button, Chip, Skeleton } from '../atoms';
import { useAuth } from '../auth/AuthContext';
import { useLoginSheet } from '../auth/LoginSheetProvider';
import { analytics, Events } from '../analytics';
import { ListRow, AmountActionRow } from '../molecules';
import {
  Masthead,
  EarningsBreakupSheet,
  EarningStatusSheet,
  StaggeredEntrance,
  GuestPrompt,
  ScreenState,
  OrderRow,
  ORDER_STATUS_OPTIONS,
} from '../organisms';
import type {
  EarningsBreakupSheetRef,
  EarningStatusSheetRef,
} from '../organisms';
import { colors, spacing, radius, elevation } from '../tokens';
import { useEarnings } from '../query/useEarnings';
import { useOrders } from '../query/useOrders';
import { isPausedWithoutData } from '../query/paused';
import type { OrdersApiFilters } from '../api/cashkaro';
import { groupByMonth } from '../lib/groupByMonth';
import {
  EARNINGS_FILTERS,
  EARNINGS_EMPTY_COPY,
  statusParamFor,
  type EarningsFilter,
} from '../lib/earningsFilters';
import { useWithdrawGate } from './withdraw/useWithdrawGate';
import { useFloatingNavClearance } from '../navigation/floatingNav';
import type { RootStackParamList, TabParamList } from '../navigation/types';

// Transactions shown on the page; the full list lives on OrdersList.
const TRANSACTIONS_PREVIEW = 10;
const SKELETON_ROWS = 3;

// Composite nav — Earnings sits inside the bottom-tab navigator,
// which itself is a screen of the root stack. To navigate to Withdraw
// (a root-stack route, NOT a tab) the screen needs both nav contexts
// stitched together via CompositeNavigationProp.
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Earnings'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function EarningsScreen() {
  // Scroll padding that clears the floating tab bar (+ Android nav bar).
  const navClearance = useFloatingNavClearance();
  // Re-tapping this tab in the bottom nav scrolls back to the top.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const navigation = useNavigation<Nav>();
  // Live earnings for the signed-in user. While the first fetch is in
  // flight every money figure shows a pulsing skeleton (via each
  // component's `loading` prop) rather than the masthead's ₹1,500
  // default, so the screen reads as loading instead of flashing a fake
  // value that then changes.
  const earningsQuery = useEarnings();
  const { data: earnings, isLoading, isError, refetch } = earningsQuery;
  const loading = isLoading && !earnings;
  // Opened offline with nothing cached: the query is paused, so it is
  // neither loading nor an error. Falling through showed ₹0 everywhere.
  const offline = isPausedWithoutData(earningsQuery);


  // Replay the All Time Earnings slot-machine roll every time the
  // Earnings tab comes into focus (not just on first mount). Bumping
  // this token re-triggers the reels in <Masthead>/<RollingAmount>.
  const [rollToken, setRollToken] = useState(0);
  // Replay the slot-machine roll on every focus. The balance refetch itself is
  // handled inside useEarnings (useRefetchOnFocus), so this only drives the
  // animation token.
  useFocusEffect(
    useCallback(() => {
      setRollToken((t) => t + 1);
    }, [])
  );

  // Breakup sheets — tapping the Cashback / Rewards stat card on the
  // masthead opens the matching sheet (Figma 2898:166495 / 2898:165012).
  const cashbackSheetRef = useRef<EarningsBreakupSheetRef>(null);
  const rewardsSheetRef = useRef<EarningsBreakupSheetRef>(null);

  // Pending ("Know Why?") sheet for the combined pending amount. The
  // Withdraw-side sheets (₹0 "Cashback Not Confirmed", payment-in-process)
  // live in useWithdrawGate, shared with Profile.
  const pendingRef = useRef<EarningStatusSheetRef>(null);

  // Transactions: status chip → server-side status filter (same rule as
  // OrdersList), first 10 rows of useOrders.
  const [filter, setFilter] = useState<EarningsFilter>('All');
  const apiFilters = useMemo<OrdersApiFilters>(() => {
    const status = statusParamFor(filter, ORDER_STATUS_OPTIONS);
    return status ? { status } : {};
  }, [filter]);
  const orders = useOrders(apiFilters);
  const sections = useMemo(
    () => groupByMonth((orders.data ?? []).slice(0, TRANSACTIONS_PREVIEW)),
    [orders.data]
  );

  // Shared withdraw entry check (₹0 / payout already settling) — same gate
  // as Profile's "Withdraw Cashback" row.
  const { startWithdraw: handleWithdraw, gateSheets } = useWithdrawGate({
    onProceed: (bucket) => navigation.navigate('WithdrawStack', { bucket }),
    onBrowseDeals: () => navigation.navigate('Offers'),
  });

  // Login is optional. Signed out, the money figures have no account behind
  // them, so the tab explains what logging in unlocks instead of showing ₹0s.
  const { status } = useAuth();
  // Signing in re-renders this tab with the user's earnings; no navigation.
  const { open: openLogin } = useLoginSheet();
  if (status === 'unauthenticated') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: spacing[16],
              paddingHorizontal: spacing[16],
              paddingBottom: navClearance,
              gap: spacing[16],
            }}
          >
            <Text variant="heading20SemiBold" color={colors.text.primary}>
              My Earnings
            </Text>
            <GuestPrompt
              title="See every rupee you earn"
              body="Log in to track cashback from card applications and shopping, and withdraw it to UPI or a gift card."
              onLogin={() => {
                analytics.track(Events.LOGIN_PROMPT_TAP, { source: 'earnings' });
                openLogin({ source: 'earnings' });
              }}
            />
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="chat-outline"
                title="Get Help"
                onPress={() => navigation.navigate('GetHelp')}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Offline, or failed to load (server error, unusable response) with
  // nothing cached: say so. Falling through showed ₹0 everywhere, which
  // reads as an empty balance. Offline wins: a paused query that failed
  // before is also isError.
  if (offline || (isError && !earnings)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: spacing[16],
              paddingHorizontal: spacing[16],
              paddingBottom: navClearance,
              gap: spacing[16],
            }}
          >
            <Text variant="heading20SemiBold" color={colors.text.primary}>
              My Earnings
            </Text>
            {offline ? (
              <ScreenState
                title="No internet connection"
                body="Check your connection or try again."
                actionLabel="Try again"
                onAction={() => refetch()}
              />
            ) : (
              <ScreenState
                title="Couldn’t load your earnings"
                body="Check your connection and try again."
                actionLabel="Try again"
                onAction={() => refetch()}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        // colors.background.muted = slate-150 (#f5f7f9), the sunken
        // grey the spec asks for.
        backgroundColor: colors.background.muted,
      }}
    >
      <StatusBar style="dark" />

      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            // Earnings is a TAB section, not a pushed screen — no Header /
            // back arrow. The blue earnings masthead leads; a small top gap
            // keeps it off the status bar.
            paddingTop: spacing[12],
            // Reserve enough room for the floating BottomNav (provided
            // by TabNavigator) so the list never hides beneath it.
            paddingBottom: navClearance,
          }}
        >
          {/* Staggered entrance — each section block fades + rises into place a
              beat after the previous, replaying on every tab focus. The
              section `gap` lives here (not contentContainerStyle) so it spaces
              the cascade's wrapper rows. */}
          <StaggeredEntrance style={{ gap: spacing[24] }}>
          {/* 1. Masthead — REUSED earnings variant (defaults match
              spec: ₹1,500 / Your All Time Earnings / Cashback ₹1500.0
              / Rewards ₹0.0). No screen-level horizontal padding here —
              the masthead carries its own paddingHorizontal:16, so the
              dark card sits at the same 16-px gutter as the rows + list
              below. Wrapping it in another paddingHorizontal:16 would
              double the inset and shift the card off-axis. */}
          <Masthead
            variant="earnings"
            loading={loading}
            rollToken={rollToken}
            totalEarnings={earnings?.totalEarnings}
            cashbackValue={earnings?.cashbackValue}
            rewardsValue={earnings?.rewardsValue}
            onCashbackPress={() => cashbackSheetRef.current?.present()}
            onRewardsPress={() => rewardsSheetRef.current?.present()}
          />

          {/* 2. Rows group — DS <AmountActionRow>s stacked, as on the
              original Earnings page. Combined cashback + rewards; the
              per-type split lives in the masthead breakup sheets. */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
            <AmountActionRow
              iconName="desc-withdrawcash"
              caption="Confirmed"
              loading={loading}
              value={earnings?.combined ?? '₹0'}
              buttonLabel="Withdraw"
              buttonVariant="solid"
              buttonTone="main"
              // No type → the gate checks confirmed cashback + rewards
              // combined; WithdrawScreen lets the user pick the bucket.
              onButtonPress={() => handleWithdraw()}
            />
            <AmountActionRow
              iconName="desc-pendingcash"
              caption="Pending"
              loading={loading}
              value={earnings?.pendingCombined ?? '₹0'}
              buttonLabel="Know Why?"
              buttonVariant="outline"
              buttonTone="main"
              onButtonPress={() => pendingRef.current?.present()}
            />
          </View>

          {/* 3. Missing-cashback prompt — one tappable row. */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="clipboard-search-outline"
                title="Don’t see your order here?"
                onPress={() =>
                  navigation.navigate('MissingCashbackDidYouShop', { backTo: 'back' })
                }
              />
            </View>
          </View>

          {/* 4. Transactions — status chips, first 10 rows by month. */}
          <View style={{ gap: spacing[12] }}>
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                Transactions
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing[8] }}>
                {EARNINGS_FILTERS.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    state={filter === f ? 'selected' : 'default'}
                    onPress={() => setFilter(f)}
                  />
                ))}
              </View>
            </View>

            {orders.isLoading ? (
              <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <Skeleton key={i} height={spacing[80]} radius="lg" />
                ))}
              </View>
            ) : isPausedWithoutData(orders) ? (
              // Balances cached but this list paused offline: not "no orders".
              <ScreenState
                title="No internet connection"
                body="Check your connection or try again."
                actionLabel="Try again"
                onAction={() => orders.refetch()}
              />
            ) : orders.isError && !orders.data ? (
              <ScreenState
                title="Couldn’t load your transactions"
                body="Something went wrong. Please try again."
                actionLabel={orders.isFetching ? 'Retrying…' : 'Try again'}
                onAction={() => orders.refetch()}
              />
            ) : sections.length === 0 ? (
              <ScreenState title={EARNINGS_EMPTY_COPY[filter]} />
            ) : (
              <View>
                {sections.map((section) => (
                  <View key={section.key}>
                    {section.label ? (
                      <Text
                        variant="body14SemiBold"
                        color={colors.text.secondary}
                        style={{
                          paddingHorizontal: spacing[16],
                          paddingVertical: spacing[8],
                        }}
                      >
                        {section.label}
                      </Text>
                    ) : null}
                    {section.rows.map((row) => (
                      <OrderRow
                        key={row.id}
                        type={row.type}
                        badgeVariant={row.badgeVariant}
                        status={row.status}
                        tagLabel={row.tagLabel}
                        tagTone={row.tagTone}
                        amount={row.amount}
                        showAmountChevron={row.showAmountChevron}
                        metaLabel={row.metaLabel}
                        metaValue={row.metaValue}
                        note={row.note}
                        logoSrc={row.logoSrc}
                        onPress={
                          row.showAmountChevron
                            ? () => {
                                analytics.track(Events.ORDER_SELECT, {
                                  order_id: row.id,
                                  status: row.status,
                                });
                                navigation.navigate('OrdersDetail', { id: row.id });
                              }
                            : undefined
                        }
                      />
                    ))}
                  </View>
                ))}
                <View style={{ alignItems: 'center', paddingTop: spacing[12] }}>
                  <Button
                    label="View all orders"
                    variant="link"
                    size={36}
                    icon="trailing"
                    iconName="chevron-right"
                    onPress={() => navigation.navigate('OrdersList')}
                  />
                </View>
              </View>
            )}
          </View>

          {/* 5. Get Help */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="chat-outline"
                title="Get Help"
                onPress={() => navigation.navigate('GetHelp')}
              />
            </View>
          </View>
          </StaggeredEntrance>
        </ScrollView>
      </SafeAreaView>

      {/* Breakup sheets — opened by the masthead Cashback / Rewards cards. */}
      <EarningsBreakupSheet
        ref={cashbackSheetRef}
        variant="cashback"
        confirmed={earnings?.confirmedCashback ?? '₹0'}
        pending={earnings?.pendingCashback ?? '₹0'}
        paid={earnings?.paidCashback ?? '₹0'}
      />
      <EarningsBreakupSheet
        ref={rewardsSheetRef}
        variant="rewards"
        confirmed={earnings?.confirmedRewards ?? '₹0'}
        pending={earnings?.pendingRewards ?? '₹0'}
        paid={earnings?.paidRewards ?? '₹0'}
      />

      {/* Withdraw gate sheets (₹0 / payout settling) — from useWithdrawGate. */}
      {gateSheets}

      {/* Pending ("Know Why?") sheet — combined pending amount. */}
      <EarningStatusSheet
        ref={pendingRef}
        earningType="combined"
        amount={earnings?.pendingCombined ?? '₹0'}
      />
    </View>
  );
}
