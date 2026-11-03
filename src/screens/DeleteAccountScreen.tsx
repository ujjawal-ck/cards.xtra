/**
 * DeleteAccountScreen — "Delete Account" landing (Figma 3396:28372,
 * file P7UcoZYBnfyefmJIA8wcM7). Reached from Account Settings → Delete
 * Account.
 *
 * Top → bottom:
 *   1. Header (back) "Delete Account"                 — REUSED organism.
 *   2. Title "We Hate to See You Leave" (heading18SemiBold) + subtitle
 *      "You will lose your Cashback and Rewards" (body14Regular).
 *   3. Pleading-face emoji 🥺 — image placeholder (no asset shipped, per
 *      the project's emoji-for-images convention).
 *   4. "Terms & conditions" (body14SemiBold) + the full T&C body
 *      (body14Regular / text.secondary), scrollable.
 *   5. Sticky footer: "I agree to the terms & conditions" checkbox row
 *      + action row [ outline "Delete Account" | solid "Keep My Account" ].
 *      "Delete Account" stays tappable (Figma 3919:38344): tapping it
 *      while the box is unchecked shows the red "Please checkmark the box
 *      first." line above the checkbox instead of advancing.
 *      "Keep My Account" simply returns.
 *
 * Built inline (not via the FooterButtons organism) because the
 * destructive secondary button must be gated on the checkbox, which
 * FooterButtons doesn't expose. Reuses the TermsAndConditions molecule
 * for the consent row and the Button atom for both actions.
 *
 * Token map:
 *   screen bg        → colors.background.default
 *   content px / gap → spacing[16] / spacing[24]
 *   title            → heading18SemiBold / text.primary
 *   subtitle         → body14Regular / text.primary
 *   tnc heading      → body14SemiBold / text.primary
 *   tnc body         → body14Regular / text.secondary
 *   footer bar       → surface.default + elevation.light.up
 *   action buttons   → Button tone='second' (cobalt) — outline + solid
 */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button } from '../atoms';
import { Header } from '../organisms';
import { TermsAndConditions } from '../molecules';
import { colors, spacing, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DeleteAccount'>;

// Emoji stands in for the Figma image asset. Size lives here as a
// component-spec value (it's an image dimension, not body type — same
// pattern as OtpInput's slot dims).
const EMOJI_SIZE = 96;

// Full "Final Account Deletion" T&C copy, read live from Figma 3396:28583.
const TNC_PARAGRAPHS = [
  'Upon initiating the account deletion process, your account will be permanently removed within 60 days.',
  'This action will result in the loss of access to all associated data, including your earnings history, saved payment details, and any other personalized information.',
  'Please export your payment history from the Payment History page, as you would not be able to export it post account deletion.',
  'CashKaro might or might not give you New user offers if you sign up again using the same mobile number and/or email id.',
  'Any pending or confirmed cashback/rewards/bonus that you have accrued will be automatically cancelled, and you will not have the option to request it. Hence, please ensure you withdraw your confirmed earnings before deleting your account.',
  'Any pending missing cashback or reward tickets would become null and void and we will not be able to pay you.',
  'If you have any payment requests currently in progress, they will continue to be processed. However, please be aware that CashKaro will not be able to track the status of these requests after your account has been deleted.',
  'Furthermore, any outstanding queries you may have regarding cashback, rewards, missing cashback, or any other matters will be closed, and unfortunately, we will not be able to provide resolutions for them.',
  'You might continue to receive offers and communication from us for a period of 60 days. Post that, we will not send you any promotional communication.',
  'If you have any referral user under your account, post account deletion you would not receive any referral cashback.',
  'Reach out to us at contact@cashkaro.com in case you have any more queries.',
];

export function DeleteAccountScreen() {
  const navigation = useNavigation<Nav>();
  const [agreed, setAgreed] = useState(false);
  // Set when "Delete Account" is tapped with the box unchecked; cleared as
  // soon as the box is ticked (Figma 3919:38344 checkbox-error state).
  const [showConsentError, setShowConsentError] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Delete Account"
          onLeadingPress={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing[24],
            paddingTop: spacing[16],
            paddingBottom: spacing[24],
          }}
        >
          {/* Title + subtitle */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
            <Text variant="heading18SemiBold" color={colors.text.primary}>
              We Hate to See You Leave
            </Text>
            <Text variant="body14Regular" color={colors.text.primary}>
              You will lose your Cashback and Rewards
            </Text>
          </View>

          {/* Emoji image placeholder */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{ fontSize: EMOJI_SIZE, lineHeight: EMOJI_SIZE * 1.2 }}
              accessibilityLabel="Pleading face"
            >
              🥺
            </Text>
          </View>

          {/* Terms & conditions */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
            <Text variant="body14SemiBold" color={colors.text.primary}>
              Terms & conditions
            </Text>
            <View style={{ gap: spacing[16] }}>
              {TNC_PARAGRAPHS.map((para, i) => (
                <Text
                  key={i}
                  variant="body14Regular"
                  color={colors.text.secondary}
                >
                  {para}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer — consent checkbox + gated actions. */}
        <View style={[{ backgroundColor: colors.surface.default }, elevation.light.up]}>
          <TermsAndConditions
            checked={agreed}
            onChange={(next) => {
              setAgreed(next);
              if (next) setShowConsentError(false);
            }}
            state={showConsentError ? 'error' : 'default'}
            label="I agree to the terms & conditions"
            placement="sticky"
            body="1-line"
          />
          <View
            style={{
              flexDirection: 'row',
              gap: spacing[12],
              paddingHorizontal: spacing[16],
              paddingTop: spacing[12],
              paddingBottom: spacing[16],
            }}
          >
            <Button
              label="Delete Account"
              variant="outline"
              tone="second"
              size={44}
              onPress={() => {
                if (!agreed) {
                  setShowConsentError(true);
                  return;
                }
                analytics.track(Events.ACCOUNT_DELETE_START);
                navigation.navigate('DeleteAccountOtp');
              }}
            />
            <View style={{ flex: 1 }}>
              <Button
                label="Keep My Account"
                variant="solid"
                tone="second"
                size={44}
                fullWidth
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
