/**
 * MissingCashbackNewUserCheck — screen (Figma 4129:25311,
 * "help/missing-cashback/group-a/new-user-check")
 *
 * Composition + reuse. Asks whether the user is new on the merchant.
 *
 * Token map (per property):
 *   root bg            → colors.background.default (#fff)
 *   root padding       → spacing[0]
 *   root gap           → spacing[24]
 *   infoText px        → spacing[16] · gap spacing[8]
 *   heading            → typography.body16Bold (0.4 "Wide" baked) · colors.text.primary
 *   subtitle           → typography.body14Regular · colors.text.primary
 *   Learn More link    → <Button> variant 'link' · size 36 (body12Medium = Medium12)
 *                        · colors.text.link (#0036da) · underline + forward-arrow glyph
 *   spacer             → flex:1 (Figma's fixed 402 spacer → flex-grow)
 *   footer             → col · gap spacing[24] · items center
 *   primary button     → <Button> solid · tone 'second' (cobalt) · size 52 (body16Medium)
 *                        · width 220 (// flagged literal, centred — not full-bleed)
 *   secondary button   → <Button> variant 'link' · size 36 · width 220 centred
 *
 * Imports: Header (back-only), BrandLogoTile (44), Button (solid + link).
 *
 * Copy note: Figma's primary label reads "Yes, I'm an New User" (grammar
 * slip); corrected to "Yes, I'm a new user" here.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, BrandLogoTile, Button } from '../atoms';
import { Header } from '../organisms';
import { useMissingCashbackActions } from '../query/useMissingCashback';
import { decideSubmitOutcome } from '../api/missingCashbackMapper';
import { resultParamsFromOutcome } from './missingCashbackResultParams';
import { colors, spacing, iconSize, borderWidth } from '../tokens';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackNewUserCheck'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackNewUserCheck'>;

// Action button width — fixed 220 in Figma (centred, not full-bleed); not
// on the spacing scale, so a flagged one-off literal.
const BTN_WIDTH = 220;

/**
 * Thin forward arrow — no `forwardarrow` ships in the Icon registry; drawn
 * inline at borderWidth.thick stroke (Header-organism precedent) and tinted
 * via `color`. Replace with <Icon name="forwardarrow" …> once it ships.
 */
function ForwardArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 10 L17 10" stroke={color} strokeWidth={borderWidth.thick} strokeLinecap="round" />
      <Path
        d="M11 4 L17 10 L11 16"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MissingCashbackNewUserCheck() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { update, refreshClaims } = useMissingCashbackActions();
  const [busy, setBusy] = useState<'New' | 'Existing' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const merchant = draft.storeName;
  const logoSource = draft.storeLogoUri ? { uri: draft.storeLogoUri } : images.stores.myntra31;

  // B1: PUT the user_type onto the queued claim, then show the result.
  const submitUserType = async (userType: 'New' | 'Existing') => {
    if (!draft.queueId) {
      setError('Missing claim reference. Please retry from your claims list.');
      return;
    }
    setError(null);
    setBusy(userType);
    try {
      const res = await update(draft.queueId, { user_type: userType });
      refreshClaims();
      navigation.navigate('MissingCashbackResult', resultParamsFromOutcome(decideSubmitOutcome(res, draft.group)));
    } catch (e) {
      setError((e as Error)?.message || 'Could not submit your answer. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1, gap: spacing[24] }}>
          {/* 1. Header — back-only (no title) */}
          <Header leading="back" onLeadingPress={() => navigation.goBack()} />

          {/* 2. Info text */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
            <BrandLogoTile source={logoSource} size="44" />
            <Text variant="body16Bold" color={colors.text.primary}>
              {`Great! Are you a new user on ${merchant}?`}
            </Text>
            <Text variant="body14Regular" color={colors.text.primary}>
              {`${merchant} gives different Cashbacks to new and existing users.`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <Button label="Learn More" variant="link" size={36} />
              <ForwardArrowGlyph size={iconSize[20]} color={colors.text.link} />
            </View>
            {error ? (
              <Text variant="body12SemiBold" color={colors.feedback.error.default}>
                {error}
              </Text>
            ) : null}
          </View>

          {/* 3. Grow spacer (Figma's fixed 402px spacer → flex-grow) */}
          <View style={{ flex: 1 }} />

          {/* 4. Footer */}
          <View style={{ gap: spacing[24], alignItems: 'center' }}>
            <Button
              label="Yes, I'm a new user"
              variant="solid"
              tone="second"
              size={52}
              loading={busy === 'New'}
              disabled={busy !== null}
              onPress={() => submitUserType('New')}
              style={{ width: BTN_WIDTH, alignSelf: 'center' }}
            />
            <Button
              label="No, I'm an existing user"
              variant="link"
              size={36}
              loading={busy === 'Existing'}
              disabled={busy !== null}
              onPress={() => submitUserType('Existing')}
              style={{ width: BTN_WIDTH, alignSelf: 'center' }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
