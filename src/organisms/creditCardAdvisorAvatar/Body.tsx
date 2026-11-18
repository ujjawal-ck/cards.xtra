/**
 * Body parts of the card advisor avatar: the card, legs, arms, glow, sparkles.
 * Private to src/organisms/CreditCardAdvisorAvatar.tsx.
 *
 * Static layers draw in a full-square <Svg> with viewBox 0 0 1 1, so the
 * geometry fractions from pose.ts are used as they are. Moving parts are
 * Animated.Views that wrap a small <Svg>; only their transform and opacity
 * animate (no animated SVG props).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Line, Path, Polygon, Rect, Stop } from 'react-native-svg';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { colors, gradients, opacity } from '../../tokens';
import { GLOW_PULSE_SCALE, THINKING_SPARKLES } from '../../lib/advisorAvatar/pose';
import type { AvatarGeometry } from '../../lib/advisorAvatar/pose';
import type { AvatarDetail } from '../../lib/advisorAvatar/types';
import type { AvatarMotion } from './useAvatarMotion';

const c = colors.advisorAvatar;
const BODY_GRADIENT_ID = 'swipeyBody';

/** Absolute box in dp from fractions of size. */
const box = (size: number, x: number, y: number, w: number, h: number) => ({
  position: 'absolute' as const,
  left: x * size,
  top: y * size,
  width: w * size,
  height: h * size,
});

export function CardBody({ g, size, detail }: { g: AvatarGeometry; size: number; detail: AvatarDetail }) {
  const { card, chip } = g;
  const premium = gradients.premium;
  const sheenPoints = g.sheen.map((p) => `${p.x},${p.y}`).join(' ');
  const chipMidY = chip.y + chip.h / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 1 1" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient
          id={BODY_GRADIENT_ID}
          x1={premium.start.x}
          y1={premium.start.y}
          x2={premium.end.x}
          y2={premium.end.y}
        >
          {premium.colors.map((col, i) => (
            <Stop key={col} offset={premium.locations[i]} stopColor={col} />
          ))}
        </LinearGradient>
      </Defs>
      {/* Darker underside: gives the card a little thickness. */}
      <Rect x={card.x} y={card.y + card.depth} width={card.w} height={card.h} rx={card.r} fill={c.outline} />
      <Rect
        x={card.x}
        y={card.y}
        width={card.w}
        height={card.h}
        rx={card.r}
        fill={`url(#${BODY_GRADIENT_ID})`}
        stroke={c.outline}
        strokeWidth={card.stroke}
      />
      <Polygon points={sheenPoints} fill={c.sheen} fillOpacity={opacity[16]} />
      {/* Chip with its contact lines. */}
      <Rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={chip.r} fill={c.chip} stroke={c.chipLine} strokeWidth={card.stroke * 0.6} />
      <Line x1={chip.x} y1={chipMidY} x2={chip.x + chip.w} y2={chipMidY} stroke={c.chipLine} strokeWidth={card.stroke * 0.5} />
      <Line x1={chip.x + chip.w / 3} y1={chip.y} x2={chip.x + chip.w / 3} y2={chip.y + chip.h} stroke={c.chipLine} strokeWidth={card.stroke * 0.5} />
      <Line x1={chip.x + (2 * chip.w) / 3} y1={chip.y} x2={chip.x + (2 * chip.w) / 3} y2={chip.y + chip.h} stroke={c.chipLine} strokeWidth={card.stroke * 0.5} />
      {detail !== 'compact' ? (
        <>
          <Ellipse cx={g.cheekLeft.x} cy={g.cheekLeft.y} rx={g.cheekRx} ry={g.cheekRy} fill={c.cheek} fillOpacity={opacity[50]} />
          <Ellipse cx={g.cheekRight.x} cy={g.cheekRight.y} rx={g.cheekRx} ry={g.cheekRy} fill={c.cheek} fillOpacity={opacity[50]} />
        </>
      ) : null}
      {detail === 'full' ? <Contactless g={g} /> : null}
    </Svg>
  );
}

/** Three waves pointing right, like the contactless mark on a real card. */
function Contactless({ g }: { g: AvatarGeometry }) {
  const { cx, cy, r, stroke } = g.contactless;
  const k = Math.SQRT1_2;
  return (
    <>
      {[1, 1.8, 2.6].map((m) => {
        const R = r * m;
        return (
          <Path
            key={m}
            d={`M ${cx + R * k} ${cy - R * k} A ${R} ${R} 0 0 1 ${cx + R * k} ${cy + R * k}`}
            stroke={c.contactless}
            strokeOpacity={opacity[80]}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </>
  );
}

export function Legs({ g, size }: { g: AvatarGeometry; size: number }) {
  const { xs, top, len, shoeRx, shoeRy } = g.legs;
  return (
    <Svg width={size} height={size} viewBox="0 0 1 1" style={{ position: 'absolute', left: 0, top: 0 }}>
      {xs.map((x, i) => {
        const out = i === 0 ? -1 : 1;
        const footX = x + out * len * 0.12;
        const footY = top + len;
        return (
          <React.Fragment key={i}>
            <Path
              d={`M ${x} ${top} L ${footX} ${footY - shoeRy * 0.5}`}
              stroke={c.limb}
              strokeWidth={g.limbStroke}
              strokeLinecap="round"
              fill="none"
            />
            <Ellipse
              cx={footX + out * shoeRx * 0.35}
              cy={footY}
              rx={shoeRx}
              ry={shoeRy}
              fill={c.shoe}
              stroke={c.outline}
              strokeWidth={g.card.stroke * 0.7}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** One arm: a box centred on the shoulder, so the rotation pivots there.
 *  The arm is drawn from the centre down and out; raising rotates it up. */
export function Arm({ g, size, side, m }: { g: AvatarGeometry; size: number; side: 'left' | 'right'; m: AvatarMotion }) {
  const half = g.armLen + g.gloveR + g.card.stroke;
  const shoulder = side === 'left' ? g.shoulderLeft : g.shoulderRight;
  const out = side === 'left' ? -1 : 1;
  const a = (g.armRestAngle * Math.PI) / 180;
  const endX = half + out * Math.sin(a) * g.armLen;
  const endY = half + Math.cos(a) * g.armLen;
  // A slight bend: the control point sits a little outside the straight line.
  const ctrlX = half + out * Math.sin(a) * g.armLen * 0.35 + out * g.armLen * 0.18;
  const ctrlY = half + Math.cos(a) * g.armLen * 0.55;

  const style = useAnimatedStyle(() => {
    const extra = side === 'left' ? m.gestureLeft.value : m.waveRight.value;
    const raise = m.armRaise.value + extra;
    // Left arm: clockwise lifts it. Right arm: counter-clockwise.
    return { transform: [{ rotate: `${side === 'left' ? raise : -raise}deg` }] };
  });

  return (
    <Animated.View style={[box(size, shoulder.x - half, shoulder.y - half, half * 2, half * 2), style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${half * 2} ${half * 2}`}>
        <Path
          d={`M ${half} ${half} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
          stroke={c.limb}
          strokeWidth={g.limbStroke}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={endX} cy={endY} r={g.gloveR} fill={c.glove} stroke={c.outline} strokeWidth={g.card.stroke * 0.7} />
      </Svg>
    </Animated.View>
  );
}

/** Soft ring behind the card (listening): two rounded layers, outer fainter. */
export function Glow({ g, size, m }: { g: AvatarGeometry; size: number; m: AvatarMotion }) {
  const { cx, cy, w, h, outerW, outerH } = g.glow;
  const style = useAnimatedStyle(() => ({
    opacity: m.glowOn.value * interpolate(m.glowPulse.value, [0, 1], [opacity[50], opacity[100]]),
    transform: [{ scale: 1 + GLOW_PULSE_SCALE * m.glowPulse.value }],
  }));
  return (
    <Animated.View style={[box(size, cx - outerW / 2, cy - outerH / 2, outerW, outerH), style]}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: outerW * size,
          height: outerH * size,
          borderRadius: (outerH * size) / 2.5,
          backgroundColor: c.glow,
          opacity: opacity[40],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: ((outerW - w) / 2) * size,
          top: ((outerH - h) / 2) * size,
          width: w * size,
          height: h * size,
          borderRadius: (h * size) / 3,
          backgroundColor: c.glow,
          opacity: opacity[80],
        }}
      />
    </Animated.View>
  );
}

/** One four-point sparkle. Slots below THINKING_SPARKLES twinkle in turn
 *  while thinking; every slot pops in on success. */
export function Sparkle({ g, size, index, m }: { g: AvatarGeometry; size: number; index: number; m: AvatarMotion }) {
  const s = g.sparkles[index];
  const inCluster = index < THINKING_SPARKLES;
  const style = useAnimatedStyle(() => {
    const twinkle = inCluster
      ? m.twinkleOn.value *
        interpolate(m.phase.value, [index, index + 0.5, index + 1], [0, 1, 0], Extrapolation.CLAMP)
      : 0;
    const still = inCluster ? m.cluster.value : 0;
    const start = index * 0.12;
    const local = interpolate(m.pop.value, [start, start + 0.5], [0, 1], Extrapolation.CLAMP);
    const popScale = interpolate(local, [0, 0.6, 1], [0, 1.25, 1], Extrapolation.CLAMP);
    const popOpacity = interpolate(local, [0, 0.3], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: Math.max(twinkle, still, popOpacity),
      transform: [{ scale: Math.max(0.5 + 0.5 * twinkle, still, popScale) }],
    };
  });
  return (
    <Animated.View style={[box(size, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2), style]}>
      <Svg width="100%" height="100%" viewBox="0 0 2 2">
        <Path
          d="M1 0 Q1.15 0.85 2 1 Q1.15 1.15 1 2 Q0.85 1.15 0 1 Q0.85 0.85 1 0 Z"
          fill={c.sparkle}
          stroke={c.chipLine}
          strokeWidth={0.08}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
