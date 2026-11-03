/**
 * ProfilePaymentHistoryEmpty — screen (Figma 3416:62381, file P7UcoZYBnfyefmJIA8wcM7)
 *
 * Reconciled against LIVE Figma (figma-local) — 2026-06-03.
 *
 * Empty state:
 *   1. Header (back) — REUSED.
 *   2. Centered illustration — Image/ScreenState (instance 3629:174357, 132×128).
 *   3. Empty-state text (two paragraphs, 312 wide, centered, node 3416:62388).
 *
 * ✅ COPY — FIXED. Figma renders the message as TWO centered paragraphs
 *    separated by a blank line, NOT one run-on sentence:
 *      P1: "You have not requested any payment yet, hence no Payment History exists"
 *      (blank line)
 *      P2: "Please check back after some time"
 *    Neither paragraph has trailing punctuation in Figma — preserved as-is.
 *    (Prior single-string version with no break/period was wrong; corrected.)
 *
 * 🚩 ILLUSTRATION GATE — still OPEN (needs an asset export decision):
 *    - Figma node 3629:174357 ("Image/ScreenState") is a single SVG: a
 *      CK-Blue (#0036DA) receipt/bill icon — rounded card with three list
 *      rows and a torn/perforated bottom edge. Footprint 132×128.
 *    - There is NO `ScreenState` component in src, and NO matching asset:
 *        · images.storepage.nocashback → "No cashback yet" meaning. WRONG. Not used.
 *        · the <Icon /> ICON_REGISTRY holds MONOCHROME UI icons only; this is
 *          a multi-tone brand illustration, so it does not belong there.
 *    - Per the no-wrong-image rule, a neutral, intentional bordered PLACEHOLDER
 *      box is rendered at the exact 132×128 footprint (labelled), NOT a
 *      substitute image. NO fabricated asset path.
 *    ACTION NEEDED (human): export node 3629:174357 as an SVG/PNG, drop it in
 *      src/assets, register it (suggested key images.screenState.noPaymentHistory
 *      or an SVG in the Icon registry), then swap the placeholder for it.
 *
 * 💡 RECOMMENDATION (not built here): a small reusable <ScreenState
 *    illustration title subtitle /> organism would centralise this empty-state
 *    layout (this screen + the other no-data screens flagged last session).
 *    Out of scope for a single-file reconcile; flagged for a follow-up.
 *
 * Token map (per property):
 *   screen bg        → colors.background.default
 *   content          → flex:1 · center · gap spacing[16] · px spacing[24]
 *   placeholder box  → 132×128 · radius.lg · bg surface.sunken · border thin/border.default
 *   empty text       → body14Regular / colors.text.secondary · align center · width 312
 *                      (Figma: Text/Secondary #5c5c5c == colors.text.secondary; line 20)
 *
 * Imports: Header (organism); Text (atom). (Image/ScreenState intentionally
 * NOT imported — it does not exist.)
 */
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, radius, borderWidth } from '../tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'ProfilePaymentHistoryEmpty'
>;

// Spec'd illustration footprint (132×128) — component-spec literals.
const ILLO_W = 132;
const ILLO_H = 128;

// Figma copy (node 3416:62388) — TWO centered paragraphs, blank line between,
// no trailing punctuation on either. Rendered verbatim.
const EMPTY_COPY_LINE_1 =
  'You have not requested any payment yet, hence no Payment History exists';
const EMPTY_COPY_LINE_2 = 'Please check back after some time';

export function ProfilePaymentHistoryEmpty() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Payment History"
          onLeadingPress={() => navigation.goBack()}
        />

        {/* 2 + 3 — centered empty state */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[16],
            paddingHorizontal: spacing[24],
          }}
        >
          {/* Illustration PLACEHOLDER — intentional, real asset pending export
              of Figma node 3629:174357 (CK-Blue receipt icon). See gate above. */}
          <View
            style={{
              width: ILLO_W,
              height: ILLO_H,
              borderRadius: radius.lg,
              backgroundColor: colors.surface.sunken,
              borderWidth: borderWidth.thin,
              borderColor: colors.border.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption10Regular" color={colors.text.tertiary} align="center">
              receipt{'\n'}illustration
            </Text>
          </View>

          <Text
            variant="body14Regular"
            color={colors.text.secondary}
            align="center"
            style={{ width: 312 }}
          >
            {EMPTY_COPY_LINE_1}
            {'\n\n'}
            {EMPTY_COPY_LINE_2}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
