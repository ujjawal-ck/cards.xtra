/**
 * Face of the card advisor avatar: eyes, brows, mouth.
 * Private to src/organisms/CreditCardAdvisorAvatar.tsx.
 *
 * Shapes never morph (no animated SVG props). Instead:
 *   eyes: an open-eye layer and a happy-arc layer, cross-faded; blink and
 *     widening are scale on the eye; the pupil is a nested translated view;
 *   mouth: one closed line per curve stop (MOUTH_CURVE_STOPS), cross-faded,
 *     plus one open-mouth layer that scales in height with the openness.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { colors, opacity } from '../../tokens';
import { MOUTH_CURVE_STOPS, MOUTH_SAG, curveLayerInput, curveLayerOutput } from '../../lib/advisorAvatar/pose';
import type { AvatarGeometry } from '../../lib/advisorAvatar/pose';
import type { AvatarMotion } from './useAvatarMotion';

const c = colors.advisorAvatar;
/** Openness below which the open mouth is hidden and the line shows. */
const OPEN_FADE: [number, number] = [0.03, 0.14];
/** Where the top lip sits in the open mouth box (fraction of its height). */
const OPEN_TOP = 0.15;

const box = (size: number, x: number, y: number, w: number, h: number) => ({
  position: 'absolute' as const,
  left: x * size,
  top: y * size,
  width: w * size,
  height: h * size,
});

export function Eye({ g, size, side, m }: { g: AvatarGeometry; size: number; side: 'left' | 'right'; m: AvatarMotion }) {
  const centre = side === 'left' ? g.eyeLeft : g.eyeRight;
  const { eyeRx: rx, eyeRy: ry, pupilR: pr } = g;
  const travelX = (rx - pr) * 0.9 * size;
  const travelY = (ry - pr) * 0.9 * size;

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + (m.eyeOpen.value - 1) * 0.5 },
      { scaleY: Math.max(0.01, m.eyeOpen.value * m.blink.value) },
    ] as unknown as { translateY: number }[],
  }));
  const openStyle = useAnimatedStyle(() => ({ opacity: 1 - m.happy.value }));
  const happyStyle = useAnimatedStyle(() => ({ opacity: m.happy.value }));
  const pupilStyle = useAnimatedStyle(() => {
    let x = m.pupilX.value + m.pupilDrift.value;
    let y = m.pupilY.value;
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    return {
      transform: [{ translateX: x * travelX }, { translateY: y * travelY }] as unknown as { translateY: number }[],
    };
  });

  const arcStroke = rx * 0.38;
  return (
    <Animated.View style={[box(size, centre.x - rx, centre.y - ry, rx * 2, ry * 2), eyeStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, openStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${rx * 2} ${ry * 2}`}>
          <Ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill={c.eyeWhite} />
        </Svg>
        <Animated.View style={[box(size, rx - pr, ry - pr, pr * 2, pr * 2), pupilStyle]}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${pr * 2} ${pr * 2}`}>
            <Circle cx={pr} cy={pr} r={pr} fill={c.pupil} />
            <Circle cx={pr * 1.35} cy={pr * 0.65} r={pr * 0.32} fill={c.eyeShine} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, happyStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${rx * 2} ${ry * 2}`}>
          <Path
            d={`M ${arcStroke} ${ry * 1.35} Q ${rx} ${ry * 0.05} ${rx * 2 - arcStroke} ${ry * 1.35}`}
            stroke={c.eyeWhite}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export function Brow({ g, size, side, m }: { g: AvatarGeometry; size: number; side: 'left' | 'right'; m: AvatarMotion }) {
  const cx = side === 'left' ? g.eyeLeft.x : g.eyeRight.x;
  const w = g.browW;
  const h = g.browStroke * 4;
  const s = g.browStroke;
  const lift = g.eyeRy * size;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (m.browLift.value + m.browBob.value) * lift },
      // Positive browAngle lifts the inner ends (concern).
      { rotate: `${side === 'left' ? -m.browAngle.value : m.browAngle.value}deg` },
    ] as unknown as { translateY: number }[],
  }));
  return (
    <Animated.View style={[box(size, cx - w / 2, g.browY - h / 2, w, h), style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
        <Path
          d={`M ${s} ${h * 0.62} Q ${w / 2} ${h * 0.15} ${w - s} ${h * 0.62}`}
          stroke={c.brow}
          strokeWidth={s}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

function MouthLine({ index, w, bh, stroke, m }: { index: number; w: number; bh: number; stroke: number; m: AvatarMotion }) {
  const curve = MOUTH_CURVE_STOPS[index];
  const input = curveLayerInput(index);
  const output = curveLayerOutput(index);
  const style = useAnimatedStyle(() => ({
    opacity:
      interpolate(m.mouthCurve.value, input, output, Extrapolation.CLAMP) *
      (1 - interpolate(m.mouthOpen.value, OPEN_FADE, [0, 1], Extrapolation.CLAMP)),
  }));
  // Quadratic: the visible dip is half the control offset. Centre it on the box.
  const dip = curve * MOUTH_SAG * w;
  const mid = bh / 2;
  const y0 = mid - dip / 2;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w + stroke * 2} ${bh}`}>
        <Path
          d={`M ${stroke} ${y0} Q ${stroke + w / 2} ${y0 + dip * 2} ${stroke + w} ${y0}`}
          stroke={c.mouth}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

export function Mouth({ g, size, m }: { g: AvatarGeometry; size: number; m: AvatarMotion }) {
  const { cx, cy, w, openH, stroke } = g.mouth;
  const bw = w + stroke * 2;
  const bh = Math.max(openH, MOUTH_SAG * w) * 2 + stroke * 2;
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: m.mouthWidth.value }] }));
  const openPx = openH * size;
  const openStyle = useAnimatedStyle(() => {
    const s = Math.max(0.01, m.mouthOpen.value);
    return {
      opacity: interpolate(m.mouthOpen.value, OPEN_FADE, [0, 1], Extrapolation.CLAMP),
      // Scale about the box centre, then move up so the top lip stays put.
      transform: [{ translateY: (-(1 - s) * openPx) / 2 }, { scaleY: s }] as unknown as { translateY: number }[],
    };
  });
  const top = bh / 2 - OPEN_TOP * openH;
  return (
    <Animated.View style={[box(size, cx - bw / 2, cy - bh / 2, bw, bh), containerStyle]}>
      {MOUTH_CURVE_STOPS.map((_, i) => (
        <MouthLine key={i} index={i} w={w} bh={bh} stroke={stroke} m={m} />
      ))}
      <Animated.View style={[box(size, stroke, top, w, openH), openStyle]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${openH}`}>
          <Path
            d={`M 0 0 C 0 ${openH * 1.3} ${w} ${openH * 1.3} ${w} 0 Q ${w / 2} ${openH * 0.22} 0 0 Z`}
            fill={c.mouth}
          />
          <Ellipse cx={w / 2} cy={openH * 0.72} rx={w * 0.22} ry={openH * 0.2} fill={c.tongue} fillOpacity={opacity[100]} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
