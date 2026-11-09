/**
 * EarningsScreen — Figma earnings/day-n-confirmed/landing (4878:48463).
 *
 * Pure composition of existing components. The Earnings tab in the
 * existing TabNavigator already wires this screen + provides the
 * FloatingBottomNav (the visual tab bar), so no <BottomNav> is
 * rendered inside the screen — see the "Navigation note" below.
 *
 * Layout (vertical column, screen bg colors.background.muted). This is a
 * TAB section, so there is NO Header / back arrow — the masthead leads:
 *   1. <Masthead variant='earnings' />                         — organism
 *   2. Rows group:
 *       - <AmountActionRow caption='Confirmed' value='₹1500.0'
 *                          buttonLabel='Withdraw' buttonVariant='solid' />
 *       - <AmountActionRow caption='Pending'   value='₹0'
 *                          buttonLabel='Know Why?' buttonVariant='outline' />
 *   3. List card (white, radius.xl, elevation.light.xs):
 *       Three <ListRow type='menu-option' …> stacked with <Divider />
 *       between, each with a 24-px leading icon + body14Medium title +
 *       chevron-right.
 *
 * Navigation note: src/navigation/TabNavigator.tsx provides the
 * Earnings tab and floats the BottomNav via its `tabBar` prop, so this
 * screen does NOT render its own BottomNav (avoids the double-tab-bar
 * the spec calls out). The spec'd 360×102 white-fade wrapper for the
 * tab bar isn't in the current FloatingBottomNav — left as a flag.
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { Divider } from '../atoms';
import { ListRow, AmountActionRow } from '../molecules';
import {
  Masthead,
  EarningsBreakupSheet,
  EarningStatusSheet,
  StaggeredEntrance,
} from '../organisms';
import type {
  EarningsBreakupSheetRef,
  EarningStatusSheetRef,
} from '../organisms';
import { colors, spacing, radius, elevation } from '../tokens';
import { useEarnings } from '../query/useEarnings';
import { useWithdrawGate } from './withdraw/useWithdrawGate';
import { useFloatingNavClearance } from '../navigation/floatingNav';
import type { RootStackParamList, TabParamList } from '../navigation/types';

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
  const { data: earnings, isLoading } = useEarnings();
  const loading = isLoading && !earnings;


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

  // Pending-state sheet (Figma 2898:166477): Pending row "Know Why?" →
  // "Earning Status". The Withdraw-side sheets (₹0 "Cashback Not Confirmed",
  // payment-in-process) live in useWithdrawGate, shared with Profile.
  const earningStatusRef = useRef<EarningStatusSheetRef>(null);
  // Paid row's "View" opens the same Earning-Status sheet in its 'paid'
  // variant (Cashback Paid), rather than navigating to payment history.
  const paidStatusRef = useRef<EarningStatusSheetRef>(null);

  // Shared withdraw entry check (₹0 / payout already settling) — same gate
  // as Profile's "Withdraw Cashback" row.
  const { startWithdraw: handleWithdraw, gateSheets } = useWithdrawGate({
    onProceed: () => navigation.navigate('WithdrawStack'),
    onBrowseDeals: () => navigation.navigate('Offers'),
  });

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

          {/* 2. Rows group */}
          <View
            style={{
              paddingHorizontal: spacing[16],
              gap: spacing[12],
            }}
          >
            <AmountActionRow
              iconName="desc-withdrawcash"
              caption="Confirmed"
              loading={loading}
              // Withdrawable total = confirmed cashback + rewards (combined),
              // matching what the Withdraw flow actually pays out. Showing
              // `confirmed` (cashback only) hid a positive rewards balance and
              // made the ₹0 block disagree with the working Withdraw button.
              value={earnings?.combined ?? '₹0'}
              buttonLabel="Withdraw"
              buttonVariant="solid"
              buttonTone="main"
              // With a confirmed balance, opens the withdraw flow; with ₹0
              // confirmed, opens the "Cashback Not Confirmed" sheet instead.
              onButtonPress={handleWithdraw}
            />
            <AmountActionRow
              iconName="desc-pendingcash"
              caption="Pending"
              loading={loading}
              value={earnings?.pending ?? '₹0'}
              buttonLabel="Know Why?"
              buttonVariant="outline"
              buttonTone="main"
              // Text matches the outline stroke (saffron-400) rather than
              // the darker saffron-700 default — a single-tone CTA.
              // Explains why the pending amount can't be withdrawn yet.
              onButtonPress={() => earningStatusRef.current?.present()}
            />
            <AmountActionRow
              iconName="desc-paid"
              caption="Paid"
              loading={loading}
              // Already paid out to the user — live from the earnings API
              // (paid_cashback, mapped in earningsMapper).
              value={earnings?.paid ?? '₹0'}
              buttonLabel="View"
              buttonVariant="outline"
              buttonTone="main"
              // Text matches the outline stroke (saffron-400) rather than
              // the darker saffron-700 default — a single-tone CTA.
              // Explains the paid amount in a sheet (Cashback Paid).
              onButtonPress={() => paidStatusRef.current?.present()}
            />
          </View>

          {/* 3. List card — composed from <ListRow type='menu-option' />
              with <Divider /> between rows. */}
          <View
            style={{
              paddingHorizontal: spacing[16],
            }}
          >
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[12],
                  paddingHorizontal: spacing[16],
                  gap: spacing[12],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="cart-outline"
                title="My Order Details"
                onPress={() => navigation.navigate('OrdersList')}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="clipboard-search-outline"
                title="Missing Cashback"
                onPress={() =>
                  navigation.navigate('MissingCashbackDidYouShop', { backTo: 'back' })
                }
              />
              <Divider style="solid" />
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
        confirmed={earnings?.confirmed ?? '₹0'}
        pending={earnings?.pending ?? '₹0'}
        paid={earnings?.paid ?? '₹0'}
      />
      <EarningsBreakupSheet
        ref={rewardsSheetRef}
        variant="rewards"
        confirmed={earnings?.rewardsValue ?? '₹0'}
        pending="₹0"
        paid="₹0"
      />

      {/* Withdraw gate sheets (₹0 / payout settling) — from useWithdrawGate. */}
      {gateSheets}

      {/* Pending-state sheet — opened from the Know Why? CTA. */}
      <EarningStatusSheet
        ref={earningStatusRef}
        amount={earnings?.pending ?? '₹0'}
      />

      {/* Paid breakdown — opened from the Paid row's "View" CTA. */}
      <EarningStatusSheet
        ref={paidStatusRef}
        variant="paid"
        amount={earnings?.paid ?? '₹0'}
      />
    </View>
  );
}
