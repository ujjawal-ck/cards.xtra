/**
 * DividerVertical — atom (Figma 3134:48078)
 *
 * Four styles via the `style` prop, width 1, height defaults to 80:
 *   'solid'  — 1px line in border.default
 *   'fade'   — 1px vertical gradient: 0 alpha → full @50% → 0 alpha
 *   'dashed' — 1px dashed line, pattern [2, 2]
 *   'or'     — column of [24px line] + "Or" + [24px line]
 *
 * Dashed uses react-native-svg with `strokeDasharray` so the pattern
 * matches the spec exactly across platforms.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { colors, spacing, borderWidth } from '../tokens';

export type DividerVerticalStyle = 'solid' | 'fade' | 'dashed' | 'or';

export interface DividerVerticalProps {
  style?: DividerVerticalStyle;
  height?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_HEIGHT = 80;
const DEFAULT_WIDTH = borderWidth.thin; // 1
const OR_SEGMENT_HEIGHT = 24;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function SolidLine({ height }: { height: number }) {
  return (
    <View
      style={{
        width: DEFAULT_WIDTH,
        height,
        backgroundColor: colors.border.default,
      }}
    />
  );
}

function FadeLine({ height }: { height: number }) {
  const c = colors.border.default;
  return (
    <LinearGradient
      colors={[hexToRgba(c, 0), hexToRgba(c, 1), hexToRgba(c, 0)]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ width: DEFAULT_WIDTH, height }}
    />
  );
}

function DashedLine({ height }: { height: number }) {
  return (
    <Svg width={DEFAULT_WIDTH} height={height}>
      <Line
        x1={DEFAULT_WIDTH / 2}
        y1={0}
        x2={DEFAULT_WIDTH / 2}
        y2={height}
        stroke={colors.border.default}
        strokeWidth={DEFAULT_WIDTH}
        strokeDasharray="2 2"
      />
    </Svg>
  );
}

function OrColumn() {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <View
        style={{
          width: DEFAULT_WIDTH,
          height: OR_SEGMENT_HEIGHT,
          backgroundColor: colors.border.default,
        }}
      />
      <Text variant="body12Medium" color={colors.text.tertiary}>
        Or
      </Text>
      <View
        style={{
          width: DEFAULT_WIDTH,
          height: OR_SEGMENT_HEIGHT,
          backgroundColor: colors.border.default,
        }}
      />
    </View>
  );
}

export function DividerVertical({
  style = 'solid',
  height = DEFAULT_HEIGHT,
  containerStyle,
}: DividerVerticalProps) {
  let body: React.ReactNode;
  switch (style) {
    case 'solid':
      body = <SolidLine height={height} />;
      break;
    case 'fade':
      body = <FadeLine height={height} />;
      break;
    case 'dashed':
      body = <DashedLine height={height} />;
      break;
    case 'or':
      body = <OrColumn />;
      break;
  }
  return <View style={containerStyle}>{body}</View>;
}
