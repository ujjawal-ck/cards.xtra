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
 * live from useEarnings — nothing hardcoded.
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
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { Tooltip } from '../molecules';
import { Header, Masthead } from '../organisms';
import { colors, spacing, mediaSize } from '../tokens';
import { analytics, Events } from '../analytics';
import { useEarnings } from '../query/useEarnings';
import type { WithdrawStackParamList } from '../navigation/types';
import {
  MethodCard,
  InfoCircleGlyph,
  GiftCardGlyph,
  type MethodRowItem,
} from './withdraw/methodRow';
import { formatRupees } from './withdraw/amount';

type Nav = NativeStackNavigationProp<
  WithdrawStackParamList,
  'WithdrawMethodSelect'
>;

type WithdrawBucket = 'cashback' | 'rewards' | 'combined';

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
  const [openTip, setOpenTip] = useState<number | null>(null);

  // Live withdrawable amounts from /users/earnings (the same source the
  // Earnings tab uses). Payment-method ids are read separately inside each
  // detail screen (usePaymentInfo) and fall back to defaults if unavailable.
  const { data: earnings, isLoading } = useEarnings();
  const loading = isLoading && !earnings;

  // Numeric amount threaded into the next screen's params.
  const amountNum = (bucket: WithdrawBucket): number => {
    if (bucket === 'cashback') return earnings?.confirmedNum ?? 0;
    if (bucket === 'rewards') return earnings?.rewardsNum ?? 0;
    return earnings?.combinedNum ?? 0;
  };
  // Display string per bucket ("—" until the first fetch resolves).
  const amountText = (bucket: WithdrawBucket): string =>
    loading ? '—' : formatRupees(amountNum(bucket));

  // Which section(s) to show. The buckets aren't independent — "combined" is
  // just cashback + rewards — so showing all three is redundant whenever only
  // one type has a balance. Rule:
  //   only cashback  → Cashback
  //   only rewards   → Rewards
  //   both           → Cashback + Reward (combined; gift-card-only)
  // Until earnings resolve, default to Cashback (amounts read 0).
  const hasCashback = amountNum('cashback') > 0;
  const hasRewards = amountNum('rewards') > 0;
  const visibleBucket: WithdrawBucket =
    hasCashback && hasRewards ? 'combined' : hasRewards ? 'rewards' : 'cashback';
  const sections = SECTION_META.filter((s) => s.bucket === visibleBucket);

  // Rows per bucket, with live navigation wired in.
  const rowsFor = (bucket: WithdrawBucket): MethodRowItem[] => {
    if (bucket === 'cashback') {
      return [
        {
          icon: 'pay-UPI',
          label: 'UPI payments',
          onPress: () => {
            analytics.track(Events.WITHDRAW_METHOD_SELECT, {
              method: 'upi',
              payment_type: 'cashback',
            });
            navigation.navigate('WithdrawEnterUPI', {
              amount: amountNum('cashback'),
              paymentType: 'cashback',
            });
          },
        },
        // Bank Transfer has no Figma design yet → no-op (flagged).
        // Icon rendered at 80% — its art has less intrinsic padding than
        // the other method glyphs.
        {
          icon: 'pay-bank-transfer',
          iconSize: Math.round(mediaSize[32] * 0.8),
          label: 'Bank Transfer',
        },
        {
          glyph: <GiftCardGlyph />,
          label: 'Amazon / Flipkart Gift Card',
          onPress: () => {
            analytics.track(Events.WITHDRAW_METHOD_SELECT, {
              method: 'gift_card',
              payment_type: 'cashback',
            });
            navigation.navigate('WithdrawGiftCard', {
              amount: amountNum('cashback'),
              variant: 'cashback',
            });
          },
        },
      ];
    }
    // Rewards + Combined: one gift-card entry → Amazon/Flipkart chooser.
    const variant = bucket === 'rewards' ? 'rewards' : 'combined';
    return [
      {
        glyph: <GiftCardGlyph />,
        label: 'Amazon / Flipkart Gift Card',
        onPress: () => {
          analytics.track(Events.WITHDRAW_METHOD_SELECT, {
            method: 'gift_card',
            payment_type: variant,
          });
          navigation.navigate('WithdrawGiftCard', {
            amount: amountNum(bucket),
            variant,
          });
        },
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

          {/* Masthead headline = total available (confirmed cashback +
              rewards) from live earnings. Self-pads 16. */}
          <Masthead variant="payment" amount={amountText('combined')} />

          {sections.map((section, i) => (
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
