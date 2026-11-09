/**
 * ProfilePaymentHistoryDetails — screen (Figma 3396:51408, file P7UcoZYBnfyefmJIA8wcM7)
 *
 * ── Figma reconcile (live read via figma-local, all 8 nodes) ──
 *
 * FLAG 1 — CTA conflict: ✅ CONFIRMED + ✏️ FIXED.
 *   Inspected footer 3919:38500 vs standalone Button 3396:51425 + spacer
 *   3396:51423. The standalone Button reads "Save Changes" (a foreign
 *   artifact, not this screen's action) and the 360×1 frame is a spacer —
 *   both correctly dropped. The pinned FooterButtons IS the real CTA, BUT
 *   it is a DUAL-OUTLINE accent bar: "Download Excel" + "Download PDF",
 *   NOT a single "Done". Changed accordingly (see FLAG 4).
 *
 * FLAG 2 — InlineMessage tone/copy: ✏️ FIXED.
 *   Figma 3416:62046 vars: tone/bg-subtle #edfbff, tone/text #125a70,
 *   tone/border #a6e2f4 = the `sky` primitive family → tone='sky' (was
 *   'info'/cobalt). No leading icon in Figma → none passed. Copy corrected
 *   to "Only 10 transactions are visible, to see more click Download".
 *
 * FLAG 3 — Four cards' rows: ✏️ FIXED.
 *   All 4 List nodes (62137/62185/62221/62256) share the SAME four rows:
 *   Order Date · Details · Type · Cashback Amount (NOT the prior
 *   Request ID / payment-mode / bank rows). Values per Figma:
 *     card1: 09-02-02 · Ajio             · Cashback · ₹20.00
 *     cards 2-4: 09-02-02 · HDFC Credit Card · Cashback · ₹5.00
 *
 * FLAG 4 — Footer label: ✏️ FIXED.
 *   Figma 3919:38500 is a two-button accent row, not "Done":
 *   secondary "Download Excel" + primary "Download PDF", both outline/accent.
 *   → buttons="dual-outline" color="second".
 *
 * Header title: ✏️ FIXED — Figma 3396:51409 reads "Request ID: 1818554"
 *   (was "Payment Details").
 *
 * Top → bottom:
 *   1. Header (back) — REUSED.
 *   2. InlineMessage (single-line) — REUSED.
 *   3. Four payment-detail cards — PaymentRecordCard (List substitute), no View link.
 *   4. FooterButtons (pinned bottom, dual-outline) — REUSED.
 *
 * Token map (per property):
 *   screen bg        → colors.background.default
 *   content px / gap → spacing[16] / spacing[16] · paddingTop spacing[16]
 *   inline message   → <InlineMessage> tone 'sky'
 *   cards            → <PaymentRecordCard> (surface.default · border.default ·
 *                      radius.xl · padding spacing[16] · gap spacing[12])
 *   footer           → <FooterButtons buttons="dual-outline" color="second"> (+ bottom inset)
 *
 * Imports: Header, FooterButtons (organisms); PaymentRecordCard,
 * InlineMessage (molecules).
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header, FooterButtons } from '../organisms';
import { PaymentRecordCard, InlineMessage, Toast } from '../molecules';
import type { PaymentRecordRow } from '../molecules';
import { colors, spacing } from '../tokens';
import type { RootStackParamList } from '../navigation/types';
import { play } from '../lib/haptics';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'ProfilePaymentHistoryDetails'
>;

// Four detail cards — rows match the 4 Figma "List" nodes
// (3416:62137 / 62185 / 62221 / 62256): same row set, differing values.
const CARDS: PaymentRecordRow[][] = [
  [
    { label: 'Order Date', value: '09-02-02' },
    { label: 'Details', value: 'Ajio' },
    { label: 'Type', value: 'Cashback' },
    { label: 'Cashback Amount', value: '₹20.00' },
  ],
  [
    { label: 'Order Date', value: '09-02-02' },
    { label: 'Details', value: 'HDFC Credit Card' },
    { label: 'Type', value: 'Cashback' },
    { label: 'Cashback Amount', value: '₹5.00' },
  ],
  [
    { label: 'Order Date', value: '09-02-02' },
    { label: 'Details', value: 'HDFC Credit Card' },
    { label: 'Type', value: 'Cashback' },
    { label: 'Cashback Amount', value: '₹5.00' },
  ],
  [
    { label: 'Order Date', value: '09-02-02' },
    { label: 'Details', value: 'HDFC Credit Card' },
    { label: 'Type', value: 'Cashback' },
    { label: 'Cashback Amount', value: '₹5.00' },
  ],
];

export function ProfilePaymentHistoryDetails() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Transient export feedback. No file-system / sharing module ships in the
  // Expo Go demo build, so "Download Excel/PDF" confirms the export started
  // via a haptic + auto-dismissing Toast rather than silently doing nothing.
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showExportToast = React.useCallback((format: 'Excel' | 'PDF') => {
    play('buttonPrimary');
    setToast(`Preparing your ${format} — we'll notify you when it's ready.`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  React.useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Request ID: 1818554"
          onLeadingPress={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing[16],
            paddingTop: spacing[16],
            gap: spacing[16],
            paddingBottom: spacing[24],
          }}
        >
          {/* 2. Inline message — tone 'sky' + copy per Figma 3416:62046 */}
          <InlineMessage
            tone="sky"
            message="Only 10 transactions are visible, to see more click Download"
          />

          {/* 3. Four detail cards */}
          {CARDS.map((rows, i) => (
            <PaymentRecordCard key={i} rows={rows} />
          ))}
        </ScrollView>

        {/* 4. Pinned FooterButtons — dual-outline accent row per Figma 3919:38500.
            "Download Excel" (secondary) + "Download PDF" (primary). The
            standalone "Save Changes" Button artifact is NOT rendered. */}
        {/* Transient export toast — sits just above the footer, fed by the
            download buttons, auto-dismisses after ~2.8s. */}
        {toast ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: spacing[16],
              right: spacing[16],
              // Clear the ~72px footer (button 44 + 28 padding) + a small gap.
              bottom: insets.bottom + spacing[80],
            }}
          >
            <Toast
              tone="sky"
              message={toast}
              onDismiss={() => setToast(null)}
            />
          </View>
        ) : null}

        <FooterButtons
          buttons="dual-outline"
          color="second"
          secondaryLabel="Download Excel"
          primaryLabel="Download PDF"
          onSecondary={() => showExportToast('Excel')}
          onPrimary={() => showExportToast('PDF')}
          style={{ paddingBottom: insets.bottom }}
        />
      </SafeAreaView>
    </View>
  );
}
