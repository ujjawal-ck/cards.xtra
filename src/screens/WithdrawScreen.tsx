/**
 * WithdrawScreen — Figma withdraw/combined/method-select (3277:41973) +
 * tooltip variant (3297:16873). This is the FIRST screen of WithdrawStack
 * (registered as `WithdrawMethodSelect`).
 *
 * Composition of existing components:
 *   - <Header leading='back' title='Withdraw Cashback' />     (organism)
 *   - <Masthead variant='payment' />                         (organism)
 *   - <Tooltip />                                            (molecule — info)
 *   - MethodCard / MethodRow / InfoCircleGlyph               (shared, ./withdraw/methodRow)
 *
 * Three withdrawable buckets, each a heading (amount + info-circle that
 * toggles a tooltip) over a card of payment-method rows. Every amount is
 * live from usePaymentInfo (GET /payment/payment, as in the CashKaro app) —
 * nothing hardcoded. An amount the API did not give shows "Balance
 * unavailable", never ₹0 (see ./withdraw/balances).
 *
 * Routing per method:
 *   Cashback · "UPI payments"            → WithdrawEnterUPI (UPI flow)
 *   Cashback · Bank Transfer             → no downstream design yet (no-op)
 *   Cashback · Amazon/Flipkart Gift Card → WithdrawGiftCard (variant 'cashback')
 *   Rewards / Cashback+Reward            → WithdrawGiftCard (Amazon/Flipkart chooser)
 *
 * Tooltip copy: Cashback is verbatim Figma; Rewards / Combined explain the
 * gift-card-only constraint (per product copy).
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { Tooltip } from '../molecules';
import { Header, Masthead, ScreenState } from '../organisms';
import { colors, spacing, mediaSize } from '../tokens';
import { analytics, Events } from '../analytics';
import { usePaymentInfo } from '../query/usePaymentInfo';
import { formatINR } from '../lib/money';
import type { WithdrawStackParamList } from '../navigation/types';
import {
  MethodCard,
  InfoCircleGlyph,
  GiftCardGlyph,
  type MethodRowItem,
} from './withdraw/methodRow';
import { formatRupees } from './withdraw/amount';
import {
  bucketAmount,
  resolveWithdrawView,
  type WithdrawBucket,
} from './withdraw/balances';

type Nav = NativeStackNavigationProp<
  WithdrawStackParamList,
  'WithdrawMethodSelect'
>;

// Row height of the heading (body16 line-height ≈ 24) — used to drop the
// tooltip just below the row, with its up-arrow pointing back at the icon.
const HEADING_ROW_H = 24;
// Gutter the tooltip bubble is clamped within (matches the screen's 16px).
const TOOLTIP_GUTTER = spacing[16];

function SectionHeading({
  label,
  amount,
  infoText,
  open,
  onToggle,
}: {
  label: string;
  amount: string;
  infoText: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  // Centre-x of the info icon (relative to the full-width heading) and the
  // measured tooltip width — together they place the bubble so its arrow
  // sits under the icon, clamped to the screen gutters.
  const [infoCenterX, setInfoCenterX] = useState(0);
  const [tipW, setTipW] = useState(0);

  const onInfoLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setInfoCenterX(x + width / 2);
  };

  const maxLeft = Math.max(TOOLTIP_GUTTER, screenW - TOOLTIP_GUTTER - tipW);
  const tipLeft = Math.min(
    Math.max(infoCenterX - tipW / 2, TOOLTIP_GUTTER),
    maxLeft
  );

  return (
    <View style={{ zIndex: open ? 10 : 0, elevation: open ? 10 : 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          paddingLeft: spacing[16],
        }}
      >
        {/* amount FIRST (bold cobalt), then "- Label", then info-circle. */}
        <Text variant="body16Bold" color={colors.text.link}>
          {amount}
        </Text>
        <Text variant="body16Medium" color={colors.text.primary}>
          - {label}
        </Text>
        <Pressable
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label} info`}
          onPress={onToggle}
          onLayout={onInfoLayout}
        >
          <InfoCircleGlyph color={colors.text.tertiary} />
        </Pressable>
      </View>

      {open ? (
        <View
          onLayout={(e) => setTipW(e.nativeEvent.layout.width)}
          style={{
            position: 'absolute',
            top: HEADING_ROW_H,
            left: tipLeft,
            opacity: tipW > 0 ? 1 : 0,
          }}
        >
          <Tooltip title={infoText} theme="dark" position="bottom" size="md" />
        </View>
      ) : null}
    </View>
  );
}

// Per-bucket heading metadata (amounts + rows are built live in the
// component). `infoText`: Cashback verbatim from Figma; Rewards / Combined
// state the gift-card-only constraint.
const SECTION_META: Array<{
  label: string;
  bucket: WithdrawBucket;
  infoText: string;
}> = [
  {
    label: 'Cashback',
    bucket: 'cashback',
    infoText:
      'This is the amount available for withdrawal using bank transfer or UPI Options',
  },
  {
    label: 'Rewards',
    bucket: 'rewards',
    infoText:
      'This is the amount that can only be withdrawn as Amazon/Flipkart Gift Cards.',
  },
  {
    label: 'Cashback + Reward',
    bucket: 'combined',
    infoText:
      'This is the total amount. Since this includes Rewards, it can only be withdrawn as gift cards.',
  },
];

export function WithdrawScreen() {
  const navigation = useNavigation<Nav>();
  // Set by the Earnings page; absent from Profile (shows every bucket).
  const entryBucket = useRoute<
    RouteProp<WithdrawStackParamList, 'WithdrawMethodSelect'>
  >().params?.bucket;
  const [openTip, setOpenTip] = useState<number | null>(null);

  // Live withdrawable amounts from /payment/payment, the endpoint the payout
  // itself uses (the CashKaro app reads the same one for withdraw).
  // Payment-method ids are read inside each detail screen.
  const paymentQ = usePaymentInfo();
  const payment = paymentQ.data;
  const view = resolveWithdrawView(paymentQ, entryBucket);

  // Numeric amount threaded into the next screen's params. null = unknown.
  const amountNum = (bucket: WithdrawBucket): number | null =>
    bucketAmount(payment, bucket);
  // Display string per bucket ("—" until the first fetch resolves).
  const amountText = (bucket: WithdrawBucket): string => {
    const n = amountNum(bucket);
    return n === null ? '—' : formatRupees(n);
  };
  // Opens the next step only with a known amount: never forward a ₹0
  // placeholder.
  const withAmount = (bucket: WithdrawBucket, go: (amount: number) => void) => {
    const n = amountNum(bucket);
    if (n !== null) go(n);
  };

  // Which section(s) to show. The buckets aren't independent — "combined" is
  // just cashback + rewards — so showing all three is redundant whenever only
  // one type has a balance. Rule:
  //   only cashback  → Cashback
  //   only rewards   → Rewards
  //   both           → Cashback (UPI / gift card) AND Cashback + Reward
  //                      (combined; gift-card-only). Showing only the combined
  //                      section hid UPI from anyone with even ₹5 of rewards.
  // Until the amounts resolve, default to Cashback.
  const hasCashback = (amountNum('cashback') ?? 0) > 0;
  const hasRewards = (amountNum('rewards') ?? 0) > 0;
  const visibleBuckets: WithdrawBucket[] = entryBucket
    ? [entryBucket]
    : hasCashback && hasRewards
      ? ['cashback', 'combined']
      : hasRewards
      ? ['rewards']
      : ['cashback'];
  const sections = SECTION_META.filter((s) => visibleBuckets.includes(s.bucket));

  // Rows per bucket, with live navigation wired in.
  const rowsFor = (bucket: WithdrawBucket): MethodRowItem[] => {
    if (bucket === 'cashback') {
      return [
        {
          icon: 'pay-UPI',
          label: 'UPI payments',
          onPress: () =>
            withAmount('cashback', (amount) => {
              analytics.track(Events.WITHDRAW_METHOD_SELECT, {
                method: 'upi',
                payment_type: 'cashback',
              });
              navigation.navigate('WithdrawEnterUPI', {
                amount,
                paymentType: 'cashback',
              });
            }),
        },
        // Bank Transfer has no Figma design / payout API wiring yet, so it
        // shows as unavailable instead of a tappable row that does nothing.
        // Icon rendered at 80% — its art has less intrinsic padding than
        // the other method glyphs.
        {
          icon: 'pay-bank-transfer',
          iconSize: Math.round(mediaSize[32] * 0.8),
          label: 'Bank Transfer',
          unavailableNote: 'Coming soon',
        },
        {
          glyph: <GiftCardGlyph />,
          label: 'Amazon / Flipkart Gift Card',
          onPress: () =>
            withAmount('cashback', (amount) => {
              analytics.track(Events.WITHDRAW_METHOD_SELECT, {
                method: 'gift_card',
                payment_type: 'cashback',
              });
              navigation.navigate('WithdrawGiftCard', {
                amount,
                variant: 'cashback',
              });
            }),
        },
      ];
    }
    // Rewards + Combined: one gift-card entry → Amazon/Flipkart chooser.
    const variant = bucket === 'rewards' ? 'rewards' : 'combined';
    return [
      {
        glyph: <GiftCardGlyph />,
        label: 'Amazon / Flipkart Gift Card',
        onPress: () =>
          withAmount(bucket, (amount) => {
            analytics.track(Events.WITHDRAW_METHOD_SELECT, {
              method: 'gift_card',
              payment_type: variant,
            });
            navigation.navigate('WithdrawGiftCard', {
              amount,
              variant,
            });
          }),
      },
    ];
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.sunken }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing[24],
            paddingBottom: spacing[32],
          }}
        >
          <Header
            leading="back"
            title="Withdraw Cashback"
            onLeadingPress={() => navigation.goBack()}
          />

          {/* No amounts to show: an honest state, never ₹0. */}
          {view === 'offline' ? (
            <ScreenState
              title="You’re offline"
              body="Connect to the internet and try again."
              actionLabel="Try again"
              onAction={() => paymentQ.refetch()}
            />
          ) : view === 'error' ? (
            <ScreenState
              title="Couldn’t load your balance"
              body="Check your connection and try again."
              actionLabel={paymentQ.isFetching ? 'Retrying…' : 'Try again'}
              onAction={() => paymentQ.refetch()}
            />
          ) : view === 'unavailable' ? (
            <ScreenState
              title="Balance unavailable"
              body="Something went wrong. Please try again."
              actionLabel={paymentQ.isFetching ? 'Retrying…' : 'Try again'}
              onAction={() => paymentQ.refetch()}
            />
          ) : view === 'processing' ? (
            <ScreenState
              title="Payment Is Processing"
              body="You can request another payment after this is completed :)"
            />
          ) : view === 'below_minimum' && payment ? (
            <ScreenState
              title={`Minimum ${formatINR(payment.paymentThreshold)} to withdraw`}
              body={`You can withdraw once your balance reaches ${formatINR(
                payment.paymentThreshold
              )}. Keep shopping to earn more!`}
            />
          ) : null}

          {/* Masthead headline = the entry bucket, or the total available
              (cashback + rewards) from /payment/payment. Self-pads 16. */}
          {view === 'ready' || view === 'loading' ? (
            <Masthead
              variant="payment"
              amount={amountText(entryBucket ?? 'combined')}
            />
          ) : null}

          {(view === 'ready' || view === 'loading' ? sections : []).map((section, i) => (
            <View key={section.label} style={{ gap: 0 }}>
              <SectionHeading
                label={section.label}
                amount={amountText(section.bucket)}
                infoText={section.infoText}
                open={openTip === i}
                onToggle={() =>
                  setOpenTip((prev) => (prev === i ? null : i))
                }
              />
              <View
                style={{
                  paddingHorizontal: spacing[16],
                  paddingVertical: spacing[12],
                }}
              >
                <MethodCard rows={rowsFor(section.bucket)} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Tap-anywhere dismiss — a transparent full-screen catcher shown only
          while a tooltip is open. It sits above the content (so any tap
          closes the tooltip) but is transparent, so the open tooltip painted
          beneath it stays visible until the tap lands. */}
      {openTip !== null ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpenTip(null)}
          accessibilityLabel="Dismiss tooltip"
        />
      ) : null}
    </View>
  );
}
