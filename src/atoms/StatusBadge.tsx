/**
 * StatusBadge — atom (Figma set 3010:1106)
 *
 * Coloured dot + label, themed per status. Two orthogonal style axes
 * (the spec treats them as separate):
 *   • size    : 'default' (h36, "Cashback {Status}") | 'pill' (h24, "{Status}")
 *   • rounded : true → radius.full (pill corners) | false → radius.xs (4)
 *
 * Border is ALWAYS rendered, 1px in the status's dark tone (= the
 * `border` shade in colors.status.<status>). There is no opt-out — the
 * Figma component set ships the stroke on every variant.
 *
 * Geometry:
 *   padding left 12, right 16, gap 8 (constant across both sizes)
 *   padding vertical: 8 (default → h36) / 2 (pill → h24)
 *   dot 12×12 perfect circle (radius.full)
 *
 * Label text: body14Medium, colors.surface.dark (= slate[1000] = #000000,
 * the only semantic token whose value is pure black).
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, borderWidth } from '../tokens';

export type StatusBadgeStatus =
  | 'requested'
  | 'pending'
  | 'delayed'
  | 'cancelled'
  | 'confirmed'
  | 'paid'
  | 'expired';

export type StatusBadgeSize = 'default' | 'pill';

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  size?: StatusBadgeSize;
  /** true → radius.full (pill corners), false → radius.xs (squared 4). Default true. */
  rounded?: boolean;
  /** Override the auto-generated label (e.g. "Cashback Pending"). When
   *  omitted, label is derived from `status` + `size`. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const STATUS_LABEL: Record<StatusBadgeStatus, string> = {
  requested: 'Requested',
  pending: 'Pending',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  paid: 'Paid',
  expired: 'Expired',
};

// Vertical padding per size — landed on the spec heights:
//   default → padY 8 + body14Medium lh 20 = 36
//   pill    → padY 2 + body14Medium lh 20 = 24
const SIZE_PAD_Y: Record<StatusBadgeSize, number> = {
  default: spacing[8],
  pill: spacing[2],
};

// Dot diameter — component-spec value (12 also exists in iconSize and
// spacing, but a dot is neither, so it's a local const).
const DOT_SIZE = 12;

export function StatusBadge({
  status,
  size = 'default',
  rounded = true,
  label: labelOverride,
  style,
}: StatusBadgeProps) {
  const theme = colors.status[status];
  const label =
    labelOverride ??
    (size === 'default'
      ? `Cashback ${STATUS_LABEL[status]}`
      : STATUS_LABEL[status]);

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          paddingTop: SIZE_PAD_Y[size],
          paddingBottom: SIZE_PAD_Y[size],
          paddingLeft: spacing[12],
          paddingRight: spacing[16],
          borderRadius: rounded ? radius.full : radius.xs,
          backgroundColor: theme.bg,
          borderWidth: borderWidth.thin,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <View
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: radius.full,
          backgroundColor: theme.dot,
        }}
      />
      <Text variant="body14Medium" color={colors.surface.dark}>
        {label}
      </Text>
    </View>
  );
}
