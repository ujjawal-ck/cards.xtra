/**
 * CardFeeStrip — molecule (Figma 3762:62051)
 *
 * Bottom strip of a CardTile. Three variants via `type`:
 *
 *   'lifetime-free' — green surfaceCalm gradient, ExtraBold title in
 *                     fern + subtitle in slate-700, solid cobalt
 *                     "Apply Now" button on the right.
 *   'discontinued'  — slate-150 fill, grey title + subtitle, subtle
 *                     cobalt "View Details" button.
 *   'with-fees'     — white fill, two-column fee block (Joining /
 *                     Annual) split by a vertical hairline, solid
 *                     cobalt "Apply Now" on the right.
 *
 * Layout: horizontal, space-between, radius.sm. Per-type padding per
 * spec (lifetime-free has padLeft 0 so the green band runs flush left).
 *
 * Button composition is pure — pulls from src/atoms/Button. The "Apply Now"
 * CTAs carry a trailing `chevron-right` (the DS chevron-down rotated 90°,
 * same stroke spec) as a forward affordance.
 *
 * Hex → token:
 *   surfaceCalm gradient (#f0f3dc → #dcf3df → #f0f3dc) → gradients.surfaceCalm
 *   #1e8c44 (fern-600) → colors.feedback.success.text  (= fern-700 #1a7a39,
 *                         closest semantic — drift one shade darker)
 *   #f5f7f9 → colors.surface.sunken
 *   #878787 → colors.text.tertiary
 *   #5c5c5c → colors.text.secondary
 *   #808387 → colors.text.tertiary (closest primitive — drift 1ch)
 *   #262626 → colors.text.primary
 *   #ffffff → colors.surface.default
 *   #d9e3ec → colors.border.default     (fee column divider)
 *   #0741ef / #0036da / #ebf0ff → handled by Button's solid+second + subtle+second
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  gradients,
} from '../tokens';

export type CardFeeStripType =
  | 'lifetime-free'
  | 'discontinued'
  | 'with-fees';

export interface CardFeeStripProps {
  type: CardFeeStripType;
  /** Required when type='with-fees'. GST-inclusive amount, e.g. "₹1,179". */
  joiningFee?: string;
  annualFee?: string;
  /** Deprecated — fee breakdowns are no longer shown on the tile (the
   *  amount is the GST-inclusive total). Kept optional for call-site compat. */
  joiningSub?: string;
  annualSub?: string;
  /** Overrides the default CTA label per type. */
  ctaLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** One fee column — label + GST-inclusive total amount. No tooltip; the
 *  value is the full price (Figma 1929:31123: Caption/10 label, Body/14
 *  SemiBold value). */
// Columns may shrink (minWidth 0) and keep each line to one row, so on a
// 360dp phone the fees fit beside the Apply Now button instead of running
// underneath it (the annual fee was hidden behind the button).
function FeeColumn({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={{ flexShrink: 1, minWidth: 0 }}>
      {/* No adjustsFontSizeToFit: Android shrank the label to unreadable
          type at large OS font sizes. The label may wrap to a 2nd line. */}
      <Text variant="caption10Regular" color={colors.text.tertiary} numberOfLines={2}>
        {label}
      </Text>
      <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );
}

function LifetimeFree({
  ctaLabel = 'Apply Now',
  onPress,
  style,
}: Pick<CardFeeStripProps, 'ctaLabel' | 'onPress' | 'style'>) {
  const grad = gradients.surfaceCalm;
  return (
    <View
      style={[
        {
          borderRadius: radius.sm,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={grad.colors}
        locations={grad.locations}
        start={grad.start}
        end={grad.end}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[8],
          paddingTop: spacing[8],
          paddingRight: spacing[12],
          paddingBottom: spacing[8],
          paddingLeft: 0,
        }}
      >
        <View style={{ flex: 1, paddingLeft: spacing[12] }}>
          <Text
            variant="heading16ExtraBold"
            color={colors.feedback.success.text}
          >
            LIFETIME FREE
          </Text>
          <Text variant="caption10Regular" color={colors.text.secondary}>
            No Annual Fees • No Joining Fees
          </Text>
        </View>
        <Button
          label={ctaLabel}
          variant="solid"
          tone="second"
          size={36}
          icon="trailing"
          iconName="chevron-right"
          onPress={onPress}
        />
      </LinearGradient>
    </View>
  );
}

function Discontinued({
  ctaLabel = 'View Details',
  onPress,
  style,
}: Pick<CardFeeStripProps, 'ctaLabel' | 'onPress' | 'style'>) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[8],
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[12],
          borderRadius: radius.sm,
          backgroundColor: colors.surface.sunken,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="heading16ExtraBold" color={colors.text.tertiary}>
          DISCONTINUED
        </Text>
        <Text variant="caption10Regular" color={colors.text.secondary}>
          Bank no longer offers this card
        </Text>
      </View>
      <Button
        label={ctaLabel}
        variant="subtle"
        tone="second"
        size={36}
        onPress={onPress}
      />
    </View>
  );
}

function WithFees({
  joiningFee = 'Free',
  annualFee = 'Free',
  ctaLabel = 'Apply Now',
  onPress,
  style,
}: Pick<
  CardFeeStripProps,
  'joiningFee' | 'annualFee' | 'ctaLabel' | 'onPress' | 'style'
>) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[8],
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[12],
          borderRadius: radius.sm,
          backgroundColor: colors.surface.default,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          flex: 1,
          minWidth: 0,
        }}
      >
        <FeeColumn label="Joining Fees" amount={joiningFee} />
        <View
          style={{
            width: borderWidth.thin,
            alignSelf: 'stretch',
            backgroundColor: colors.border.default,
          }}
        />
        <FeeColumn label="Annual Fees" amount={annualFee} />
      </View>
      <Button
        label={ctaLabel}
        variant="solid"
        tone="second"
        size={36}
        icon="trailing"
        iconName="chevron-right"
        onPress={onPress}
      />
    </View>
  );
}

export function CardFeeStrip(props: CardFeeStripProps) {
  switch (props.type) {
    case 'lifetime-free':
      return <LifetimeFree {...props} />;
    case 'discontinued':
      return <Discontinued {...props} />;
    case 'with-fees':
      return <WithFees {...props} />;
  }
}
