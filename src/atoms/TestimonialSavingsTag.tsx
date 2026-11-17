/**
 * DS-ADD(ds-figma-1, 2026-11-17): a line of spaced capitals between two short lines ("SAVED ₹30,000 ANNUALLY").
 * Figma: Q7235KVU3sU3HOTiibOXhv node 148:281153 (testimonial-savings-tag). Metrics from Figma values (2026-11-17):
 * row, gap 8, 15 high; each line 14 wide, hairline thick, gradient Iris/50 to Iris/600; label Outfit 800 10, wide letter spacing, gradient Iris/700 to Azure/600.
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * TestimonialSavingsTag — atom. New part (no existing atom draws a gradient label between lines).
 * Colours by role: label gradient gradients.primary (cobalt), lines fade colors.background.lavender to colors.action.accent.default.
 * The right line is the left line mirrored (inferred: only the left line was read). Type: caption10SemiBold (Figma ExtraBold 10; none at this weight).
 * The label is upper-cased here. Uses GradientText, which needs the native masked view: check on a device build.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientText } from './GradientText';
import { colors, spacing, borderWidth, gradients } from '../tokens';

export interface TestimonialSavingsTagProps {
  /** Already formatted, e.g. "Saved ₹30,000 annually". */
  label: string;
  style?: StyleProp<ViewStyle>;
}

const LINE_W = spacing[12] + spacing[2]; // Figma 14

function Line({ flip }: { flip?: boolean }) {
  return (
    <LinearGradient
      colors={[colors.background.lavender, colors.action.accent.default]}
      start={{ x: flip ? 1 : 0, y: 0 }}
      end={{ x: flip ? 0 : 1, y: 0 }}
      style={{ width: LINE_W, height: borderWidth.hairline }}
    />
  );
}

export function TestimonialSavingsTag({ label, style }: TestimonialSavingsTagProps) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }, style]}
    >
      <Line />
      <GradientText
        variant="caption10SemiBold"
        colors={gradients.primary.colors}
        start={gradients.primary.start}
        end={gradients.primary.end}
      >
        {label.toUpperCase()}
      </GradientText>
      <Line flip />
    </View>
  );
}
