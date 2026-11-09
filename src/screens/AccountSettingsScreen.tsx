/**
 * AccountSettingsScreen — "Edit Profile" (Figma 3396:26619 + the
 * mobile/email-change saved-success state 3395:23921, file
 * P7UcoZYBnfyefmJIA8wcM7). Reached from Profile → Edit Profile.
 *
 * ── Figma note ──
 * The section-title node literally reads "Personal Detailz" (placeholder
 * typo). Rendering the correct product copy "Personal Details".
 *
 * Top → bottom:
 *   1. Header (back) "Account Settings"               — REUSED organism.
 *   2. "Personal Details" section title (body16SemiBold).
 *   3. Three fields (filled, trailing edit pencil):
 *        • Full Name  — inline-editable.
 *        • Email      — tapping launches the email-change OTP flow.
 *        • Mobile     — tapping launches the mobile-change OTP flow.
 *      Email + Mobile are sensitive, so they're display-only here and any
 *      change is gated behind the verify-identity → enter-new → verify-new
 *      flow (EditContact* screens).
 *   4. "Delete Account" red underlined link → DeleteAccount screen.
 *   5. Success InlineMessage (only after returning from a completed
 *      email/mobile change) — tone 'success' + check icon.
 *   6. Sticky "Save Changes" footer (cobalt/accent) — enabled only once
 *      the Full Name is edited (the OTP-gated changes save themselves, so
 *      they don't drive this button — matching the Figma success state
 *      where Save Changes stays disabled).
 *
 * Token map:
 *   screen bg        → colors.background.default
 *   content px / gap → spacing[16] / spacing[24]
 *   section title    → body16SemiBold / text.primary
 *   field pencil     → trailingIcon 'edit-outline'
 *   delete link      → body12Medium / feedback.error.default (underline)
 *   success message  → <InlineMessage tone="success" icon="check-circle-filled">
 *   save footer      → <FooterButtons buttons="single" color="second">
 *
 * Demo: there is no live "update profile" endpoint wired, so Save Changes
 * just returns to the previous screen, and the email/mobile change is
 * reflected optimistically from the flow's nav params.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizeIndianMobile } from '../lib/phone';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { InlineMessage } from '../molecules';
import { colors, spacing } from '../tokens';
import { useProfile } from '../query/useProfile';
import { FIELD_COPY } from './editContact';
import type { RootStackParamList, EditContactField } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountSettings'>;
type Rt = RouteProp<RootStackParamList, 'AccountSettings'>;

/** Mask a mobile number to "989****087" (first 3 · **** · last 3) of the
 *  10-digit national number. The API returns it with the 91 country code
 *  ("919876543210"), which used to render as a misleading "919****210". */
function maskMobile(raw?: string): string {
  const digits = normalizeIndianMobile(raw ?? '');
  if (digits.length < 7) return raw ?? '';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export function AccountSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { data: profile } = useProfile();

  // A completed email/mobile change comes back via nav params; it drives
  // both the success message and the optimistic field value.
  const updated = params?.updated;
  const updatedValue = params?.newValue;

  // Full Name is the only inline-editable field — seed it from the live
  // profile (re-seeding if the profile loads after mount).
  const [name, setName] = useState(profile?.fullname ?? '');
  useEffect(() => {
    setName(profile?.fullname ?? '');
  }, [profile?.fullname]);

  // Email / Mobile are display-only here; show the freshly-changed value
  // when returning from the flow, otherwise the live profile value.
  const email =
    updated === 'email' && updatedValue ? updatedValue : profile?.email ?? '';
  const mobile = maskMobile(
    updated === 'mobile' && updatedValue ? updatedValue : profile?.mobileNumber
  );

  const dirty = name !== (profile?.fullname ?? '');

  const launchChange = (field: EditContactField) =>
    navigation.navigate('EditContactVerifyIdentity', { field });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      {/* 'bottom' too: the sticky Save button sat under the Android nav bar. */}
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Account Settings"
          onLeadingPress={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: spacing[24],
            paddingTop: spacing[24],
            paddingBottom: spacing[24],
          }}
        >
          {/* Section title — Figma reads "Personal Detailz" (typo). */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <Text variant="body16SemiBold" color={colors.text.primary}>
              Personal Details
            </Text>
          </View>

          {/* Fields */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[24] }}>
            {/* Full Name — inline editable. (Figma fields are sm: 48px box,
                14px Regular value — see node 3396:26627.) */}
            <Input
              label="Full Name"
              size="sm"
              value={name}
              onChangeText={setName}
              trailingIcon="edit-outline"
              autoCapitalize="words"
            />

            {/* Email — display-only; pencil/row launches the change flow. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change email"
              onPress={() => launchChange('email')}
            >
              <View pointerEvents="none">
                <Input
                  label="Email"
                  size="sm"
                  value={email}
                  // Read-only display: show the START of the value (a long email
                  // used to render scrolled to its end, "07879902@…").
                  selection={{ start: 0, end: 0 }}
                  onChangeText={() => undefined}
                  trailingIcon="edit-outline"
                />
              </View>
            </Pressable>

            {/* Mobile Number — display-only; pencil/row launches the flow. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change mobile number"
              onPress={() => launchChange('mobile')}
            >
              <View pointerEvents="none">
                <Input
                  label="Mobile Number"
                  size="sm"
                  value={mobile}
                  // Read-only display: show the START of the value (a long email
                  // used to render scrolled to its end, "07879902@…").
                  selection={{ start: 0, end: 0 }}
                  onChangeText={() => undefined}
                  trailingIcon="edit-outline"
                />
              </View>
            </Pressable>
          </View>

          {/* Delete Account link */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete Account"
              hitSlop={spacing[8]}
              onPress={() => navigation.navigate('DeleteAccount')}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text
                variant="body12Medium"
                color={colors.feedback.error.default}
                style={{ textDecorationLine: 'underline' }}
              >
                Delete Account
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Success message — only after a completed email/mobile change. */}
        {updated ? (
          <View style={{ paddingHorizontal: spacing[16], paddingBottom: spacing[12] }}>
            <InlineMessage
              tone="success"
              icon="check-circle-filled"
              message={FIELD_COPY[updated].successMessage}
            />
          </View>
        ) : null}

        {/* Sticky Save Changes — cobalt/accent, disabled until name changes. */}
        <FooterButtons
          buttons="single"
          color="second"
          size={52}
          shadow="off"
          primaryLabel="Save Changes"
          primaryDisabled={!dirty}
          onPrimary={() => navigation.goBack()}
        />
      </SafeAreaView>
    </View>
  );
}
