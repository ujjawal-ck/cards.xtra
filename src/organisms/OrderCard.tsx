/**
 * OrderCard — organism (Figma "orders/list-v2-timeline", file
 * P7UcoZYBnfyefmJIA8wcM7, node 6194:26502)
 *
 * The revamped orders-list row: a self-contained rounded CARD (replaces the
 * old flat <OrderRow>). One card per order, parameterized by lifecycle
 * `status` and `type`.
 *
 * Anatomy (top → bottom), card padding spacing[20] all round:
 *   1. StatusTrack — a status-tinted rounded strip (bg = colors.status[*].bg).
 *      Left: 24px status glyph + "Status: {Word}" (body14SemiBold, dark).
 *      Right: 20px chevron — shown ONLY when the card is tappable (onPress);
 *      referrals have no detail page, so no chevron (Figma: referral variants
 *      omit it).
 *   2. Body row 1 (marginTop spacing[20]): LogoContainer (80×48) on the left;
 *      a right-aligned amount block — label (body12Regular / text.secondary)
 *      stacked above the value (body16SemiBold / text.primary).
 *   3. Body row 2 (marginTop spacing[16]): a stacked label/value pair —
 *      "Order ID" / "Referral Name" / "Bonus Type" over its value
 *      (body14SemiBold / text.primary, single line, ellipsized).
 *   4. Note (optional, marginTop spacing[20]): a 1px divider, then
 *      "Note: …" (body12Regular / text.secondary) with an inline cobalt
 *      "More"/"Less" toggle (collapsed → 2 lines).
 *
 * Status → strip tint + glyph (reuses the app's lifecycle tokens, so the
 * card stays in lockstep with <StatusBadge>):
 *   pending/requested/delayed → amber/violet/saffron tint, clock-outline
 *   confirmed/paid            → fern/cobalt tint, check-circle-outline
 *   cancelled/expired         → ruby/slate tint, desc-cross
 *
 * Token map (per property):
 *   card bg            → colors.surface.default
 *   card border        → borderWidth.thin / colors.border.default
 *   card radius        → radius.xl (16)
 *   card padding       → spacing[20]
 *   card shadow        → elevation.light.xs
 *   status strip bg    → colors.status[status].bg
 *   status strip radius→ radius.lg (12) · px spacing[12] · py spacing[8]
 *   status glyph/text  → colors.icon.actions / colors.text.primary
 *   amount/meta label  → body12Regular / colors.text.secondary
 *   amount value       → body16SemiBold / colors.text.primary
 *   meta value         → body14SemiBold / colors.text.primary
 *   divider            → borderWidth.thin / colors.border.default
 *   note body / "Note:"→ body12Regular · body12SemiBold / colors.text.secondary
 *   note More/Less     → body12SemiBold / colors.action.accent.default (cobalt)
 *
 * Note: the Figma "Paid" variant shows a small 3-dot ornament beside the
 * chevron; it maps to no data and appears on that one variant only, so it is
 * intentionally omitted.
 */
import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, Icon, LogoContainer } from '../atoms';
import type { IconName, StatusBadgeStatus } from '../atoms';
import { haptics } from '../lib/haptics';
import {
  colors,
  spacing,
  radius,
  iconSize,
  borderWidth,
  elevation,
} from '../tokens';
import type { OrderRowType, OrderRowNote } from './OrderRow';

export interface OrderCardProps {
  /** cashback | rewards | referral | bonus — drives both label rows. */
  type: OrderRowType;
  /** Lifecycle status — drives the strip tint + glyph + label. */
  status: StatusBadgeStatus;
  /** Formatted amount, e.g. "₹19.9". */
  amount: string;
  /** Value for the second row (order id / referral name / bonus type). */
  metaValue: string;
  note?: OrderRowNote;
  logoSrc: ImageSourcePropType;
  /** When provided the card is tappable and shows the chevron. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const STATUS_WORD: Record<StatusBadgeStatus, string> = {
  requested: 'Requested',
  pending: 'Pending',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  paid: 'Paid',
  expired: 'Expired',
};

const STATUS_ICON: Record<StatusBadgeStatus, IconName> = {
  requested: 'clock-outline',
  pending: 'clock-outline',
  delayed: 'clock-outline',
  cancelled: 'desc-cross',
  confirmed: 'check-circle-outline',
  paid: 'check-circle-outline',
  expired: 'desc-cross',
};

/** Right-aligned amount-block label per order type. */
const AMOUNT_LABEL: Record<OrderRowType, string> = {
  cashback: 'Total Cashback',
  rewards: 'Total Rewards',
  referral: 'Referral Amount',
  bonus: 'Total Bonus',
};

/** Second-row (meta) label per order type. */
const META_LABEL: Record<OrderRowType, string> = {
  cashback: 'Order ID',
  rewards: 'Order ID',
  referral: 'Referral Name',
  bonus: 'Bonus Type',
};

/** 20px right-pointing chevron — no `chevron-right` in the Icon registry. */
function ChevronRightGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6 L15 12 L9 18"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function OrderCard({
  type,
  status,
  amount,
  metaValue,
  note,
  logoSrc,
  onPress,
  style,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = colors.status[status];

  const body = (
    <View
      style={[
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          padding: spacing[20],
          ...elevation.light.xs,
        },
        style,
      ]}
    >
      {/* 1. StatusTrack — tinted strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.bg,
          borderRadius: radius.lg,
          paddingHorizontal: spacing[12],
          paddingVertical: spacing[8],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
          <Icon name={STATUS_ICON[status]} size={iconSize[24]} color={colors.icon.actions} />
          <Text variant="body14SemiBold" color={colors.text.primary}>
            Status: {STATUS_WORD[status]}
          </Text>
        </View>
        {onPress ? (
          <ChevronRightGlyph size={iconSize[20]} color={colors.icon.actions} />
        ) : null}
      </View>

      {/* 2. Body row 1 — logo + amount block */}
      <View
        style={{
          marginTop: spacing[20],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <LogoContainer source={logoSrc} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="body12Regular" color={colors.text.secondary}>
            {AMOUNT_LABEL[type]}
          </Text>
          <Text variant="body16SemiBold" color={colors.text.primary}>
            {amount}
          </Text>
        </View>
      </View>

      {/* 3. Body row 2 — meta label/value */}
      <View style={{ marginTop: spacing[16] }}>
        <Text variant="body12Regular" color={colors.text.secondary}>
          {META_LABEL[type]}
        </Text>
        <Text
          variant="body14SemiBold"
          color={colors.text.primary}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {metaValue}
        </Text>
      </View>

      {/* 4. Note (optional) — divider + expandable text */}
      {note ? (
        <View style={{ marginTop: spacing[20] }}>
          <View
            style={{ height: borderWidth.thin, backgroundColor: colors.border.default }}
          />
          <View
            style={{
              marginTop: spacing[16],
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing[4],
            }}
          >
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              numberOfLines={note.expandable && !expanded ? 2 : undefined}
              style={{ flex: 1 }}
            >
              <Text variant="body12SemiBold" color={colors.text.secondary}>
                Note:{' '}
              </Text>
              {note.text}
            </Text>
            {note.expandable ? (
              <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={spacing[8]}>
                <Text variant="body12SemiBold" color={colors.action.accent.default}>
                  {expanded ? 'Less' : 'More'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable
      onPress={() => {
        haptics.impact('light');
        onPress();
      }}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}
