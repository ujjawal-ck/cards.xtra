/**
 * ProfileScreen — Figma profile/landing (4439:291686).
 *
 * Pure composition of existing components — no new molecules:
 *   - <Masthead variant="profile">  (organism, owns its own Edit
 *                                    Profile Button + avatar etc.)
 *   - <ListRow type="menu-option">  (molecule, ×8 across three lists)
 *   - <Divider style="solid">       (atom, separators between rows)
 *   - <Button variant="destructive">  red pill Logout trigger (atom) —
 *     opens the LogoutConfirmSheet rather than signing out directly.
 *
 * Navigation note: src/navigation/TabNavigator.tsx already wires
 * ProfileScreen to the Profile tab and floats the BottomNav via its
 * own `tabBar` prop, so no <BottomNav> is rendered here (same
 * pattern as Earnings / Offers).
 */
import React, { useRef } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { Text, Divider } from '../atoms';
import { ListRow } from '../molecules';
import { Masthead, LogoutConfirmSheet, StaggeredEntrance } from '../organisms';
import type { LogoutConfirmSheetRef } from '../organisms';
import {
  colors,
  spacing,
  radius,
  elevation,
  borderWidth,
} from '../tokens';
import { useProfile } from '../query/useProfile';
import { useAuth } from '../auth/AuthContext';
import { analytics, Events } from '../analytics';
import { nameInitials } from '../lib/nameInitials';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useWithdrawGate } from './withdraw/useWithdrawGate';
import { useFloatingNavClearance } from '../navigation/floatingNav';

// Profile sits inside the bottom-tab navigator, which is itself a screen of
// the root stack. To push a root-stack route (MissingCashbackDidYouShop or
// ReviewUs) the screen needs both nav contexts stitched together.
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  // Scroll padding that clears the floating tab bar (+ Android nav bar).
  const navClearance = useFloatingNavClearance();
  const navigation = useNavigation<Nav>();
  const { data: profile } = useProfile();
  const { signOut, displayName } = useAuth();
  const logoutSheetRef = useRef<LogoutConfirmSheetRef>(null);
  const insets = useSafeAreaInsets();

  // Same entry check as Earnings' Withdraw button (₹0 / payout settling).
  // Navigating straight to WithdrawStack let a ₹0 account open the payout
  // methods.
  const { startWithdraw, gateSheets } = useWithdrawGate({
    onProceed: () => navigation.navigate('WithdrawStack'),
    onBrowseDeals: () => navigation.navigate('Offers'),
  });

  // Display values from the real profile (fall back while loading). The local
  // displayName (chosen in the first-time prompt, or auto-assigned on skip)
  // wins over the backend fullname — there's no profile-update API, so the
  // name the user picked on Home lives client-side.
  const name = displayName || profile?.fullname || undefined;
  const email = profile?.email;
  const mobile = profile?.mobileNumber ? String(profile.mobileNumber) : undefined;
  // "email · 2550" (last 4 of the mobile), matching the masthead spec.
  const contact = email
    ? mobile
      ? `${email} · ${mobile.slice(-4)}`
      : email
    : undefined;
  // First + last initial ("Praveen Singh" → "PS"); single names → one letter.
  const avatarInitial = nameInitials(name);

  // Track a profile menu-row tap, then run its action. `item` is a stable
  // analytics key (not the visible label) so renames don't break funnels.
  const onMenu = (item: string, action?: () => void) => () => {
    analytics.track(Events.PROFILE_MENU_SELECT, { item });
    action?.();
  };

  const handleLogout = async () => {
    await signOut();
    // Clear the stack and send the user to the login/sign-up screen.
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: navClearance,
          }}
        >
          {/* Staggered entrance — masthead + each list card fade + rise into
              place in sequence, replaying on every tab focus. Section `gap`
              moved here so it spaces the cascade's wrapper rows. */}
          <StaggeredEntrance style={{ gap: spacing[16] }}>
          {/* 1. Masthead — REUSED 'profile' variant (defaults match
              spec: Manikandan / maan@gmail.com · 8324 + saffron
              avatar + cobalt Edit Profile via the Button atom). */}
          <Masthead
            variant="profile"
            name={name}
            contact={contact}
            avatarInitial={avatarInitial}
            onEditProfile={onMenu('edit_profile', () => navigation.navigate('AccountSettings'))}
          />

          {/* 2. List #1 — 4 rows (earnings, payments, history, missing) */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[16],
                  paddingHorizontal: spacing[12],
                  gap: spacing[12],
                },
                elevation.light.xs,
              ]}
            >
              {/* `nav-*` icons bake a white fill for the dark tab bar and
                  ignore the tint — invisible on this white card. Use a
                  tintable outline icon so it renders like the others. */}
              <ListRow
                type="menu-option"
                icon="feat-savings-outline"
                title="My Earnings"
                onPress={onMenu('earnings', () => navigation.navigate('Earnings'))}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="wallet-outline"
                title="Withdraw Cashback"
                onPress={onMenu('withdraw', startWithdraw)}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="clock-outline"
                title="Payment History"
                // Not linked yet: ProfilePaymentHistory still renders Figma
                // sample payouts (₹80.80 …), not /payment/history data, so
                // opening it would show users fake payments. Wire it once the
                // live history API is mapped.
                onPress={onMenu('payment_history')}
              />
              <Divider style="solid" />
              {/* `desc-*` icons bake multi-colour illustrations; on this
                  list it clashed with the clean outline icons. Use a
                  tintable outline glyph so it matches the row theme. */}
              <ListRow
                type="menu-option"
                icon="clipboard-search-outline"
                title="Missing Cashback"
                onPress={onMenu('missing_cashback', () =>
                  navigation.navigate('MissingCashbackDidYouShop', { backTo: 'back' })
                )}
              />
            </View>
          </View>

          {/* 3. List #2 — 3 rows (help, call, review) */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  paddingVertical: spacing[16],
                  paddingHorizontal: spacing[12],
                  gap: spacing[12],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="feat-rewards-outline"
                title="Never Miss Cashback"
                onPress={onMenu('cashback_guard', () => navigation.navigate('CashbackGuard'))}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="headset-outline"
                title="Get Help"
                onPress={onMenu('get_help', () => navigation.navigate('GetHelp'))}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="message-outline"
                title="Call Us"
                onPress={onMenu('call_us', () => Linking.openURL('tel:+918527264999'))}
              />
              <Divider style="solid" />
              <ListRow
                type="menu-option"
                icon="star-outline"
                title="Review Us"
                onPress={onMenu('review_us', () => navigation.navigate('ReviewUs'))}
              />
            </View>
          </View>

          {/* 4. List #3 — 1 row (privacy) */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.xl,
                  padding: spacing[12],
                },
                elevation.light.xs,
              ]}
            >
              <ListRow
                type="menu-option"
                icon="desc-approve"
                title="Privacy Policy"
                onPress={onMenu('privacy_policy', () => navigation.navigate('PrivacyPolicy'))}
              />
            </View>
          </View>

          {/* 5. Logout — small red-OUTLINE pill (red border + red label,
              transparent fill). The Button atom has no destructive-outline
              variant, so this is a token-bound custom pill. Tapping it opens
              the confirmation sheet rather than signing out immediately. */}
          <View style={{ paddingHorizontal: spacing[16], alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Logout"
              onPress={() => logoutSheetRef.current?.present()}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                // 36 = Button size-36 height; not on the spacing scale (the
                // Button atom hardcodes the same value for the same reason).
                height: 36,
                paddingHorizontal: spacing[24],
                borderRadius: radius.full,
                borderWidth: borderWidth.thin,
                borderColor: colors.action.destructive.default,
                backgroundColor: colors.surface.default,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="body12Medium" color={colors.action.destructive.default}>
                Logout
              </Text>
            </Pressable>
          </View>
          </StaggeredEntrance>
        </ScrollView>
      </SafeAreaView>

      {/* Status-bar backing: the list scrolls edge-to-edge, so without this
          the masthead's Edit Profile button slid under (and over) the
          status-bar icons. Same colour as the screen background. */}
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

      {/* Logout confirmation — opened by the Logout row; "Yes" signs out. */}
      <LogoutConfirmSheet ref={logoutSheetRef} onConfirm={handleLogout} />

      {/* Withdraw gate sheets (₹0 / payout settling) — from useWithdrawGate. */}
      {gateSheets}
    </View>
  );
}
