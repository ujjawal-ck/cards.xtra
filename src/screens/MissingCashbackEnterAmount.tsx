/**
 * MissingCashbackEnterAmount — screen (Figma 4129:25287,
 * "help/missing-cashback/group-a/enter-amount").
 *
 * Live: the final input before submit. On Continue it POSTs the claim to the
 * queue (validate already passed at the order-id step), then branches on the
 * response (decideSubmitOutcome):
 *   • cashback found / resolved / under-tracking → result screen
 *   • Pending + B1 → New/Existing user · C1 → category · C2 → invoice upload
 *   • otherwise → "added to queue" result
 *
 * Imports: Header (back-only), BrandLogoTile, Input, Button (atoms);
 * useMissingCashbackActions, flow helpers.
 */
import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, BrandLogoTile, Input, Button } from '../atoms';
import { Header } from '../organisms';
import { useMissingCashbackActions } from '../query/useMissingCashback';
import { decideSubmitOutcome } from '../api/missingCashbackMapper';
import { goToSubmitOutcome } from './missingCashbackResultParams';
import { colors, spacing, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackEnterAmount'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackEnterAmount'>;

const CONTENT_GAP = 36;
const INPUT_WIDTH = 328;

export function MissingCashbackEnterAmount() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { submit, refreshClaims } = useMissingCashbackActions();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logoSource = draft.storeLogoUri ? { uri: draft.storeLogoUri } : images.stores.myntra31;

  const onContinue = async () => {
    const value = amount.trim();
    if (!value || !(Number(value) > 0)) {
      setError('Please enter the amount you paid.');
      return;
    }
    if (!draft.exitDate || !draft.orderId) {
      setError('Missing claim details. Please restart from the retailer list.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await submit(draft.storeId, draft.exitDate, draft.orderId, value);
      analytics.track(Events.MISSING_CASHBACK_SUBMIT, { group: draft.group, has_amount: true });
      refreshClaims();
      const draft2 = { ...draft, orderAmount: value, queueId: res?.data?.id ? String(res.data.id) : draft.queueId };
      goToSubmitOutcome(navigation, decideSubmitOutcome(res, draft.group), draft2);
    } catch (e) {
      setError((e as Error)?.message || 'Could not submit your claim. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, gap: spacing[24] }}>
            <Header leading="back" title="Did You Shop?" onLeadingPress={() => navigation.goBack()} />

            <View style={{ gap: CONTENT_GAP }}>
              <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
                <BrandLogoTile source={logoSource} size="44" />
                <Text variant="body16Bold" color={colors.text.primary}>
                  {/* Figma 4129:26724 */}
                  Almost there! Tell us your order amount
                </Text>
                <Text variant="body14Regular" color={colors.text.secondary}>
                  Enter the amount you paid after discounts
                </Text>
              </View>

              <View style={{ paddingTop: spacing[24], alignItems: 'center', gap: spacing[8] }}>
                <Input
                  size="sm"
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    setError(null);
                  }}
                  containerStyle={{ width: INPUT_WIDTH }}
                />
                {error ? (
                  <Text variant="body12SemiBold" color={colors.feedback.error.default} style={{ width: INPUT_WIDTH }}>
                    {error}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ flex: 1 }} />

            <View
              style={[
                {
                  backgroundColor: colors.surface.default,
                  paddingTop: spacing[8],
                  paddingBottom: spacing[16],
                  paddingHorizontal: spacing[16],
                },
                elevation.light.up,
              ]}
            >
              <Button
                label="Submit"
                variant="solid"
                tone="second"
                size={52}
                fullWidth
                loading={busy}
                disabled={busy}
                onPress={onContinue}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
