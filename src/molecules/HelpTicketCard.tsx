/**
 * HelpTicketCard — molecule (Figma 4129:25303 in-review, 4129:25307 need-details)
 *
 * A status-ticket card surfacing the state of a missing-cashback help
 * request. The `status` prop is the master switch. Three variants are in
 * scope ('in-review', 'need-details', 'tracked'); more may be added later.
 *
 * 'tracked' (success) mirrors 'need-details' minus the NEED DETAILS tag
 * and timer: logo → title → order info → link CTA (e.g. "View Details").
 * bg colors.surface.default. The link CTA label is driven by `ctaLabel`
 * ("Add Details" | "Upload Screenshot" | "View Details" | …).
 *
 * COMMON (both variants):
 *   width            → '100%' (fills the px16 wrapper → 328 on a 360 frame;
 *                      Figma's fixed 328 is a flagged untokenized literal,
 *                      driven by the wrapper rather than baked in here)
 *   radius           → radius.lg (12)
 *   padding          → px spacing[16] / py spacing[12]
 *   layout           → column, gap spacing[16], overflow hidden
 *   brand logo       → <BrandLogoTile size="32"> (74×32) — REUSED, not rebuilt
 *   order info gap    → spacing[4]
 *   order info type   → typography.body12Regular / colors.text.secondary
 *
 * IN-REVIEW (bg colors.surface.default):
 *   [BrandLogoTile] → Header (col, gap spacing[2]):
 *       title  → body12SemiBold (letterSpacing wide, baked) / text.primary
 *       timer row (row, gap spacing[4]):
 *           label → body12SemiBold / text.primary, letterSpacing override
 *                   to .normal (the variant bakes wide; this row wants normal)
 *           <Timer> Error tone (clock16 + "hh:mm") — REUSED, not rebuilt
 *   → Order info
 *
 * NEED-DETAILS (bg colors.surface.alert = error-tone bgSubtle):
 *   top row (row, gap spacing[12], items center):
 *       [BrandLogoTile] + <Tag> "NEED DETAILS" — REUSED (Badges/Tags):
 *           size xs (body12Medium), squared (radius.xs), solid error fill
 *           (bgColor colors.feedback.error.default) + text.inverse label
 *   → Header (col, gap spacing[2]): title body12SemiBold (wide) / text.primary
 *   → Order info
 *   → link <Button> "Add Details" (variant link, size 36 → body12Medium,
 *       text.link, underline) + trailing forward-arrow glyph → onAddDetails
 *
 * REJECTED (Figma 4129:26811, bg colors.surface.default, no CTA):
 *   [BrandLogoTile] → title (body12SemiBold) + `subtitle` (body12Regular /
 *   text.secondary) → Order info → "Rejection Reason: …" (body12SemiBold /
 *   text.primary) when `rejectionReason` is supplied.
 */
import React from 'react';
import { View, StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, Timer, Tag, Button, BrandLogoTile } from '../atoms';
import {
  colors,
  spacing,
  radius,
  iconSize,
  borderWidth,
  letterSpacing,
} from '../tokens';

export type HelpTicketStatus = 'in-review' | 'need-details' | 'tracked' | 'under-review' | 'rejected';

export interface HelpTicketCardProps {
  status: HelpTicketStatus;
  /** Brand/card image rendered inside the 74×32 BrandLogoTile. */
  brandLogo: ImageSourcePropType;
  title: string;
  orderId: string;
  /** Numeric amount string; the ₹ symbol is prefixed by the component. */
  orderAmount?: string;
  /**
   * Ticket reference (under-review). When set it renders a "Ticket ID: …" line
   * in place of "Order Amount: …".
   */
  ticketId?: string;
  /** Countdown value as "hh:mm" (e.g. "23:59"). in-review fallback when no timerTarget. */
  timer?: string;
  /**
   * Epoch-ms target for a LIVE countdown (in-review). Ticks every second and
   * renders as "02d : 48m : 53s"; takes precedence over the static `timer`.
   */
  timerTarget?: number;
  /** Fixed date for "Expect update by <date>" (under-review), e.g. "9th Jun '26". */
  expectByDate?: string;
  /** Leading label on the timer row (in-review). Defaults to "Expect update in". */
  timerLabel?: string;
  /** Link CTA label (need-details / tracked). Defaults to "Add Details". */
  ctaLabel?: string;
  /** Tapped on the link CTA (need-details / tracked). */
  onCtaPress?: () => void;
  /** Secondary line under the title (e.g. rejected: "Check your email…"). */
  subtitle?: string;
  /** Rejected only — rendered as "Rejection Reason: …" below the order info. */
  rejectionReason?: string;
  style?: StyleProp<ViewStyle>;
}

/** "23:59" → { hours: 23, minutes: 59 }. Missing parts default to 0. */
function parseHhMm(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(':');
  return { hours: parseInt(h, 10) || 0, minutes: parseInt(m, 10) || 0 };
}

/**
 * Thin right-pointing forward arrow. No `forwardarrow` ships in the Icon
 * registry (the only "right" glyph, `desc-right`, bakes a semantic colour
 * and ignores `color`), so — per the Header organism's precedent for
 * missing glyphs — it's drawn inline at borderWidth.thick stroke and
 * tinted via `color`. Replace with <Icon name="forwardarrow" …> once that
 * SVG ships. Figma asks for 12px; sized by the caller.
 */
function ForwardArrowGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2 6 L10 6"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
      />
      <Path
        d="M6.5 2.5 L10 6 L6.5 9.5"
        stroke={color}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Shared two-line order-info block. The second line is the Ticket ID when one
 * is supplied (under-review tickets), otherwise the Order Amount.
 */
function OrderInfo({
  orderId,
  orderAmount,
  ticketId,
}: {
  orderId: string;
  orderAmount?: string;
  ticketId?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'column',
        gap: spacing[4],
        alignItems: 'flex-start',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Text variant="body12Regular" color={colors.text.secondary} style={{ width: '100%' }}>
        {`Order ID: ${orderId}`}
      </Text>
      <Text variant="body12Regular" color={colors.text.secondary} style={{ width: '100%' }}>
        {ticketId ? `Ticket ID: ${ticketId}` : `Order Amount: ₹${orderAmount ?? '0'}`}
      </Text>
    </View>
  );
}

export function HelpTicketCard({
  status,
  brandLogo,
  title,
  orderId,
  orderAmount,
  ticketId,
  timer = '00:00',
  timerTarget,
  expectByDate,
  timerLabel,
  ctaLabel = 'Add Details',
  onCtaPress,
  subtitle,
  rejectionReason,
  style,
}: HelpTicketCardProps) {
  const isNeedDetails = status === 'need-details';
  const isInReview = status === 'in-review';
  const isUnderReview = status === 'under-review';
  // The link CTA (label + forward arrow) shows on both action states — never
  // on under-review tickets (they're informational, no action to take).
  const hasCta = isNeedDetails || status === 'tracked';
  // Default the timer-row label by state: a live countdown vs a fixed date.
  const rowLabel = timerLabel ?? (isUnderReview ? 'Expect update by' : 'Expect update in');

  return (
    <View
      style={[
        {
          backgroundColor: isNeedDetails
            ? colors.surface.alert
            : colors.surface.default,
          flexDirection: 'column',
          gap: spacing[16],
          alignItems: 'flex-start',
          overflow: 'hidden',
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
          borderRadius: radius.lg,
          width: '100%',
        },
        style,
      ]}
    >
      {isNeedDetails ? (
        /* Top row — logo + NEED DETAILS tag */
        <View
          style={{
            flexDirection: 'row',
            gap: spacing[12],
            alignItems: 'center',
          }}
        >
          <BrandLogoTile source={brandLogo} size="32" />
          <Tag
            label="NEED DETAILS"
            size="xs"
            pill={false}
            tone="error"
            bgColor={colors.feedback.error.default}
            labelColor={colors.text.inverse}
            borderColor={colors.feedback.error.default}
          />
        </View>
      ) : (
        <BrandLogoTile source={brandLogo} size="32" />
      )}

      {/* Header container */}
      <View
        style={{
          flexDirection: 'column',
          gap: spacing[2],
          alignItems: 'flex-start',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Title — body12SemiBold already carries letterSpacing wide (0.4) */}
        <Text
          variant="body12SemiBold"
          color={colors.text.primary}
          numberOfLines={2}
          style={{ width: '100%' }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text variant="body12Regular" color={colors.text.secondary} style={{ width: '100%' }}>
            {subtitle}
          </Text>
        ) : null}

        {/* Timer row — in-review (countdown) and under-review (fixed date) */}
        {isInReview || isUnderReview ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing[4],
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Label — body12SemiBold but letterSpacing NORMAL (the variant
                bakes wide; this row wants normal). */}
            <Text
              variant="body12SemiBold"
              color={colors.text.primary}
              style={{ letterSpacing: letterSpacing.normal }}
            >
              {rowLabel}
            </Text>
            {isUnderReview ? (
              <Timer label={expectByDate ?? '—'} />
            ) : timerTarget != null ? (
              <Timer targetTime={timerTarget} format="dd:mm:ss" />
            ) : (
              <Timer {...parseHhMm(timer)} format="hh:mm" />
            )}
          </View>
        ) : null}
      </View>

      {/* Order info */}
      <OrderInfo orderId={orderId} orderAmount={orderAmount} ticketId={ticketId} />

      {/* Rejection reason — rejected only, and only when the API sent one */}
      {status === 'rejected' && rejectionReason ? (
        <Text variant="body12SemiBold" color={colors.text.primary} style={{ width: '100%' }}>
          {`Rejection Reason: ${rejectionReason}`}
        </Text>
      ) : null}

      {/* Link CTA — need-details + tracked */}
      {hasCta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Button label={ctaLabel} variant="link" size={36} onPress={onCtaPress} />
          <ForwardArrowGlyph size={iconSize[12]} color={colors.text.link} />
        </View>
      ) : null}
    </View>
  );
}
