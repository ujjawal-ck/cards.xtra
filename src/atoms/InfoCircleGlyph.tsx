/**
 * InfoCircleGlyph — atom
 *
 * A small filled "ⓘ" info glyph drawn inline with react-native-svg, because
 * no info-circle SVG ships in src/assets/icons (same convention used for the
 * masthead back / close / share glyphs). Tints via the `color` prop.
 *
 * Used wherever a tappable "more info" affordance is needed (e.g. the fee
 * breakdown on CardFeeStrip and the CardDetailSheet fee section).
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, borderWidth } from '../tokens';

export interface InfoCircleGlyphProps {
  size: number;
  color: string;
}

export function InfoCircleGlyph({ size, color }: InfoCircleGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="8" fill={color} />
      {/* "i" — dot on top, stem below */}
      <Circle cx="8" cy="4.5" r="0.9" fill={colors.surface.default} />
      <Path
        d="M8 7 L8 11.5"
        stroke={colors.surface.default}
        strokeWidth={borderWidth.thick}
        strokeLinecap="round"
      />
    </Svg>
  );
}
