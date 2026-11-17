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
 *   2. Two sections, "Cashback" then "Rewards", each a title over
 *      Confirmed (Withdraw) / Pending (Know Why?) / Paid (View)
 *      <AmountActionRow>s for that type only.
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

import { Divider, Text } from '../atoms';
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

// Section config: which mapper field feeds each row of a type's section.
const EARNING_SECTIONS = [
  {
    type: 'cashback',
    title: 'Cashback',
    confirmed: 'confirmedCashback',
    pending: 'pendingCashback',
    paid: 'paidCashback',
  },
  {
    type: 'rewards',
    title: 'Rewards',
    confirmed: 'confirmedRewards',
    pending: 'pendingRewards',
    paid: 'paidRewards',
  },
] as const;

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
  const { data: earnings, isLoading, isError, refetch } = useEarnings();
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

  // Earning-Status sheets: Pending ("Know Why?") and Paid ("View") for each
  // type. The Withdraw-side sheets (₹0 "Cashback Not Confirmed", payment-in-
  // process) live in useWithdrawGate, shared with Profile.
  const cashbackPendingRef = useRef<EarningStatusSheetRef>(null);
  const cashbackPaidRef = useRef<EarningStatusSheetRef>(null);
  const rewardsPendingRef = useRef<EarningStatusSheetRef>(null);
  const rewardsPaidRef = useRef<EarningStatusSheetRef>(null);
  const pendingRefs = { cashback: cashbackPendingRef, rewards: rewardsPendingRef };
  const paidRefs = { cashback: cashbackPaidRef, rewards: rewardsPaidRef };

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

  // Failed to load (offline / server error) with nothing cached: say so.
  // Falling through showed ₹0 everywhere, which reads as an empty balance.
  if (isError && !earnings) {
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
            <ScreenState
              title="Couldn’t load your earnings"
              body="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => refetch()}
            />
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

          {/* 2. Two sections — Cashback, then Rewards (always shown, even at
              ₹0, so users learn rewards exist). Each: title + Confirmed /
              Pending / Paid rows for that type only. */}
          {EARNING_SECTIONS.map((sec) => (
            <View
              key={sec.type}
              style={{
                paddingHorizontal: spacing[16],
                gap: spacing[12],
              }}
            >
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                {sec.title}
              </Text>
              <AmountActionRow
                iconName="desc-withdrawcash"
                caption="Confirmed"
                loading={loading}
                value={earnings?.[sec.confirmed] ?? '₹0'}
                buttonLabel="Withdraw"
                buttonVariant="solid"
                buttonTone="main"
                // Gate checks this type's confirmed amount (₹0 → "Not
                // Confirmed" sheet); otherwise opens withdraw on its bucket.
                onButtonPress={() => handleWithdraw(sec.type)}
              />
              <AmountActionRow
                iconName="desc-pendingcash"
                caption="Pending"
                loading={loading}
                value={earnings?.[sec.pending] ?? '₹0'}
                buttonLabel="Know Why?"
                buttonVariant="outline"
                buttonTone="main"
                onButtonPress={() => pendingRefs[sec.type].current?.present()}
              />
              <AmountActionRow
                iconName="desc-paid"
                caption="Paid"
                loading={loading}
                value={earnings?.[sec.paid] ?? '₹0'}
                buttonLabel="View"
                buttonVariant="outline"
                buttonTone="main"
                onButtonPress={() => paidRefs[sec.type].current?.present()}
              />
            </View>
          ))}

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

      {/* Pending ("Know Why?") and Paid ("View") sheets, one pair per type. */}
      <EarningStatusSheet
        ref={cashbackPendingRef}
        amount={earnings?.pendingCashback ?? '₹0'}
      />
      <EarningStatusSheet
        ref={cashbackPaidRef}
        variant="paid"
        amount={earnings?.paidCashback ?? '₹0'}
      />
      <EarningStatusSheet
        ref={rewardsPendingRef}
        amount={earnings?.pendingRewards ?? '₹0'}
      />
      <EarningStatusSheet
        ref={rewardsPaidRef}
        variant="paid"
        amount={earnings?.paidRewards ?? '₹0'}
      />
    </View>
  );
}
