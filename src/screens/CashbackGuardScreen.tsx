/**
 * NeverMissCashbackScreen — opt-in setup for the Android "Never Miss Cashback"
 * reminder (route name kept as `CashbackGuard`).
 *
 * Play compliance shape (Prominent Disclosure & Consent):
 *   1. A prominent disclosure card states exactly what's detected (which of the
 *      3 partner apps is open) and what is NOT (no screen content) — shown
 *      BEFORE any permission is requested.
 *   2. A master ON/OFF toggle is the affirmative opt-in. Turning it on reveals
 *      the permission steps; turning it off stops the service and persists the
 *      choice.
 *   3. Two permissions, both granted via system settings (we deep-link + re-read
 *      on focus): Usage access (detect the app) + Notifications (deliver the
 *      reminder). No overlay permission — the reminder is a push notification.
 *
 * Android-only. On iOS / Expo Go the native module isn't linked → "not
 * available" note (isSupported === false).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

import { Text, Button, Switch, Divider } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, radius, iconSize, elevation, gradients } from '../tokens';
import * as CashbackGuard from '../../modules/cashback-guard';
import { useCashbackGuardSync } from '../query/useCashbackGuard';

const SUPPORTED_APPS = ['Amazon', 'Flipkart', 'AJIO'];
// SecureStore key persisting the user's opt-in so OFF stays OFF across launches.
const ENABLED_KEY = 'never_miss_cashback_enabled';
const PRIVACY_URL = 'https://cashkaro.com/privacy-policy';

export function CashbackGuardScreen() {
  const navigation = useNavigation();
  // Keep the native service's tracking URLs in sync with the logged-in user.
  useCashbackGuardSync();

  const [enabled, setEnabled] = useState(false);
  const [usageOn, setUsageOn] = useState(false);
  const [notifsOn, setNotifsOn] = useState(false);

  // Load the persisted opt-in once.
  useEffect(() => {
    SecureStore.getItemAsync(ENABLED_KEY)
      .then((v) => setEnabled(v === '1'))
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    setUsageOn(CashbackGuard.isUsageAccessGranted());
    setNotifsOn(CashbackGuard.areNotificationsEnabled());
  }, []);

  // Re-check whenever the screen regains focus (after returning from settings).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const allOn = usageOn && notifsOn;

  // Drive the native service from (opt-in × permissions): run only when the
  // user has opted in AND both permissions are granted; otherwise stop it.
  useEffect(() => {
    if (enabled && allOn) CashbackGuard.startGuard();
    else if (!enabled) CashbackGuard.stopGuard();
  }, [enabled, allOn]);

  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    SecureStore.setItemAsync(ENABLED_KEY, next ? '1' : '0').catch(() => {});
    if (!next) CashbackGuard.stopGuard();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Never Miss Cashback"
          onLeadingPress={() => navigation.goBack()}
        />
        <ScrollView contentContainerStyle={{ padding: spacing[20], gap: spacing[20] }}>
          {/* Branded hero — a gold ₹ coin (matches the cashback pip) over the
              value proposition, so the screen reads on-brand rather than a
              plain grey form. */}
          <View style={{ gap: spacing[12] }}>
            <LinearGradient
              colors={gradients.amberSaffron.colors}
              start={gradients.amberSaffron.start}
              end={gradients.amberSaffron.end}
              style={{
                width: iconSize[56],
                height: iconSize[56],
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                ...elevation.brand.sm,
              }}
            >
              <Text variant="heading28Bold" color={colors.text.inverse}>
                ₹
              </Text>
            </LinearGradient>
            <View style={{ gap: spacing[8] }}>
              <Text variant="heading24Bold" color={colors.text.primary}>
                Never miss your cashback again
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                Get an instant alert to activate cashback the moment you open
                Amazon, Flipkart or AJIO — one tap and your order is tracked.
                Don’t leave money on the table.
              </Text>
            </View>
          </View>

        {!CashbackGuard.isSupported ? (
          // iOS / Expo Go fallback.
          <View
            style={{
              backgroundColor: colors.surface.default,
              borderRadius: radius.xl,
              padding: spacing[20],
              ...elevation.light.sm,
            }}
          >
            <Text variant="body14Medium" color={colors.text.primary}>
              This feature is available on the Android app build only.
            </Text>
            <Text
              variant="body12Regular"
              color={colors.text.tertiary}
              style={{ marginTop: spacing[4] }}
            >
              Open this screen from the installed Android app to set it up.
            </Text>
          </View>
        ) : (
          <>
            {/* Master opt-in toggle — the affirmative consent. */}
            <View
              style={{
                backgroundColor: colors.surface.default,
                borderRadius: radius.xl,
                padding: spacing[20],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[16],
                ...elevation.light.sm,
              }}
            >
              <View style={{ flex: 1, gap: spacing[2] }}>
                <Text variant="body16SemiBold" color={colors.text.primary}>
                  Never Miss Cashback
                </Text>
                <Text variant="body12Regular" color={colors.text.secondary}>
                  {enabled
                    ? allOn
                      ? 'On — reminders are active'
                      : 'On — finish the steps below'
                    : 'Off'}
                </Text>
              </View>
              <Switch value={enabled} onValueChange={toggle} />
            </View>

            {/* Prominent disclosure — shown BEFORE any permission request. */}
            <View
              style={{
                backgroundColor: colors.surface.default,
                borderRadius: radius.xl,
                padding: spacing[20],
                gap: spacing[8],
                ...elevation.light.sm,
              }}
            >
              <Text variant="body14SemiBold" color={colors.text.primary}>
                What this does
              </Text>
              <Text variant="body12Regular" color={colors.text.secondary}>
                Cards.xtra detects only which app is open (Amazon, Flipkart or
                AJIO) and sends you a reminder notification to activate cashback.
              </Text>
              <Text variant="body12SemiBold" color={colors.text.primary}>
                It never reads, records, or stores your screen content,
                keystrokes, or browsing — only which of these three apps is in
                the foreground.
              </Text>
              <Text
                variant="body12SemiBold"
                color={colors.text.link}
                onPress={() => Linking.openURL(PRIVACY_URL)}
                style={{ marginTop: spacing[4] }}
              >
                Read our Privacy Policy
              </Text>
            </View>

            {/* Permission steps — only after the user opts in. */}
            {enabled ? (
              <>
                <View
                  style={{
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.xl,
                    padding: spacing[20],
                    gap: spacing[16],
                    ...elevation.light.sm,
                  }}
                >
                  <PermissionStep
                    step={1}
                    title="Usage access"
                    subtitle="Lets the app notice when you open Amazon, Flipkart or AJIO."
                    granted={usageOn}
                    actionLabel="Open Usage access settings"
                    onAction={CashbackGuard.openUsageAccessSettings}
                  />
                  <Divider />
                  <PermissionStep
                    step={2}
                    title="Notifications"
                    subtitle="Lets us send you the one-tap cashback reminder."
                    granted={notifsOn}
                    actionLabel="Open notification settings"
                    onAction={CashbackGuard.openNotificationSettings}
                  />
                </View>

                <View
                  style={{
                    backgroundColor: allOn
                      ? colors.feedback.success.subtle
                      : colors.background.emphasis,
                    borderRadius: radius.lg,
                    padding: spacing[16],
                  }}
                >
                  <Text
                    variant="body14SemiBold"
                    color={
                      allOn
                        ? colors.feedback.success.text
                        : colors.action.primary.default
                    }
                  >
                    {allOn
                      ? '✓ You’re all set — we’ll remind you to grab your cashback'
                      : 'Grant both to switch reminders on'}
                  </Text>
                </View>

                <Button
                  label="Re-check permissions"
                  variant="outline"
                  tone="second"
                  fullWidth
                  onPress={refresh}
                />
              </>
            ) : null}
          </>
        )}

        {/* Scope note */}
        <View style={{ gap: spacing[4], paddingHorizontal: spacing[4] }}>
          <Text variant="caption10SemiBold" color={colors.text.tertiary}>
            WORKS WITH
          </Text>
          <Text variant="body12Regular" color={colors.text.tertiary}>
            {SUPPORTED_APPS.join(' · ')}
          </Text>
          <Text
            variant="body12Regular"
            color={colors.text.tertiary}
            style={{ marginTop: spacing[8] }}
          >
            You can turn this off anytime from this screen.
          </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// One permission row: number badge + copy + status pill + action button.
// ---------------------------------------------------------------------------
function PermissionStep({
  step,
  title,
  subtitle,
  granted,
  actionLabel,
  onAction,
}: {
  step: number;
  title: string;
  subtitle: string;
  granted: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={{ gap: spacing[12] }}>
      <View style={{ flexDirection: 'row', gap: spacing[12] }}>
        <View
          style={{
            width: spacing[24],
            height: spacing[24],
            borderRadius: radius.full,
            backgroundColor: granted
              ? colors.feedback.success.default
              : colors.action.primary.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="body12SemiBold" color={colors.text.inverse}>
            {granted ? '✓' : String(step)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="body16SemiBold" color={colors.text.primary}>
            {title}
          </Text>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {subtitle}
          </Text>
        </View>
      </View>
      {!granted ? (
        <Button
          label={actionLabel}
          variant="solid"
          size={36}
          fullWidth
          onPress={onAction}
        />
      ) : (
        <Text variant="body12Medium" color={colors.feedback.success.text}>
          Granted
        </Text>
      )}
    </View>
  );
}
