/**
 * Timeline — organism (Figma file P7UcoZYBnfyefmJIA8wcM7: paid 3919:40713,
 * cancelled 3919:40162)
 *
 * ✅ Reconciled against live Figma (figma-local, 2026-06-03) — nodes above.
 *   Flag 1 (tone hexes) ✅ CONFIRMED — get_variable_defs matches exactly:
 *     feedback/success/on-color #edfbf8, feedback/success/default #26a651,
 *     action/destructive/default #d41000, text/secondary #5c5c5c,
 *     icon/inverse #ffffff. (warning tone is not used in either Figma node;
 *     its tokens are unverifiable but left as-is for generic reuse.)
 *   Flag 2 (icon) ✅ CONFIRMED open-by-design — Figma uses a DIFFERENT icon
 *     per step (Cart, right-circle, wallet, close), all caller-supplied via
 *     `iconName`. Only step 2 uses `right-circle`, which is unregistered;
 *     callers substitute a registered check icon. NOTE: Figma's right-circle
 *     is an OUTLINE check-in-circle, so `check-circle-outline` is the closer
 *     visual match than `check-circle-filled` — caller-side concern, flagged.
 *   Flag 3 (connector) ✅ CONFIRMED — 1px DASHED, text/secondary #5c5c5c,
 *     height 80px, left border; rendered on every step except the last.
 *   Flag 4 (step copy/dates) ✅ CONFIRMED — copy/dates are caller-supplied
 *     data, not in this file. Figma reference copy: "Order placed",
 *     "Cashback tracked", "Confirmation  Pending" (two spaces), final tile
 *     "Status goes here" (paid, solid green Cart) / "Confirmation  Pending"
 *     (cancelled, solid red close); all dated "Sep 19,2025".
 *
 * Vertical status stepper. Each step = a "Status Tile" row:
 *   row, gap spacing[16], px spacing[16], items-start, full width.
 *   Left column (col, center): 44×44 circular indicator (radius.full,
 *     padding spacing[14]) holding a 24px icon, then a dashed vertical
 *     connector below it (every step EXCEPT the last).
 *   Right column (col, gap 0, paddingTop spacing[2]): title + date.
 *
 * fill:
 *   'soft'  (completed) → bg = tone's light surface, icon = tone's solid color
 *   'solid' (current/final) → bg = tone's solid color, icon = icon/inverse (#fff)
 *
 * Tone → token map (success / warning / error):
 *   success  soft bg  feedback.success.onColor (#edfbf8) · solid bg + soft icon
 *            feedback.success.default (#26a651)
 *   error    soft bg  feedback.error.subtle    (#fef1f1) · solid bg + soft icon
 *            action.destructive.default        (#d41000)
 *   warning  soft bg  feedback.warning.subtle  (#fff8e1) · solid bg + soft icon
 *            feedback.warning.default          (#fed624)
 *   solid-state icon  → colors.icon.inverse (#ffffff)
 *
 * Other tokens:
 *   indicator size 44   → sizing.touchMin (44) · radius.full · padding spacing[14]
 *   icon                → iconSize[24]
 *   connector           → 1px DASHED, colors.text.secondary (#5c5c5c), height spacing[40]
 *   title               → typography.body14Medium / colors.text.primary
 *   date                → typography.caption10Regular / colors.text.primary
 *   root                → col, gap spacing[4], py spacing[16], full width
 *
 * Icons: pass REGISTERED names. The Figma "right-circle" (check-in-circle)
 * is NOT registered — callers substitute `check-circle-filled` (flagged at
 * the call site). `cart-*` / `wallet-*` are registered.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Icon } from '../atoms';
import type { IconName } from '../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
} from '../tokens';

export type TimelineTone = 'success' | 'warning' | 'error' | 'brand';
export type TimelineFill = 'soft' | 'solid';

export interface TimelineStep {
  iconName: IconName;
  title: string;
  date: string;
  fill: TimelineFill;
  tone: TimelineTone;
}

export interface TimelineProps {
  steps: TimelineStep[];
  style?: StyleProp<ViewStyle>;
}

// Per-tone: the soft surface (completed-step bg) + the solid colour (current
// step bg AND the soft step's icon tint). No invented hex — all semantic.
const TONE_MAP: Record<TimelineTone, { soft: string; solid: string }> = {
  success: { soft: colors.feedback.success.onColor, solid: colors.feedback.success.default },
  warning: { soft: colors.feedback.warning.subtle, solid: colors.feedback.warning.default },
  error: { soft: colors.feedback.error.subtle, solid: colors.action.destructive.default },
  // Saffron orange — used by the "delayed" cashback state (Figma shows an
  // orange info-circle, not the amber warning tone).
  brand: { soft: colors.action.primary.subtle, solid: colors.action.primary.default },
};

function StatusTile({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  const tone = TONE_MAP[step.tone];
  const isSolid = step.fill === 'solid';
  const bg = isSolid ? tone.solid : tone.soft;
  const iconColor = isSolid ? colors.icon.inverse : tone.solid;

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        gap: spacing[16],
        paddingHorizontal: spacing[16],
        alignItems: 'flex-start',
      }}
    >
      {/* Left column — indicator + connector */}
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: sizing.touchMin,
            height: sizing.touchMin,
            borderRadius: radius.full,
            padding: spacing[14],
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={step.iconName} size={iconSize[24]} color={iconColor} />
        </View>

        {/* Dashed connector — omitted on the last step (which also keeps the
            tile shorter since nothing extends below the 44 circle). */}
        {!isLast ? (
          <View
            style={{
              width: borderWidth.thin,
              borderLeftWidth: borderWidth.thin,
              borderStyle: 'dashed',
              borderColor: colors.text.secondary,
              height: spacing[40],
            }}
          />
        ) : null}
      </View>

      {/* Right column — title + date */}
      <View style={{ flex: 1, gap: 0, paddingTop: spacing[2] }}>
        <Text variant="body14Medium" color={colors.text.primary}>
          {step.title}
        </Text>
        <Text variant="caption10Regular" color={colors.text.primary}>
          {step.date}
        </Text>
      </View>
    </View>
  );
}

export function Timeline({ steps, style }: TimelineProps) {
  return (
    <View style={[{ width: '100%', gap: spacing[4], paddingVertical: spacing[16] }, style]}>
      {steps.map((step, i) => (
        <StatusTile key={i} step={step} isLast={i === steps.length - 1} />
      ))}
    </View>
  );
}
