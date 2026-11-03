/**
 * Timer — atom (Figma set 3578:20769)
 *
 * Countdown chip in the Error tone. Clock icon + zero-padded time
 * digits, all pulled from colors.tones.error so re-theming the whole
 * tone re-themes this component.
 *
 * Geometry:
 *   padding vertical 4, horizontal 8, borderRadius radius.xs (4),
 *   gap spacing[4] between icon and time block.
 *   Height lands at exactly 24 from padY 4 + body12 lineHeight 16.
 *
 * Surface:
 *   'default'     → bg tones.error.bgSubtle (#fef1f1), 1px border tones.error.border (#f58f8f)
 *   'transparent' → no bg, no border (just icon + digits)
 *
 * Time digits & colons: body12SemiBold, colour tones.error.text (#d41000).
 * Rendered as separate Text segments with `gap: spacing[2]` between
 * each so colons sit slightly apart from the surrounding digits per
 * the Figma layout.
 *
 * Format:
 *   'hh:mm'    → "HH : MM"      (e.g. "23:59")
 *   'dd:hh:mm' → "DD : HH : MM" (e.g. "01:23:59")
 *
 * Values are zero-padded to 2 digits internally; passing 3 → "03".
 * Negative or fractional values are clamped to floor(max(0, n)).
 */
import React, { useEffect, useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';

export type TimerSurface = 'default' | 'transparent';
export type TimerFormat = 'hh:mm' | 'dd:hh:mm' | 'dd:mm:ss';

export interface TimerProps {
  surface?: TimerSurface;
  format?: TimerFormat;
  /** Rendered when format includes days ('dd:hh:mm' / 'dd:mm:ss'). Defaults to 0. */
  days?: number;
  hours?: number;
  minutes?: number;
  /** Only rendered when format='dd:mm:ss'. Defaults to 0. */
  seconds?: number;
  /**
   * Epoch-ms target. When set the chip ticks live every second, deriving its
   * segments from the time remaining (the days/hours/minutes/seconds props are
   * ignored). Pairs with format='dd:mm:ss' for the "02d : 48m : 53s" countdown.
   */
  targetTime?: number;
  /**
   * Renders this text in place of the computed time segments (e.g. a fixed
   * "Expect update by" date like "9th Jun '26"). The clock icon is hidden so
   * the chip reads as a date, not a countdown.
   */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

function pad2(n: number): string {
  const clamped = Math.max(0, Math.floor(n));
  return String(clamped).padStart(2, '0');
}

export function Timer({
  surface = 'default',
  format = 'hh:mm',
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
  targetTime,
  label,
  style,
}: TimerProps) {
  const tone = colors.tones.error;
  const isDefault = surface === 'default';

  // Live countdown: re-render once a second while a target is set.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (targetTime == null) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  let d = days;
  let h = hours;
  let m = minutes;
  let s = seconds;
  if (targetTime != null) {
    const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
    d = Math.floor(remaining / 86400);
    h = Math.floor((remaining % 86400) / 3600);
    m = Math.floor((remaining % 3600) / 60);
    s = remaining % 60;
  }

  // A `label` replaces the time block entirely (and hides the clock icon).
  const segments =
    label != null
      ? [label]
      : format === 'dd:mm:ss'
        ? [`${pad2(d)}d`, ':', `${pad2(m)}m`, `${pad2(s)}s`]
        : format === 'dd:hh:mm'
          ? [pad2(d), ':', pad2(h), ':', pad2(m)]
          : [pad2(h), ':', pad2(m)];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[8],
          borderRadius: radius.xs,
          backgroundColor: isDefault ? tone.bgSubtle : undefined,
          borderWidth: isDefault ? borderWidth.thin : 0,
          borderColor: isDefault ? tone.border : undefined,
        },
        style,
      ]}
    >
      {label == null ? <Icon name="clock-outline" size={iconSize[16]} color={tone.text} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {segments.map((seg, i) => (
          <Text key={i} variant="body12SemiBold" color={tone.text}>
            {seg}
          </Text>
        ))}
      </View>
    </View>
  );
}
