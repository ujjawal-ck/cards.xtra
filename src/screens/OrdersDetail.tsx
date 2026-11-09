/**
 * OrdersDetail — screen (Figma 3834:51156 + states 3919:40017/40150/40310/40701,
 * file P7UcoZYBnfyefmJIA8wcM7). ONE screen, `status`-driven (NOT five screens).
 *
 * ✅ Reconciled against live Figma (figma-local, 2026-06-03). Per-flag verdicts:
 *
 *   FLAG 1 — Order-summary rows ✏️ FIXED. Figma (3834:51934) is a FLAT list
 *     (no rounded card), px 16, 8 gap, with a #eee horizontal divider between
 *     rows. Rows (SemiBold label, NO colon / Regular-right value):
 *       "Order Amount" ₹569.5 · "Order ID" MYN-9876543210 ·
 *       "Transaction Date" 20-12-2023.
 *     Was: a white rounded card with 3 colon-labelled rows + wrong values.
 *
 *   FLAG 2 — Help card copy + Button ✏️ FIXED & ✅/🚩 on button.
 *     Figma (3860:52035) is identical in ALL five states: heading "Note",
 *     body the gold-coins copy, blue accent Button "Need Help" + a "gethelp"
 *     trailing icon. Width 124 ✅ CONFIRMED real (component is 124×36 in the
 *     node tree). Button variant ✅ solid+second = accent #0741ef = Figma
 *     button/accent-bg. 🚩 No "gethelp" icon is registered → substituted
 *     headset-outline (closest help glyph). Was: status-driven headings/copy
 *     ("Cashback taking time?" etc.) + label "Raise Ticket"/"View Details".
 *
 *   FLAG 3 — Timeline step titles/dates ✏️ FIXED. Verified copy/dates and
 *     applied (see STATUS_CONFIG). Common steps "Order placed" / "Cashback
 *     tracked"; status step "Confirmation  Pending" (two spaces, intentional;
 *     lower-case "pending" only in the pending state); paid adds a 4th tile
 *     "Status goes here". Every step dated "Sep 19,2025". Was: "Order Tracked"
 *     / "Cashback Pending|Confirmed|Paid" with "October …" dates.
 *
 *   FLAG 4 — Section title ✏️ FIXED → "Your Cashback Journey" (Figma node
 *     3873:52575, body16SemiBold). Was: "Cashback Timeline".
 *
 *   Also corrected demo masthead data to match Figma: TATA 1mg logo, ₹1900.9,
 *   delayed expectedText "Now Expected by Dec 30, 2025".
 *
 *   🚩 TOKEN/ICON GAPS (tokens-are-law, no token edits made):
 *     • delayed step indicator is ORANGE info-circle in Figma → Timeline now
 *       has a 'brand' (saffron) tone; the delayed step uses it.
 *     • "right-circle" (step 2) and "gethelp" (button) icons are unregistered
 *       → substituted check-circle-outline / headset-outline respectively.
 *
 * Top → bottom:
 *   1. Header (back) — REUSED.
 *   2. Masthead variant='cashback-status' — REUSED (tone-driven per status).
 *   3. Order-summary list — <ListRow type="caption-value"> + dividers.
 *   4. "Note" help card — heading + body + 124×36 accent Button (REUSED).
 *   5. Timeline section — title + <Timeline> (REUSED organism).
 *
 * Status → (masthead tone + expectedText + Timeline steps) map lives in
 * STATUS_CONFIG below. Help card is NOT status-driven (consts above body).
 *
 * Imports: Header, Masthead, Timeline (organisms); ListRow (molecule);
 * Text, Button (atoms).
 */
import React from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button } from '../atoms';
import type { StatusBadgeStatus } from '../atoms';
import { Header, Masthead, Timeline } from '../organisms';
import type { TimelineStep } from '../organisms';
import { ListRow } from '../molecules';
import { useOrderDetail } from '../query/useOrderDetail';
import { colors, spacing, sizing } from '../tokens';
import { images } from '../assets/images';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrdersDetail'>;
type Rt = RouteProp<RootStackParamList, 'OrdersDetail'>;

export type OrderStatus = 'pending' | 'delayed' | 'cancelled' | 'confirmed' | 'paid';

// Help-card Button width — Figma component spec (124), not on the scale.
const HELP_BTN_W = 124;

interface StatusConfig {
  mastheadTone: StatusBadgeStatus;
  statusLabel?: string; // omit → StatusBadge's own "Cashback {Status}"
  expectedText: string;
  steps: TimelineStep[];
}

// Help ("Note") card — verified identical across ALL five Figma states
// (3860:52035): heading "Note", the gold-coins body copy, and a blue
// accent Button labelled "Need Help". Not status-driven.
const HELP_HEADING = 'Note';
const HELP_BODY =
  'Cashback is not applicable on Gold Coins and idols etc, your Cashback will be cancelled if it pertains to a Gold coin or idol order.';
const HELP_BUTTON_LABEL = 'Need Help';

// Reusable timeline fragments — copy/dates verified live against Figma
// (3873:52573 + state variants 3919:40017/40150/40310/40701).
//   • "Order placed"   → cart-filled, success soft, dated "Sep 19,2025"
//   • "Cashback tracked" → Figma "right-circle" (an OUTLINE check-in-circle);
//      substituted with the registered check-circle-outline, success soft.
// Every step in every state is dated "Sep 19,2025" in Figma.
const STEP_DATE = 'Sep 19,2025';

const STEP_PLACED: TimelineStep = {
  iconName: 'cart-filled',
  title: 'Order placed',
  date: STEP_DATE,
  fill: 'soft',
  tone: 'success',
};

const STEP_TRACKED: TimelineStep = {
  iconName: 'check-circle-outline', // Figma "right-circle" (outline check)
  title: 'Cashback tracked',
  date: STEP_DATE,
  fill: 'soft',
  tone: 'success',
};

// "Confirmation  Pending" — two spaces are intentional in Figma (verified).
const CONFIRMATION = 'Confirmation  Pending';

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    mastheadTone: 'pending',
    expectedText: 'Expected by October 15, 2025',
    steps: [
      STEP_PLACED,
      STEP_TRACKED,
      // pending uses lower-case "pending" + clock/timer on warning solid.
      { iconName: 'clock-filled', title: 'Confirmation  pending', date: STEP_DATE, fill: 'solid', tone: 'warning' },
    ],
  },
  delayed: {
    mastheadTone: 'delayed',
    expectedText: 'Now Expected by Dec 30, 2025',
    steps: [
      STEP_PLACED,
      STEP_TRACKED,
      // Figma shows an orange info-circle here → Timeline 'brand' (saffron) tone.
      { iconName: 'clock-filled', title: CONFIRMATION, date: STEP_DATE, fill: 'solid', tone: 'brand' },
    ],
  },
  cancelled: {
    mastheadTone: 'cancelled',
    expectedText: 'Expected by October 15, 2025',
    steps: [
      STEP_PLACED,
      STEP_TRACKED,
      { iconName: 'desc-cross', title: CONFIRMATION, date: STEP_DATE, fill: 'solid', tone: 'error' },
    ],
  },
  confirmed: {
    mastheadTone: 'confirmed',
    expectedText: 'Expected by October 15, 2025',
    steps: [
      STEP_PLACED,
      STEP_TRACKED,
      { iconName: 'check-filled', title: CONFIRMATION, date: STEP_DATE, fill: 'solid', tone: 'success' },
    ],
  },
  paid: {
    mastheadTone: 'paid',
    expectedText: 'Expected by October 15, 2025',
    steps: [
      STEP_PLACED,
      STEP_TRACKED,
      { iconName: 'wallet-outline', title: CONFIRMATION, date: STEP_DATE, fill: 'soft', tone: 'success' },
      { iconName: 'cart-filled', title: 'Status goes here', date: STEP_DATE, fill: 'solid', tone: 'success' },
    ],
  },
};

export function OrdersDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const orderId = route.params?.id;

  // Live order when `id` is passed (from OrdersList); otherwise the legacy
  // demo path keyed by `status`.
  const { data, isLoading, isError, refetch, isFetching } = useOrderDetail(orderId);
  const status: OrderStatus = route.params?.status ?? 'pending';
  const cfg = STATUS_CONFIG[status];

  // Resolved view values — live data wins, demo cfg is the fallback.
  const amount = data?.amount ?? '₹1900.9';
  const brandLogo = data?.brandLogoUri ? { uri: data.brandLogoUri } : images.stores.tatamg;
  const tone = data?.tone ?? cfg.mastheadTone;
  const statusLabel = data?.statusLabel ?? cfg.statusLabel;
  const expectedText = data?.expectedText ?? cfg.expectedText;
  const orderAmount = data?.orderAmount ?? '₹569.5';
  const shownOrderId = data?.orderId ?? 'MYN-9876543210';
  const transactionDate = data?.transactionDate ?? '20-12-2023';
  const steps = data?.steps ?? cfg.steps;

  // First load (have an id, nothing cached yet).
  const showLoading = !!orderId && isLoading && !data;
  const showError = !!orderId && isError && !data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="back"
          title="Order Details"
          onLeadingPress={() => navigation.goBack()}
        />

        {showLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.action.primary.default} />
          </View>
        ) : showError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[8], paddingHorizontal: spacing[24] }}>
            <Text variant="body14SemiBold" color={colors.text.primary} align="center">
              Couldn’t load this order.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => refetch()} hitSlop={spacing[8]}>
              <Text variant="body14SemiBold" color={colors.action.accent.default}>
                {isFetching ? 'Retrying…' : 'Retry'}
              </Text>
            </Pressable>
          </View>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sizing.bottomNavHeight }}
        >
          {/* 2. Masthead */}
          <Masthead
            variant="cashback-status"
            amount={amount}
            brandLogo={brandLogo}
            tone={tone}
            statusLabel={statusLabel}
            expectedText={expectedText}
          />

          {/* content column */}
          <View style={{ paddingTop: spacing[16], gap: spacing[24] }}>
            {/* 3. Order-summary list — flat (no card in Figma), px 16, gap 8,
                horizontal divider (#eee) between rows. Labels are SemiBold
                (no colon), values Regular-right — both via ListRow. */}
            <View style={{ paddingHorizontal: spacing[16], gap: spacing[8] }}>
              <ListRow type="caption-value" label="Order Amount" value={orderAmount} />
              <View style={{ height: 1, backgroundColor: colors.border.subtle3 }} />
              <ListRow type="caption-value" label="Order ID" value={shownOrderId} />
              <View style={{ height: 1, backgroundColor: colors.border.subtle3 }} />
              <ListRow type="caption-value" label="Transaction Date" value={transactionDate} />
            </View>

            {/* 4. "Note" help card (identical across all states) */}
            <View
              style={{
                backgroundColor: colors.background.muted,
                padding: spacing[16],
                gap: spacing[16],
                alignItems: 'flex-start',
              }}
            >
              <View style={{ gap: spacing[8] }}>
                <Text variant="body16SemiBold" color={colors.text.primary}>
                  {HELP_HEADING}
                </Text>
                <Text variant="body14Regular" color={colors.text.primary}>
                  {HELP_BODY}
                </Text>
              </View>
              <Button
                label={HELP_BUTTON_LABEL}
                variant="solid"
                tone="second"
                size={36}
                icon="trailing"
                iconName="headset-outline"
                onPress={() => navigation.navigate('MissingCashbackWhereDidYouShop')}
                style={{ width: HELP_BTN_W }}
              />
            </View>

            {/* 5. Timeline section */}
            <View style={{ gap: spacing[4] }}>
              <Text
                variant="body16SemiBold"
                color={colors.text.primary}
                style={{ paddingHorizontal: spacing[16] }}
              >
                Your Cashback Journey
              </Text>
              <Timeline steps={steps} />
            </View>
          </View>
        </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
