/**
 * EditContactEnterNewScreen — step B of the email / mobile change flow
 * (Figma 3395:23867). Collects the new email or mobile number, then sends
 * an OTP to verify it.
 *
 * Top → bottom:
 *   1. Header (back) "Account Settings"               — REUSED organism.
 *   2. Field-specific title (body16SemiBold) + "We will send you OTP to
 *      verify" (body16Regular).
 *   3. One Input (md) with the field's floating label.
 *   4. Sticky "Send OTP" footer (cobalt) — disabled until the entry is a
 *      plausible email / 10-digit mobile.
 *
 * Copy is field-driven via FIELD_COPY; this screen stays field-agnostic.
 */
import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Input } from '../atoms';
import { Header, FooterButtons } from '../organisms';
import { colors, spacing } from '../tokens';
import { analytics, Events } from '../analytics';
import { FIELD_COPY, isValidContact, shouldShowContactError } from './editContact';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditContactEnterNew'>;
type Rt = RouteProp<RootStackParamList, 'EditContactEnterNew'>;

export function EditContactEnterNewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const field = params.field;
  const copy = FIELD_COPY[field];

  const [value, setValue] = useState('');
  const [blurred, setBlurred] = useState(false);
  const isValid = isValidContact(field, value);
  // Inline error (Figma 4448:23879 / 3396:25096) — shown after blur or a
  // full-length entry, never while the user is still mid-way through typing.
  const showError = shouldShowContactError(field, value, blurred);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <Header
            leading="back"
            title="Account Settings"
            onLeadingPress={() => navigation.goBack()}
          />

          <View style={{ flex: 1, paddingTop: spacing[24], gap: spacing[24] }}>
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[12] }}>
              <Text variant="body16SemiBold" color={colors.text.primary}>
                {copy.enterNewTitle}
              </Text>
              <Text variant="body16Regular" color={colors.text.primary}>
                {copy.enterNewSubtitle}
              </Text>
            </View>

            <View style={{ paddingHorizontal: spacing[16] }}>
              <Input
                label={copy.inputLabel}
                value={value}
                onChangeText={(t) => {
                  setValue(t);
                  // Re-arm the blur trigger so the error doesn't nag while
                  // the user is correcting the entry.
                  if (blurred) setBlurred(false);
                }}
                onBlur={() => setBlurred(true)}
                state={showError ? 'error' : undefined}
                hint={showError ? copy.invalidMessage : undefined}
                autoFocus
                keyboardType={field === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                maxLength={field === 'mobile' ? 10 : undefined}
              />
            </View>
          </View>

          <FooterButtons
            buttons="single"
            color="second"
            size={52}
            shadow="off"
            primaryLabel="Send OTP"
            primaryDisabled={!isValid}
            onPrimary={() => {
              // Field type only ('email' | 'mobile') — never the new value (PII).
              analytics.track(Events.CONTACT_EDIT_START, { field });
              navigation.navigate('EditContactVerifyNew', {
                field,
                newValue: value.trim(),
              });
            }}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
