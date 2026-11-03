/**
 * ProcessSteps — organism
 *
 * A vertical, reusable "what happens next" stepper: each step is a row of
 *   [ square icon tile ]  [ title + optional caption ]
 * connected by a dotted vertical line (rendered on every step except the
 * last). Built for the "How it works" flow (Figma 6173:12529) but kept
 * generic so any onboarding / status / explainer surface can reuse it —
 * the copy, icon, and caption are all caller-supplied.
 *
 * Distinct from organisms/Timeline (status stepper: circular indicators,
 * tone colours, dates) and from Carousels' HowItWorks (a HORIZONTAL
 * scroller). This is the vertical, square-tile, icon+caption variant.
 *
 * Layout (per step row):
 *   row, gap spacing[12], items stretch (so the connector can fill the
 *     row's height and reach the next tile).
 *   Left column (col, center): 44×44 square tile (radius.lg, bg
 *     action.primary.subtle) holding a 24px icon in action.primary.default,
 *     then a dotted vertical connector (flex:1) below it — omitted on the
 *     last step.
 *   Right column (col, flex:1): title (body14SemiBold / text.primary) +
 *     caption (body12Regular / text.secondary).
 *
 * Tokens:
 *   tile            → sizing.touchMin (44) · radius.lg · bg action.primary.subtle
 *   icon            → iconSize[24] · action.primary.default
 *   connector       → 2px dotted, colors.border.strong, minHeight spacing[16]
 *   row gap         → spacing[12]   · root gap spacing[16]
 *
 * NOTE (shade flag): the Figma tile fill reads a touch deeper than
 * action.primary.subtle (saffron[50]); we stay on the canonical subtle
 * orange surface token rather than reach into a primitive. Bump here if
 * the demo wants the deeper peach.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  sizing,
} from '../tokens';

export interface ProcessStep {
  /** Stable key. Falls back to the array index when omitted. */
  id?: string;
  /** Registered icon shown inside the square tile. Defaults to a clock. */
  icon?: IconName;
  /** Primary line — the step description. */
  title: string;
  /** Optional secondary line, e.g. "Generally takes 2–72 hrs". */
  caption?: string;
}

export interface ProcessStepsProps {
  steps: ProcessStep[];
  style?: StyleProp<ViewStyle>;
}

function StepRow({
  step,
  index,
  isLast,
}: {
  step: ProcessStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        gap: spacing[12],
        alignItems: 'stretch',
      }}
    >
      {/* Left column — numbered tile + dotted connector. The orange tile now
          carries the step number (1, 2, 3 …) rather than a clock glyph, which
          read as a timer. */}
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: sizing.touchMin,
            height: sizing.touchMin,
            borderRadius: radius.lg,
            backgroundColor: colors.action.primary.subtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="heading18SemiBold" color={colors.action.primary.default}>
            {index + 1}
          </Text>
        </View>

        {/* Dotted connector — fills the row height down to the next tile.
            Omitted on the last step (nothing to connect to). */}
        {!isLast ? (
          <View
            style={{
              flex: 1,
              minHeight: spacing[16],
              borderLeftWidth: borderWidth.heavy,
              borderStyle: 'dotted',
              borderColor: colors.border.strong,
            }}
          />
        ) : null}
      </View>

      {/* Right column — title + caption. paddingBottom gives breathing
          room before the next row when a connector is present. */}
      <View
        style={{
          flex: 1,
          gap: spacing[2],
          paddingTop: spacing[2],
          paddingBottom: isLast ? 0 : spacing[16],
        }}
      >
        <Text variant="body14SemiBold" color={colors.text.primary}>
          {step.title}
        </Text>
        {step.caption ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            {step.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProcessSteps({ steps, style }: ProcessStepsProps) {
  return (
    <View style={[{ width: '100%' }, style]}>
      {steps.map((step, i) => (
        <StepRow
          key={step.id ?? String(i)}
          step={step}
          index={i}
          isLast={i === steps.length - 1}
        />
      ))}
    </View>
  );
}
