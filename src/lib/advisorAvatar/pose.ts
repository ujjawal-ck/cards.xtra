/**
 * pose.ts: the pure maths of the card advisor avatar ("Swipey").
 *
 * No React and no React Native here, so Jest can test it on Node.
 * The component is src/organisms/CreditCardAdvisorAvatar.tsx.
 *
 * All geometry is unitless: a fraction of the avatar size (the side of the
 * square). The component multiplies by `size`.
 */
import { ADVISOR_AVATAR_STATES } from './types';
import type { AdvisorAvatarState, AvatarDetail, AvatarPose } from './types';

/** The still pose of each state. Reduce motion and Android show exactly this.
 *  Each pose differs from the others in the eyes or the mouth, so the six
 *  states stay apart at 48 dp, where brows and limbs are not drawn. */
export const POSES: Record<AdvisorAvatarState, AvatarPose> = {
  idle: {
    tilt: 0,
    pupilX: 0,
    pupilY: 0,
    eyeOpen: 1,
    happyEyes: false,
    browLift: 0,
    browAngle: 0,
    mouthOpen: 0,
    mouthCurve: 0.6,
    armRaise: 0,
    sparkles: false,
    glow: false,
  },
  listening: {
    tilt: 4,
    pupilX: 0,
    pupilY: -0.1,
    eyeOpen: 1.18,
    happyEyes: false,
    browLift: -0.15,
    browAngle: 0,
    mouthOpen: 0,
    mouthCurve: 0.35,
    armRaise: 0,
    sparkles: false,
    glow: true,
  },
  thinking: {
    tilt: -2,
    pupilX: 0.35,
    pupilY: -0.6,
    eyeOpen: 1,
    happyEyes: false,
    browLift: -0.3,
    browAngle: 0,
    mouthOpen: 0,
    mouthCurve: 0.1,
    armRaise: 0,
    sparkles: true,
    glow: false,
  },
  speaking: {
    tilt: 0,
    pupilX: 0,
    pupilY: 0,
    eyeOpen: 1,
    happyEyes: false,
    browLift: -0.05,
    browAngle: 0,
    mouthOpen: 0.45,
    mouthCurve: 0.6,
    armRaise: 0,
    sparkles: false,
    glow: false,
  },
  success: {
    tilt: 0,
    pupilX: 0,
    pupilY: 0,
    eyeOpen: 1,
    happyEyes: true,
    browLift: -0.2,
    browAngle: 0,
    mouthOpen: 0.85,
    mouthCurve: 1,
    armRaise: 70,
    sparkles: true,
    glow: false,
  },
  error: {
    tilt: 0,
    pupilX: 0,
    pupilY: 0.1,
    eyeOpen: 1,
    happyEyes: false,
    browLift: -0.1,
    browAngle: 14,
    mouthOpen: 0,
    mouthCurve: -0.6,
    armRaise: -10,
    sparkles: false,
    glow: false,
  },
};

/** Width of the mouth per state, as a factor of the full mouth width.
 *  Thinking has a small mouth; the frown is a little narrow. */
export const MOUTH_WIDTH: Record<AdvisorAvatarState, number> = {
  idle: 1,
  listening: 0.85,
  thinking: 0.65,
  speaking: 1,
  success: 1.1,
  error: 0.85,
};

/** The mouth curves that have a drawn layer: one per distinct pose curve,
 *  low to high. A curve between two stops cross-fades the two layers. */
export const MOUTH_CURVE_STOPS: number[] = Array.from(
  new Set(ADVISOR_AVATAR_STATES.map((s) => POSES[s].mouthCurve)),
).sort((a, b) => a - b);

/** Input range for the opacity of mouth layer `index`. Strictly increasing,
 *  so it is safe for Reanimated `interpolate` (use with CLAMP). */
export function curveLayerInput(index: number): [number, number, number] {
  const s = MOUTH_CURVE_STOPS;
  const mid = s[index];
  const lo = index > 0 ? s[index - 1] : mid - 1;
  const hi = index < s.length - 1 ? s[index + 1] : mid + 1;
  return [lo, mid, hi];
}

/** Output range for mouth layer `index`: a tent, except that the end layers
 *  keep full weight past the lowest and highest stop. */
export function curveLayerOutput(index: number): [number, number, number] {
  const last = MOUTH_CURVE_STOPS.length - 1;
  return [index === 0 ? 1 : 0, 1, index === last ? 1 : 0];
}

/** Opacity of each mouth layer at `curve`: the same clamped linear
 *  interpolation the component runs on the UI thread. */
export function mouthCurveWeights(curve: number): number[] {
  return MOUTH_CURVE_STOPS.map((_, i) => {
    const [lo, mid, hi] = curveLayerInput(i);
    const [a, b, c] = curveLayerOutput(i);
    if (curve <= lo) return a;
    if (curve >= hi) return c;
    if (curve <= mid) return a + ((b - a) * (curve - lo)) / (mid - lo);
    return b + ((c - b) * (curve - mid)) / (hi - mid);
  });
}

/** How much to draw at a size: below 72 compact, below 140 standard, else full. */
export function detailForSize(size: number): AvatarDetail {
  if (size < 72) return 'compact';
  if (size < 140) return 'standard';
  return 'full';
}

/** undefined stays undefined; NaN is 0; the rest is clamped to 0..1. */
export function clampAudioLevel(level: number | undefined): number | undefined {
  if (level === undefined) return undefined;
  if (Number.isNaN(level)) return 0;
  return Math.min(1, Math.max(0, level));
}

/** Mouth openness: follows the audio level only while speaking. */
export function mouthOpenFor(state: AdvisorAvatarState, audioLevel: number | undefined): number {
  const level = clampAudioLevel(audioLevel);
  if (state === 'speaking' && level !== undefined) return 0.15 + 0.85 * level;
  return POSES[state].mouthOpen;
}

const STATE_PHRASE: Record<AdvisorAvatarState, string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  success: 'Found cards',
  error: 'Something went wrong',
};

/** Screen-reader label: the custom one when given, else name plus state. */
export function accessibilityLabelFor(state: AdvisorAvatarState, custom?: string): string {
  if (custom && custom.trim().length > 0) return custom;
  return `Swipey, your card advisor. ${STATE_PHRASE[state]}`;
}

// ---------------------------------------------------------------------------
// Motion amounts (unitless). Durations live in the component.

/** Idle float travel, fraction of size. */
export const FLOAT_AMPLITUDE = 0.03;
/** Speaking bounce travel, fraction of size. */
export const BOUNCE_AMPLITUDE = 0.015;
/** Success hop height, fraction of size. */
export const HOP_HEIGHT = 0.07;
/** Error shake swing, fraction of size. */
export const SHAKE_AMPLITUDE = 0.03;
/** Listening breath, scale added at the top of a breath. */
export const BREATH_SCALE = 0.015;
/** Blink: eye scaleY at the closed point. */
export const BLINK_CLOSED = 0.1;
/** Idle wave: extra arm raise, degrees. */
export const WAVE_RAISE = 100;
/** Speaking gesture: extra arm raise, degrees. */
export const GESTURE_RAISE = 30;
/** Thinking: side to side pupil drift around the pose, fraction of travel. */
export const PUPIL_DRIFT = 0.3;
/** Thinking: extra brow lift at the top of a bob, fraction of eye radius. */
export const BROW_BOB = -0.15;
/** Listening glow: scale added at the top of a pulse. */
export const GLOW_PULSE_SCALE = 0.03;
/** Visible dip of the closed mouth at curve 1, as a fraction of the mouth width.
 *  Large enough that smile and frown differ by more than a stroke at 48 dp. */
export const MOUTH_SAG = 0.4;
/** Fallback mouth loop while speaking without audio: openness steps. */
export const SPEAKING_MOUTH_STEPS = [0.55, 0.2, 0.75, 0.35, 0.6, 0.15];

// ---------------------------------------------------------------------------
// Geometry

export interface Point {
  x: number;
  y: number;
}

export interface AvatarGeometry {
  /** Card body: top-left, width, height, corner radius, depth of the darker underside. */
  card: { x: number; y: number; w: number; h: number; r: number; depth: number; stroke: number };
  chip: { x: number; y: number; w: number; h: number; r: number };
  /** Sheen band: four corners, inside the card and clear of its rounded corners. */
  sheen: [Point, Point, Point, Point];
  eyeLeft: Point;
  eyeRight: Point;
  eyeRx: number;
  eyeRy: number;
  /** Pupil radius. Pupil travel is eye radius minus pupil radius. */
  pupilR: number;
  /** Centre line of the brows (y) and their width and stroke. */
  browY: number;
  browW: number;
  browStroke: number;
  mouth: { cx: number; cy: number; w: number; openH: number; stroke: number };
  cheekLeft: Point;
  cheekRight: Point;
  cheekRx: number;
  cheekRy: number;
  contactless: { cx: number; cy: number; r: number; stroke: number };
  shoulderLeft: Point;
  shoulderRight: Point;
  armLen: number;
  /** Angle of the arm at rest, degrees out from straight down. */
  armRestAngle: number;
  limbStroke: number;
  gloveR: number;
  legs: { xs: [number, number]; top: number; len: number; shoeRx: number; shoeRy: number };
  /** Glow ring: inner and outer rounded layers, both centred on the card. */
  glow: { cx: number; cy: number; w: number; h: number; outerW: number; outerH: number };
  /** Sparkle slots. Slots 0 to 2 sit by the top-right corner (thinking);
   *  success uses all of them. */
  sparkles: { x: number; y: number; r: number }[];
}

/** Card box per detail. Compact has no limbs, so the card fills more of the square. */
const CARD_BOX: Record<AvatarDetail, { x: number; y: number; w: number }> = {
  compact: { x: 0.11, y: 0.25, w: 0.78 },
  standard: { x: 0.19, y: 0.22, w: 0.62 },
  full: { x: 0.19, y: 0.22, w: 0.62 },
};
/** Glow padding around the card, fraction of size: inner and outer layer. */
const GLOW_PAD = 0.03;
const GLOW_OUTER_PAD = 0.06;
/** Card aspect, close to a real card (85.6 x 54). */
const CARD_ASPECT = 1.55;
/** Compact draws the face larger and the lines thicker, to survive 48 dp. */
const COMPACT_FEATURE_SCALE = 1.15;
const COMPACT_STROKE_SCALE = 1.25;

/** Every shape, in fractions of the avatar size, for one detail level. */
export function avatarGeometry(detail: AvatarDetail): AvatarGeometry {
  const box = CARD_BOX[detail];
  const W = box.w;
  const H = W / CARD_ASPECT;
  const compact = detail === 'compact';
  const fs = compact ? COMPACT_FEATURE_SCALE : 1;
  const ss = compact ? COMPACT_STROKE_SCALE : 1;
  // Card-local point: u across the width, v down the height.
  const at = (u: number, v: number): Point => ({ x: box.x + u * W, y: box.y + v * H });
  const top = box.y;
  const left = box.x;
  const right = box.x + W;
  const bottom = box.y + H;

  const eyeRx = 0.1 * W * fs;
  const eyeRy = 0.115 * W * fs;
  const eyeLeft = at(0.39, 0.4);
  const eyeRight = at(0.71, 0.4);
  const r = 0.09 * W;
  const mouthAt = at(0.55, 0.76);
  const contactlessAt = at(0.875, 0.24);

  return {
    card: { x: left, y: top, w: W, h: H, r, depth: 0.035 * W, stroke: 0.018 * W * ss },
    chip: { x: left + 0.07 * W, y: top + 0.2 * H, w: 0.145 * W, h: 0.22 * H, r: 0.025 * W },
    sheen: [at(0.5, 0.03), at(0.64, 0.03), at(0.5, 0.97), at(0.36, 0.97)],
    eyeLeft,
    eyeRight,
    eyeRx,
    eyeRy,
    pupilR: eyeRx * 0.52,
    browY: eyeLeft.y - eyeRy - 0.055 * W,
    browW: 0.15 * W,
    browStroke: 0.03 * W * ss,
    mouth: {
      cx: mouthAt.x,
      cy: mouthAt.y,
      w: 0.22 * W * fs,
      openH: 0.14 * W * fs,
      stroke: 0.032 * W * ss,
    },
    cheekLeft: at(0.27, 0.66),
    cheekRight: at(0.83, 0.66),
    cheekRx: 0.06 * W,
    cheekRy: 0.035 * W,
    contactless: { cx: contactlessAt.x, cy: contactlessAt.y, r: 0.03 * W, stroke: 0.018 * W },
    shoulderLeft: { x: left + 0.03 * W, y: top + 0.58 * H },
    shoulderRight: { x: right - 0.03 * W, y: top + 0.58 * H },
    armLen: 0.21 * W,
    armRestAngle: 40,
    limbStroke: 0.05 * W,
    gloveR: 0.065 * W,
    legs: {
      xs: [left + 0.36 * W, left + 0.64 * W],
      top: bottom - 0.02 * W,
      len: 0.17 * W,
      shoeRx: 0.085 * W,
      shoeRy: 0.05 * W,
    },
    glow: {
      cx: left + W / 2,
      cy: top + H / 2,
      w: W + GLOW_PAD * 2,
      h: H + GLOW_PAD * 2,
      outerW: W + GLOW_OUTER_PAD * 2,
      outerH: H + GLOW_OUTER_PAD * 2,
    },
    sparkles: [
      { x: right - 0.02 * W, y: top - 0.1 * W, r: 0.06 * W },
      { x: right + 0.04 * W, y: top + 0.12 * W, r: 0.045 * W },
      { x: right - 0.17 * W, y: top - 0.17 * W, r: 0.04 * W },
      { x: left + 0.05 * W, y: top - 0.12 * W, r: 0.05 * W },
      { x: left - 0.03 * W, y: top + 0.02 * W, r: 0.04 * W },
    ],
  };
}

/** Number of sparkle slots that thinking uses (the top-right cluster). */
export const THINKING_SPARKLES = 3;
