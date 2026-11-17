/**
 * DS-ADD(ds-figma-1, 2026-11-17): vertical stepper: a marker, a connector and a title with optional subtext per step.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1202:337539 (stepper, kind milestone, mobile). Kinds image 1967:16054, cashback-rules 1967:16130 and
 * info 1967:15957 were read at the root only (gap 4, widths 304 / 275 / 270); here they are the same Stepper with a per-step `indicator`.
 * Metrics from Figma values (2026-11-17): block = row, gap 12; marker column 20 wide; connector 4 wide with round bottom corners;
 * text block gap 4, 20 space under a step; title 14 and subtext 12 (Figma sf-pro 500).
 * Rollback: delete this file, src/atoms/StepIndicator.tsx, src/lib/stepper.ts (+ test), and the DS-ADD export lines in src/atoms/index.ts and src/molecules/index.ts.
 *
 * Stepper — molecule. New part. Compared with the existing parts: Timeline = 44 px tone circles + dashed 1 px connector + dates, for order status;
 * ProcessSteps = square icon tiles + dotted connector, orange; StepProgress (batch 1) = a bar with "2 of 6", no steps. None has 20 px markers, a
 * 4 px solid connector or the done / current / locked model, so this is new (see docs/ds-additions.md).
 * State: pass `currentIndex`; stepStates() gives done / current / locked. A step can set `indicator` to use info, footprints, cashback or image.
 * Type (nearest Outfit): title body14Medium, subtext body12Medium. Colours by role: done title feedback.success.text, done subtext feedback.success.default,
 * other text text.primary, connector done feedback.success.hover, pending feedback.success.border (Figma pending colour not read; inferred from the canvas).
 * Each step reads as "<title>, <state>" for screen readers; colour is never the only cue (the marker shape changes too).
 */
import React from 'react';
import { View, ImageSourcePropType } from 'react-native';
import { Text } from '../atoms';
import { StepIndicator, type StepIndicatorKind } from '../atoms/StepIndicator';
import { colors, spacing, radius } from '../tokens';
import { stepStates, stepLineKind, type StepState } from '../lib/stepper';

export interface StepperStep {
  id?: string;
  title: string;
  subtext?: string;
  /** Overrides the marker that the state would give. */
  indicator?: StepIndicatorKind;
  image?: ImageSourcePropType;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Index of the current step. Before it = done, after it = locked. Default 0. */
  currentIndex?: number;
}

const BAR_W = spacing[4];
const STATE_WORD: Record<StepState, string> = { done: 'done', current: 'current', locked: 'locked' };

export function Stepper({ steps, currentIndex = 0 }: StepperProps) {
  const states = stepStates(steps.length, currentIndex);
  return (
    <View>
      {steps.map((step, i) => {
        const state = states[i];
        const last = i === steps.length - 1;
        const done = state === 'done';
        const lineColor = stepLineKind(state) === 'done' ? colors.feedback.success.hover : colors.feedback.success.border;
        return (
          <View
            key={step.id ?? i}
            accessible
            accessibilityLabel={`${step.title}${step.subtext ? `. ${step.subtext}` : ''}. ${STATE_WORD[state]}`}
            style={{ flexDirection: 'row', gap: spacing[12] }}
          >
            <View style={{ alignItems: 'center' }}>
              <StepIndicator kind={step.indicator ?? state} image={step.image} />
              {!last ? (
                <View
                  style={{
                    flex: 1,
                    width: BAR_W,
                    borderBottomLeftRadius: radius.full,
                    borderBottomRightRadius: radius.full,
                    backgroundColor: lineColor,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: spacing[4], paddingBottom: last ? 0 : spacing[20] }}>
              <Text variant="body14Medium" color={done ? colors.feedback.success.text : colors.text.primary}>
                {step.title}
              </Text>
              {step.subtext ? (
                <Text variant="body12Medium" color={done ? colors.feedback.success.default : colors.text.primary}>
                  {step.subtext}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
