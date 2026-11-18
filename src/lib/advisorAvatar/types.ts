/**
 * Card advisor avatar: the contract of the mascot ("Swipey"), a friendly
 * credit card with a face. The component is src/organisms/CreditCardAdvisorAvatar.tsx.
 * The pure pose maths is src/lib/advisorAvatar/pose.ts.
 *
 * The avatar shows what the advisor is doing. It never decides it: the screen
 * that mounts it passes the state.
 */
import type { StyleProp, ViewStyle } from 'react-native';

/** What the advisor is doing right now. */
export type AdvisorAvatarState =
  /** Nothing is happening. Gentle float, a blink every few seconds, a rare small wave. */
  | 'idle'
  /** It waits for the user's answer. Slight tilt, attentive eyes, a soft glow. */
  | 'listening'
  /** It is working (a check is running). Eyes up, brows move, small sparkles. */
  | 'thinking'
  /** A new message is arriving. Mouth moves, gentle bounce. */
  | 'speaking'
  /** A recommendation was found. Happy eyes, arms up, sparkles. */
  | 'success'
  /** Something failed. Concerned face, one restrained shake. */
  | 'error';

export const ADVISOR_AVATAR_STATES: AdvisorAvatarState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'success',
  'error',
];

export interface CreditCardAdvisorAvatarProps {
  state: AdvisorAvatarState;
  /** Width and height of the square the avatar sits in, in dp. Default 96.
   *  It must read as a credit card with a face from 48 up to 300. */
  size?: number;
  /** 0 to 1. While `state` is 'speaking' it sets how far the mouth opens.
   *  When absent, the mouth runs its own loop. Values outside 0 to 1 are clamped. */
  audioLevel?: number;
  /** Read by a screen reader. Default: "Swipey, your card advisor" plus the state in words. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** How much of the character is drawn at a size.
 *  compact: card outline, chip, eyes, mouth only (no limbs, no cheeks, no brows).
 *  standard: adds brows, cheeks and arms.
 *  full: adds legs, shoes and the contactless mark. */
export type AvatarDetail = 'compact' | 'standard' | 'full';

/** The resting pose of one state: what a still frame (reduce motion) shows,
 *  and the centre the animation moves around. All values are unitless and
 *  relative: angles in degrees, offsets as a fraction of the avatar size. */
export interface AvatarPose {
  /** Tilt of the whole card, degrees. */
  tilt: number;
  /** Pupil offset, fraction of the eye radius: x right, y down. -1 to 1. */
  pupilX: number;
  pupilY: number;
  /** 0 = eye closed, 1 = fully open. Above 1 = wide. */
  eyeOpen: number;
  /** true: eyes drawn as happy arcs (success). */
  happyEyes: boolean;
  /** Brow lift, fraction of the eye radius: negative is up. */
  browLift: number;
  /** Brow angle, degrees: positive tilts the inner ends up (concern). */
  browAngle: number;
  /** 0 = closed smile, 1 = fully open. */
  mouthOpen: number;
  /** 1 = full smile, 0 = flat, -1 = frown. */
  mouthCurve: number;
  /** Arm angle from rest, degrees: positive raises the arms. */
  armRaise: number;
  /** true: sparkles are shown. */
  sparkles: boolean;
  /** true: the soft glow ring is shown. */
  glow: boolean;
}
