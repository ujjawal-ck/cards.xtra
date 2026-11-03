/**
 * ProfilePaymentHistory — screen (Figma 3396:51078, file P7UcoZYBnfyefmJIA8wcM7)
 *
 * ── Figma reconcile (read LIVE via figma-local; nodes 3396:51078, 3416:62032,
 *    List 3396:59490 / 3416:61924, Inline message 3420:18069) ──
 * FLAG 1 — Title: ✅ CONFIRMED. Figma title node 3396:51082 literally reads
 *   "Personal Detailz" — a placeholder/typo. Kept correct product copy
 *   "Payment History". Section-title style verified: Figma is Body/16/Semi Bold
 *   text.primary (node 3416:62032 vars) → matches body16SemiBold. ✅
 * FLAG 2 — Month: ✅ CONFIRMED. Figma label is "February 2022" (stale demo
 *   value). Kept the dynamic SelectMonthSheet wiring; SELECT_MONTH_OPTIONS[0]
 *   = "February 2026" reads sensibly. Month label style body14Medium ✅.
 * FLAG 3 — Row VALUES: ✏️ FIXED. Read live from both "List" nodes (identical):
 *   Request ID 1603798 · Date Paid 09-02-22 · Payment Mode "Amazon Pay  Balance"
 *   · Amount Paid ₹80.80 · Reference Number 303312797342. Trailing Info/View
 *   row present in Figma → rendered via PaymentRecordCard onView. ✅
 * FLAG 4 — InlineMessage tone/copy: ✏️ FIXED. Figma palette #edfbff/#125a70/
 *   #a6e2f4 = sky tone (was 'info' = cobalt blue — wrong). Title "Important
 *   Information" added; copy corrected to the CashKaro / Pouring Pounds text.
 *   🚩 OPEN: Figma leading info-circle icon not rendered — no `info-circle` in
 *   Icon registry and InlineMessage's `icon` takes an IconName (InfoCircleGlyph
 *   atom can't be passed); InlineMessage edit is out of scope.
 *
 * Top → bottom:
 *   1. Header (back) — REUSED.
 *   2. Section header row — title + month dropdown (opens SelectMonthSheet).
 *   3. Two payment-record cards — PaymentRecordCard (List substitute).
 *   4. InlineMessage — REUSED.
 *
 * Token map (per property):
 *   screen bg            → colors.background.default
 *   content px / gap     → spacing[16] / spacing[16]
 *   section header       → row space-between · px spacing[16]
 *   section title        → body16SemiBold / colors.text.primary   [✅ matches Figma]
 *   month label          → body14Medium / colors.text.primary
 *   month chevron        → inline 16px chevron-down (not registered) / colors.icon.actions
 *   cards                → <PaymentRecordCard> (surface.default · border.default ·
 *                          radius.xl · padding spacing[16] · gap spacing[12])
 *   inline message       → <InlineMessage> tone 'sky' (title + body per Figma)
 *
 * Imports: Header, SelectMonthSheet (organisms); PaymentRecordCard,
 * InlineMessage (molecules); Text (atom).
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Text } from '../atoms';
import { Header, SelectMonthSheet, SELECT_MONTH_OPTIONS } from '../organisms';
import { PaymentRecordCard, InlineMessage } from '../molecules';
import type { PaymentRecordRow } from '../molecules';
import { colors, spacing, iconSize, borderWidth, sizing } from '../tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProfilePaymentHistory'>;

/** 16px chevron-down — no `chevron-down` in the Icon registry (inline glyph). */
function ChevronDownGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 6 L8 10 L12 6"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Sample records — VALUES read LIVE from the two "List" nodes (3396:59490,
// 3416:61924). Both cards are identical in the Figma frame.
const CARD_1: PaymentRecordRow[] = [
  { label: 'Request ID', value: '1603798' },
  { label: 'Date Paid', value: '09-02-22' },
  { label: 'Payment Mode', value: 'Amazon Pay  Balance' },
  { label: 'Amount Paid', value: '₹80.80' },
  { label: 'Reference Number', value: '303312797342' },
];
const CARD_2: PaymentRecordRow[] = [
  { label: 'Request ID', value: '1603798' },
  { label: 'Date Paid', value: '09-02-22' },
  { label: 'Payment Mode', value: 'Amazon Pay  Balance' },
  { label: 'Amount Paid', value: '₹80.80' },
  { label: 'Reference Number', value: '303312797342' },
];

export function ProfilePaymentHistory() {
  const navigation = useNavigation<Nav>();
  const sheetRef = useRef<BottomSheetModal>(null);
  // Selected month drives the dropdown label (and, in production, the filter).
  const [monthIndex, setMonthIndex] = useState(0);

  const openDetails = () =>
    navigation.navigate('ProfilePaymentHistoryDetails');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Payment History"
          onLeadingPress={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sizing.bottomNavHeight, gap: spacing[16] }}
        >
          {/* 2. Section header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[16],
              paddingTop: spacing[16],
            }}
          >
            {/* Figma title node reads "Personal Detailz" (placeholder/typo);
                rendering the correct product copy "Payment History". ✅ */}
            <Text variant="body16SemiBold" color={colors.text.primary}>
              Payment History
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => sheetRef.current?.present()}
              hitSlop={spacing[8]}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
            >
              {/* Label reflects the month picked in SelectMonthSheet. */}
              <Text variant="body14Medium" color={colors.text.primary}>
                {SELECT_MONTH_OPTIONS[monthIndex]}
              </Text>
              <ChevronDownGlyph size={iconSize[16]} color={colors.icon.actions} />
            </Pressable>
          </View>

          {/* 3. Payment-record cards */}
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
            <PaymentRecordCard rows={CARD_1} onView={openDetails} />
            <PaymentRecordCard rows={CARD_2} onView={openDetails} />
          </View>

          {/* 4. Inline message — tone 'sky' + title + copy per Figma 3420:18069.
              (Figma leading info-circle icon omitted: no `info-circle` in the
              Icon registry and InlineMessage takes an IconName, not the
              InfoCircleGlyph atom — flagged, component edit is out of scope.) */}
          <View style={{ paddingHorizontal: spacing[16] }}>
            <InlineMessage
              tone="sky"
              title="Important Information"
              message="CashKaro payments will show up under Pouring Pounds India Pvt Ltd in your bank statement. If this reason does not justify your cancellation, please tap on the button below"
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Select-month sheet (presented from the month dropdown) */}
      <SelectMonthSheet
        ref={sheetRef}
        value={monthIndex}
        onChange={(i) => {
          setMonthIndex(i);
          sheetRef.current?.dismiss();
        }}
      />
    </View>
  );
}
