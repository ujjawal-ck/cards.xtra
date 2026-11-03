/**
 * MissingCashbackEnterOrderId — screen (Figma 4129:25275,
 * "help/missing-cashback/group-a/enter-order-id-v3").
 *
 * Live: asks for the merchant Order ID, validates it against the store's
 * `orderid_format` regexes (from the cached exit-dates meta), then calls
 * /missingcashback/validate. On success:
 *   • group D (no order amount) → submit the claim with amount "0" and branch
 *     on the response (tracked / queued / collect).
 *   • all other groups → continue to the order-amount step.
 *
 * Imports: Header (back-only), BrandLogoTile, Input, Button (atoms);
 * useExitClickDates (meta), useMissingCashbackActions, flow helpers.
 */
import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, BrandLogoTile, Input, Button } from '../atoms';
import { Header } from '../organisms';
import { useExitClickDates, useMissingCashbackActions } from '../query/useMissingCashback';
import { isOrderIdValid, groupRequiresOrderAmount, decideSubmitOutcome } from '../api/missingCashbackMapper';
import { goToSubmitOutcome } from './missingCashbackResultParams';
import { colors, spacing, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackEnterOrderId'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackEnterOrderId'>;

const CONTENT_GAP = 36;
const INPUT_WIDTH = 328;

export function MissingCashbackEnterOrderId() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { data } = useExitClickDates(draft.storeId); // cached from ChooseDate — for order-id meta
  const meta = data?.meta;
  const { validate, submit } = useMissingCashbackActions();

  const [orderId, setOrderId] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logoSource = draft.storeLogoUri ? { uri: draft.storeLogoUri } : images.stores.myntra31;
  const hint = meta?.orderid_hint_message || (meta?.sample_orderid ? `Order ID looks like ${meta.sample_orderid}` : ' ');

  const onChange = (v: string) => {
    setOrderId(v);
    setError(null);
    if (v && meta?.orderid_format && Object.keys(meta.orderid_format).length > 0) {
      setFormatError(
        isOrderIdValid(v, meta.orderid_format)
          ? null
          : `Enter a correct Order ID — it should look like ${meta.sample_orderid || 'the sample format'}.`,
      );
    } else {
      setFormatError(null);
    }
  };

  const onContinue = async () => {
    if (!orderId.trim()) {
      setError('Please enter your Order ID.');
      return;
    }
    if (meta?.orderid_format && !isOrderIdValid(orderId, meta.orderid_format)) {
      setFormatError(`Enter a correct Order ID — it should look like ${meta.sample_orderid || 'the sample format'}.`);
      return;
    }
    if (!draft.exitDate) {
      setError('Missing the selected date. Please go back and pick a date.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await validate(draft.storeId, draft.exitDate, orderId);
      analytics.track(Events.MISSING_CASHBACK_STEP, { step: 'order_id', group: draft.group });
      // Group D never asks for an amount — submit "0" now and branch.
      if (!groupRequiresOrderAmount(draft.group)) {
        const res = await submit(draft.storeId, draft.exitDate, orderId, '0');
        analytics.track(Events.MISSING_CASHBACK_SUBMIT, { group: draft.group, has_amount: false });
        const draft2 = { ...draft, orderId, orderAmount: '0', queueId: res?.data?.id ? String(res.data.id) : draft.queueId };
        goToSubmitOutcome(navigation, decideSubmitOutcome(res, draft.group), draft2);
      } else {
        navigation.navigate('MissingCashbackEnterAmount', { draft: { ...draft, orderId } });
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'Could not validate your Order ID. Please check and try again.';
      setError(msg);
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
            <Header leading="back" onLeadingPress={() => navigation.goBack()} />

            <View style={{ gap: CONTENT_GAP }}>
              <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
                <BrandLogoTile source={logoSource} size="44" />
                <Text variant="body16Bold" color={colors.text.primary}>
                  {`Now, tell us your ${draft.storeName} Order ID`}
                </Text>
                <Text variant="body14Regular" color={colors.text.secondary}>
                  {hint}
                </Text>
              </View>

              <View style={{ paddingTop: spacing[24], alignItems: 'center', gap: spacing[8] }}>
                <Input
                  size="sm"
                  placeholder="Enter order ID"
                  value={orderId}
                  onChangeText={onChange}
                  autoCapitalize="characters"
                  containerStyle={{ width: INPUT_WIDTH }}
                />
                {formatError || error ? (
                  <Text variant="body12SemiBold" color={colors.feedback.error.default} style={{ width: INPUT_WIDTH }}>
                    {formatError || error}
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
                label="Continue"
                variant="solid"
                tone="second"
                size={52}
                fullWidth
                loading={busy}
                disabled={busy || !!formatError}
                onPress={onContinue}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
