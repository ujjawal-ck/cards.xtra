/**
 * Divider — atom (horizontal, Figma 3869:40338)
 *
 * Five styles via the `style` prop:
 *   'solid'      — 1px line in border.subtle3 (#eeeeee)
 *   'dashed'     — 1px dashed line in border.default (#d9e3ec), pattern [4, 8]
 *   'fade'       — 1px horizontal gradient: 0% alpha → full @50% → 0% alpha
 *                   (so the line fades in/out at both ends)
 *   'or'         — flex line / "Or" text / flex line
 *   'text-count' — label (+ optional counter) on the left at black-40%,
 *                   then a gradient line that fades from black-24% out to
 *                   the right edge
 *   'section'    — thick full-bleed band (8px, surface.sunken #f5f7f9) used
 *                   as a heavy section break between major page floors.
 *                   Override the shade via `color`.
 *
 * Dashed uses react-native-svg with `strokeDasharray` for exact pattern
 * control. RN's `borderStyle: 'dashed'` doesn't give pixel-precise
 * patterns and renders differently on iOS vs Android.
 *
 * Hex → token mapping:
 *   #eeeeee → colors.border.subtle3
 *   #d9e3ec → colors.border.default
 *   #878787 → colors.text.tertiary
 *   #000000 @ 40% → colors.divider.textCountFg
 *   #000000 @ 24% → colors.divider.textCountFadeStart
 */
import React, { useState } from 'react';
import {
  View,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { colors, spacing, borderWidth } from '../tokens';

export type DividerStyle =
  | 'solid'
  | 'dashed'
  | 'fade'
  | 'or'
  | 'text-count'
  | 'section';

export interface DividerProps {
  style?: DividerStyle;
  /** Label for 'text-count' style. */
  label?: string;
  /** Counter value for 'text-count' style. */
  counter?: number | string;
  /** Whether to render the counter when present. */
  showCounter?: boolean;
  /** Override the stroke color (currently honored by 'solid' and 'dashed'). */
  color?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_HEIGHT = borderWidth.thin; // 1

// Section-break band height — a thick full-bleed separator between
// major page floors (vs the hairline 1px line styles above).
const SECTION_HEIGHT = spacing[8]; // 8

// Helper — '#rrggbb' → 'rgba(r, g, b, alpha)'. Lets us compose the
// fade-style gradient stops directly off the border.default token
// instead of mirroring the colour in a separate rgba token.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ----------------------------------------------------------------------------
// Per-style render fns
// ----------------------------------------------------------------------------

function SolidLine({ color }: { color?: string }) {
  return (
    <View
      style={{
        width: '100%',
        height: DEFAULT_HEIGHT,
        backgroundColor: color ?? colors.border.subtle3,
      }}
    />
  );
}

function SectionBand({ color }: { color?: string }) {
  return (
    <View
      style={{
        width: '100%',
        height: SECTION_HEIGHT,
        backgroundColor: color ?? colors.surface.sunken,
      }}
    />
  );
}

function DashedLine({
  color = colors.border.default,
  pattern = '4 8',
}: {
  color?: string;
  pattern?: string;
}) {
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) =>
        setWidth(e.nativeEvent.layout.width)
      }
      style={{ width: '100%', height: DEFAULT_HEIGHT }}
    >
      {width > 0 ? (
        <Svg width={width} height={DEFAULT_HEIGHT}>
          <Line
            x1={0}
            y1={DEFAULT_HEIGHT / 2}
            x2={width}
            y2={DEFAULT_HEIGHT / 2}
            stroke={color}
            strokeWidth={DEFAULT_HEIGHT}
            strokeDasharray={pattern}
          />
        </Svg>
      ) : null}
    </View>
  );
}

function FadeLine() {
  const c = colors.border.default;
  return (
    <LinearGradient
      colors={[hexToRgba(c, 0), hexToRgba(c, 1), hexToRgba(c, 0)]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ width: '100%', height: DEFAULT_HEIGHT }}
    />
  );
}

function OrRow() {
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <View
        style={{
          flex: 1,
          height: DEFAULT_HEIGHT,
          backgroundColor: colors.border.default,
        }}
      />
      <Text variant="body12Medium" color={colors.text.tertiary}>
        Or
      </Text>
      <View
        style={{
          flex: 1,
          height: DEFAULT_HEIGHT,
          backgroundColor: colors.border.default,
        }}
      />
    </View>
  );
}

function TextCountRow({
  label,
  counter,
  showCounter,
}: {
  label?: string;
  counter?: number | string;
  showCounter?: boolean;
}) {
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
        }}
      >
        {label ? (
          <Text
            variant="body14Regular"
            color={colors.divider.textCountFg}
          >
            {label}
          </Text>
        ) : null}
        {showCounter && counter !== undefined ? (
          <Text
            variant="body14SemiBold"
            color={colors.divider.textCountFg}
          >
            {counter}
          </Text>
        ) : null}
      </View>
      <LinearGradient
        colors={[colors.divider.textCountFadeStart, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, height: DEFAULT_HEIGHT }}
      />
    </View>
  );
}

// ----------------------------------------------------------------------------
// Dispatcher
// ----------------------------------------------------------------------------
export function Divider({
  style = 'solid',
  label,
  counter,
  showCounter = true,
  color,
  containerStyle,
}: DividerProps) {
  let body: React.ReactNode;
  switch (style) {
    case 'solid':
      body = <SolidLine color={color} />;
      break;
    case 'dashed':
      body = <DashedLine color={color} />;
      break;
    case 'fade':
      body = <FadeLine />;
      break;
    case 'or':
      body = <OrRow />;
      break;
    case 'text-count':
      body = (
        <TextCountRow
          label={label}
          counter={counter}
          showCounter={showCounter}
        />
      );
      break;
    case 'section':
      body = <SectionBand color={color} />;
      break;
  }
  return <View style={containerStyle}>{body}</View>;
}
