import React from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Web shim for expo-linear-gradient.
 * Maps the {colors, start, end, locations} API to a CSS linear-gradient
 * so gradient tokens render in Storybook. Angle is approximated from
 * start/end unit coords.
 */
type Pt = { x: number; y: number };
export function LinearGradient({
  colors = ['#000', '#000'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  locations,
  style,
  children,
  ...rest
}: ViewProps & { colors?: string[]; start?: Pt; end?: Pt; locations?: number[] }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
  const stops = colors
    .map((c, i) => (locations ? `${c} ${Math.round(locations[i] * 100)}%` : c))
    .join(', ');
  return (
    <View
      {...rest}
      style={[style, { backgroundImage: `linear-gradient(${angle}deg, ${stops})` } as any]}
    >
      {children}
    </View>
  );
}
export default LinearGradient;
