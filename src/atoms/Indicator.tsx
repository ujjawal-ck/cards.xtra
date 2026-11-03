/**
 * Indicator — atom (Figma set 3134:48174)
 *
 * Three variants:
 *
 *   'steps'    — dot progress (carousel / onboarding). A row of `total`
 *                pills, `gap spacing[2]`. Inactive pill = 6×6 circle in
 *                slate-200; active pill = 16×6 elongated pill in
 *                cobalt-200. `active` is a 0-based index.
 *
 *   'scroll'   — a 64-wide × 6-tall track with a 36-wide thumb that
 *                slides between left (`progress=0`) and right
 *                (`progress=1`). Thumb travel = trackW − thumbW = 28.
 *
 *   'progress' — story-style timed bars (hero carousel). A full-width row
 *                of `total` equal segments. Segments before `active` are
 *                fully filled, segments after are empty, and the `active`
 *                segment fills left→right over `durationMs` (the slide's
 *                hold time) — so the bar reaching 100% lines up with the
 *                auto-advance to the next slide. White fill over a
 *                translucent-white track, sized to read over a banner.
 *
 * Hex → token mapping:
 *   #eeeeee → colors.border.subtle3            (inactive pill / track bg)
 *   #aec3fd → colors.action.secondary.pressed  (active pill / thumb fill)
 *   #ffffff → colors.surface.default           (progress fill)
 *
 * Most dimensions land on spacing tokens (6, 16, 64); the 36-wide
 * thumb is a component-spec local const since the spacing scale skips
 * that step.
 */
import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { colors, primitives, spacing, radius } from '../tokens';

export type IndicatorVariant = 'steps' | 'scroll' | 'progress';

export interface IndicatorProps {
  variant: IndicatorVariant;
  /** 'steps' / 'progress' — number of dots / segments. Default 4. */
  total?: number;
  /** 'steps' / 'progress' — 0-based active index. Default 0. */
  active?: number;
  /** 'scroll' only — 0–1 progress along the track. Default 0. */
  progress?: number;
  /** 'progress' only — fill time of the active segment (ms) = the slide's
   *  hold time. 0 fills instantly (a static position indicator when there's
   *  no auto-advance). Default 3000. */
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

// All in px; first three exist as spacing tokens, last is component-spec.
const TRACK_H = spacing[6];           // 6
const DOT_DIA = spacing[6];           // 6
const ACTIVE_PILL_W = spacing[16];    // 16
const TRACK_W = spacing[64];          // 64
const THUMB_W = 36;                   // not in spacing scale; component-spec

// 'progress' (story-bar) dimensions — thin line per the design screenshot.
const PROGRESS_H = spacing[4];        // 4 — line thickness
const PROGRESS_GAP = spacing[6];      // 6 — gap between segments

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ----------------------------------------------------------------------------
// 'progress' segment — one timed bar. Past = full, future = empty, active
// fills 0→100% over durationMs. Re-keys on activeIndex so re-selecting the
// same slide restarts the fill.
// ----------------------------------------------------------------------------
type SegmentPhase = 'full' | 'active' | 'empty';

function ProgressSegment({
  phase,
  durationMs,
  activeIndex,
}: {
  phase: SegmentPhase;
  durationMs: number;
  activeIndex: number;
}) {
  const p = useSharedValue(phase === 'full' ? 1 : 0);

  useEffect(() => {
    cancelAnimation(p);
    if (phase === 'full') {
      p.value = 1;
    } else if (phase === 'empty') {
      p.value = 0;
    } else {
      // active — restart from empty and fill over the slide's hold time.
      p.value = 0;
      p.value =
        durationMs > 0
          ? withTiming(1, { duration: durationMs, easing: Easing.linear })
          : 1;
    }
  }, [phase, durationMs, activeIndex, p]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View
      style={{
        flex: 1,
        height: PROGRESS_H,
        borderRadius: radius.full,
        // Translucent-white track — the unfilled portion, legible over a
        // banner. No semantic translucent-white token exists; this mirrors
        // the PromoBanner scrim's use of the transparent-white primitives.
        backgroundColor: primitives.transparentWhite[40],
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: colors.surface.default,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function Indicator({
  variant,
  total = 4,
  active = 0,
  progress = 0,
  durationMs = 3000,
  style,
}: IndicatorProps) {
  if (variant === 'progress') {
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: PROGRESS_GAP,
            width: '100%',
          },
          style,
        ]}
      >
        {Array.from({ length: total }).map((_, i) => (
          <ProgressSegment
            key={i}
            phase={i < active ? 'full' : i === active ? 'active' : 'empty'}
            durationMs={durationMs}
            activeIndex={active}
          />
        ))}
      </View>
    );
  }

  if (variant === 'steps') {
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            height: TRACK_H,
          },
          style,
        ]}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i === active;
          return (
            <View
              key={i}
              style={{
                width: isActive ? ACTIVE_PILL_W : DOT_DIA,
                height: DOT_DIA,
                borderRadius: radius.full,
                backgroundColor: isActive
                  ? colors.action.secondary.pressed
                  : colors.border.subtle3,
              }}
            />
          );
        })}
      </View>
    );
  }

  // 'scroll'
  const p = clamp01(progress);
  const thumbLeft = p * (TRACK_W - THUMB_W);

  return (
    <View
      style={[
        {
          width: TRACK_W,
          height: TRACK_H,
          position: 'relative',
        },
        style,
      ]}
    >
      {/* Track */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: radius.full,
          backgroundColor: colors.border.subtle3,
        }}
      />
      {/* Sliding thumb */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: thumbLeft,
          width: THUMB_W,
          height: TRACK_H,
          borderRadius: radius.full,
          backgroundColor: colors.action.secondary.pressed,
        }}
      />
    </View>
  );
}
