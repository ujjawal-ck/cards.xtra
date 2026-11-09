/**
 * MissingCashbackHelp — "Did You Shop?" intake landing (Figma 3424:71413).
 *
 * The entry point for the missing-cashback help flow (reached from Profile /
 * Earnings / Get Help). Layout on a background.muted page:
 *   1. Cobalt "Missing Cashback?" hero (MissingCashbackMasthead).
 *   2. "We are here to help." intro block.
 *   3. A white card: "Did You Shop?" with a Yes / No choice.
 *
 * Branching:
 *   - Yes → if the user has retailer visits in the last 30 days
 *           (useRetailers) → the live "Where did you shop?" list
 *           (MissingCashbackWhereDidYouShop). Otherwise → the no-visits Oops
 *           screen (MissingCashbackOops). The Yes button shows a spinner until
 *           the retailer query settles so the branch is never guessed.
 *   - No  → the WhatWentWrongFeedbackSheet. Submitting it records the reasons
 *           as an analytics event (no backend for this signal) and shows the
 *           FeedbackAppreciatedSheet.
 */
import React, { useRef } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetModal as BottomSheetModalRef } from '@gorhom/bottom-sheet';

import { Text, Button } from '../atoms';
import {
  MissingCashbackMasthead,
  WhatWentWrongFeedbackSheet,
  FeedbackAppreciatedSheet,
} from '../organisms';
import { useRetailers } from '../query/useMissingCashback';
import { colors, spacing, radius, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackHelp'>;

// Fixed Yes/No button width per Figma (3437:72902) — both buttons hug this
// width and stack centered in the card.
const CHOICE_BTN_W = 184;

export function MissingCashbackHelp() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Drives the Yes branch — empty/error retailer list ⇒ the Oops screen.
  const { data: retailers, isLoading, isError, refetch } = useRetailers();

  const feedbackRef = useRef<BottomSheetModalRef>(null);
  const successRef = useRef<BottomSheetModalRef>(null);

  const onYes = () => {
    if (isLoading) return; // button shows a spinner; wait for the query
    // A failed lookup is not "no visits": it used to send people to the Oops
    // screen saying they hadn't shopped via CashKaro in 30 days.
    if (isError) {
      Alert.alert('Couldn’t check your store visits', 'Check your connection and try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try again', onPress: () => refetch() },
      ]);
      return;
    }
    const hasVisits = (retailers?.length ?? 0) > 0;
    analytics.track(Events.MISSING_CASHBACK_STEP, {
      step: 'did_you_shop',
      answer: 'yes',
      has_visits: hasVisits,
    });
    navigation.navigate(
      hasVisits ? 'MissingCashbackWhereDidYouShop' : 'MissingCashbackOops'
    );
  };

  const onNo = () => {
    analytics.track(Events.MISSING_CASHBACK_STEP, {
      step: 'did_you_shop',
      answer: 'no',
    });
    feedbackRef.current?.present();
  };

  const onSubmitFeedback = (reasons: string[]) => {
    analytics.track(Events.MISSING_CASHBACK_FEEDBACK, {
      reasons: reasons.join(', ').slice(0, 100),
      reason_count: reasons.length,
    });
    // Hand off to the thank-you sheet once the feedback sheet has closed.
    successRef.current?.present();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing[24],
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {/* 1. Cobalt hero */}
        <MissingCashbackMasthead onBack={() => navigation.goBack()} />

        {/* 2. Intro block */}
        <View
          style={{
            paddingHorizontal: spacing[16],
            gap: spacing[4],
          }}
        >
          <Text variant="body16SemiBold" color={colors.text.primary}>
            We are here to help.
          </Text>
          <Text variant="body14Regular" color={colors.text.primary}>
            Please follow these simple steps to help us track your cashback
            (takes seconds only).
          </Text>
        </View>

        {/* 3. "Did You Shop?" card */}
        <View style={{ paddingHorizontal: spacing[16] }}>
          <View
            style={[
              {
                backgroundColor: colors.surface.default,
                borderRadius: radius.xl,
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[40],
                gap: spacing[24],
                alignItems: 'center',
              },
              elevation.light.xs,
            ]}
          >
            <Text variant="heading24Bold" color={colors.text.primary} align="center">
              Did You Shop?
            </Text>

            <View style={{ gap: spacing[12], alignItems: 'center' }}>
              <Button
                label="Yes"
                variant="solid"
                tone="second"
                size={52}
                loading={isLoading}
                onPress={onYes}
                style={{ width: CHOICE_BTN_W }}
              />
              <Button
                label="No"
                variant="outline"
                tone="second"
                size={52}
                onPress={onNo}
                style={{ width: CHOICE_BTN_W }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* "No" → feedback checklist → thank-you. Submitting the first presents
          the second (after it dismisses). */}
      <WhatWentWrongFeedbackSheet ref={feedbackRef} onSubmit={onSubmitFeedback} />
      <FeedbackAppreciatedSheet ref={successRef} />
    </View>
  );
}
