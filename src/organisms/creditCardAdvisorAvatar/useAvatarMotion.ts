/**
 * useAvatarMotion: the shared values that move the card advisor avatar.
 * Private to src/organisms/CreditCardAdvisorAvatar.tsx.
 *
 * Two kinds of value:
 *   pose values (tilt, pupils, brows, mouth, arms, glow): move to the new
 *     state's pose over motion.duration.slow, so a state change never jumps;
 *   loop offsets (float, breath, shake, blink, wave, drift, twinkle, pop):
 *     neutral at rest, driven only by Reanimated loops of the current state.
 * The component adds them together on the UI thread.
 *
 * All values are unitless (fractions of size, degrees, 0 to 1), so `size` is
 * never an effect dependency.
 *
 * `still` (reduce motion, or Android: see the header of StaggeredEntrance.tsx)
 * assigns the still pose directly and starts no loop.
 *
 * Effects: the body effect is keyed on [state, still] only, so a re-render
 * with the same state never restarts or stacks a loop. The mouth has its own
 * effect, so an audioLevel change touches only the mouth. Both cancel what
 * they drive on every change and on unmount.
 */
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { motion } from '../../tokens';
import {
  POSES,
  MOUTH_WIDTH,
  mouthOpenFor,
  FLOAT_AMPLITUDE,
  BOUNCE_AMPLITUDE,
  HOP_HEIGHT,
  SHAKE_AMPLITUDE,
  BLINK_CLOSED,
  WAVE_RAISE,
  GESTURE_RAISE,
  PUPIL_DRIFT,
  BROW_BOB,
  SPEAKING_MOUTH_STEPS,
  THINKING_SPARKLES,
} from '../../lib/advisorAvatar/pose';
import type { AdvisorAvatarState } from '../../lib/advisorAvatar/types';

// Loop timings (ms). The motion tokens cover UI transitions, not character loops.
const FLOAT_HALF_MS = 1600;
const BLINK_GAP_MS = 3300; // one blink every ~3.5 s
const BLINK_CLOSE_MS = 70;
const BLINK_OPEN_MS = 90;
const WAVE_GAP_MS = 6800; // one small wave every ~8 s
const WAVE_WIGGLE = 25; // degrees down and up during the wave
const GLOW_HALF_MS = 1400;
const BREATH_HALF_MS = 1800;
const DRIFT_MS = 1500;
const BROW_REST_MS = 900;
const TWINKLE_CYCLE_MS = 1800; // three sparkles, one after the other
const BOUNCE_HALF_MS = 260;
const GESTURE_GAP_MS = 2600;
const HOP_UP_MS = 180;
const HOP_DOWN_MS = 240;
const POP_MS = 700;
const SHAKE_STEP_MS = 70;
/** Smoothing of the mouth when it follows audioLevel. */
const AUDIO_SMOOTH_MS = 80;
/** Durations of the fallback mouth steps, one per SPEAKING_MOUTH_STEPS entry. */
const MOUTH_STEP_MS = [130, 110, 160, 120, 140, 150];

export interface AvatarMotion {
  // Pose values
  tilt: SharedValue<number>;
  pupilX: SharedValue<number>;
  pupilY: SharedValue<number>;
  eyeOpen: SharedValue<number>;
  /** 0 normal eyes, 1 happy arcs. */
  happy: SharedValue<number>;
  browLift: SharedValue<number>;
  browAngle: SharedValue<number>;
  mouthOpen: SharedValue<number>;
  mouthCurve: SharedValue<number>;
  mouthWidth: SharedValue<number>;
  armRaise: SharedValue<number>;
  glowOn: SharedValue<number>;
  /** Thinking sparkles shown still (no twinkle): 0 or 1. */
  cluster: SharedValue<number>;
  /** Thinking twinkle is running: 0 or 1. */
  twinkleOn: SharedValue<number>;
  // Loop offsets
  floatY: SharedValue<number>;
  breath: SharedValue<number>;
  shakeX: SharedValue<number>;
  blink: SharedValue<number>;
  waveRight: SharedValue<number>;
  gestureLeft: SharedValue<number>;
  pupilDrift: SharedValue<number>;
  browBob: SharedValue<number>;
  glowPulse: SharedValue<number>;
  /** 0 to 3: which thinking sparkle is lit. */
  phase: SharedValue<number>;
  /** 0 to 1: the success sparkle pop. */
  pop: SharedValue<number>;
}

const ease = motion.easing.standard;
// Every loop starts with a short move to a known value, so a loop entered
// mid-motion (a state change during a blink, say) never cycles from there.
const lead = (target: number) => withTiming(target, { duration: motion.duration.fast, easing: ease });
const blinkLoop = () =>
  withSequence(
    lead(1),
    withRepeat(
      withSequence(
        withDelay(BLINK_GAP_MS, withTiming(BLINK_CLOSED, { duration: BLINK_CLOSE_MS })),
        withTiming(1, { duration: BLINK_OPEN_MS }),
      ),
      -1,
      false,
    ),
  );
const floatLoop = () =>
  withRepeat(withTiming(-FLOAT_AMPLITUDE, { duration: FLOAT_HALF_MS, easing: ease }), -1, true);

export function useAvatarMotion(
  state: AdvisorAvatarState,
  still: boolean,
  audioLevel: number | undefined,
): AvatarMotion {
  const p0 = POSES[state];
  const tilt = useSharedValue(p0.tilt);
  const pupilX = useSharedValue(p0.pupilX);
  const pupilY = useSharedValue(p0.pupilY);
  const eyeOpen = useSharedValue(p0.eyeOpen);
  const happy = useSharedValue(p0.happyEyes ? 1 : 0);
  const browLift = useSharedValue(p0.browLift);
  const browAngle = useSharedValue(p0.browAngle);
  const mouthOpen = useSharedValue(mouthOpenFor(state, audioLevel));
  const mouthCurve = useSharedValue(p0.mouthCurve);
  const mouthWidth = useSharedValue(MOUTH_WIDTH[state]);
  const armRaise = useSharedValue(p0.armRaise);
  const glowOn = useSharedValue(p0.glow ? 1 : 0);
  const cluster = useSharedValue(0);
  const twinkleOn = useSharedValue(0);
  const floatY = useSharedValue(0);
  const breath = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const blink = useSharedValue(1);
  const waveRight = useSharedValue(0);
  const gestureLeft = useSharedValue(0);
  const pupilDrift = useSharedValue(0);
  const browBob = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const phase = useSharedValue(0);
  const pop = useSharedValue(0);

  // Body: pose transition plus the loops of the state.
  useEffect(() => {
    const body = [
      tilt,
      pupilX,
      pupilY,
      eyeOpen,
      happy,
      browLift,
      browAngle,
      mouthCurve,
      mouthWidth,
      armRaise,
      glowOn,
      cluster,
      twinkleOn,
      floatY,
      breath,
      shakeX,
      blink,
      waveRight,
      gestureLeft,
      pupilDrift,
      browBob,
      glowPulse,
      phase,
      pop,
    ];
    body.forEach((v) => cancelAnimation(v));

    const pose = POSES[state];
    const to = (v: SharedValue<number>, target: number, duration: number = motion.duration.slow) => {
      v.value = still ? target : withTiming(target, { duration, easing: ease });
    };
    to(tilt, pose.tilt);
    to(pupilX, pose.pupilX);
    to(pupilY, pose.pupilY);
    to(eyeOpen, pose.eyeOpen);
    to(happy, pose.happyEyes ? 1 : 0, motion.duration.base);
    to(browLift, pose.browLift);
    to(browAngle, pose.browAngle);
    to(mouthCurve, pose.mouthCurve, motion.duration.base);
    to(mouthWidth, MOUTH_WIDTH[state]);
    to(armRaise, pose.armRaise);
    to(glowOn, pose.glow ? 1 : 0);
    // Loop offsets back to neutral.
    to(floatY, 0, motion.duration.base);
    to(breath, 0, motion.duration.base);
    to(shakeX, 0, motion.duration.fast);
    to(blink, 1, motion.duration.fast);
    to(waveRight, 0, motion.duration.base);
    to(gestureLeft, 0, motion.duration.base);
    to(pupilDrift, 0, motion.duration.base);
    to(browBob, 0, motion.duration.base);
    to(glowPulse, 0, motion.duration.base);
    to(twinkleOn, 0, motion.duration.base);
    // Sparkles: thinking shows its cluster, success its pop.
    const thinkingStill = still && state === 'thinking' && pose.sparkles;
    to(cluster, thinkingStill ? 1 : 0, motion.duration.base);
    if (still) {
      pop.value = state === 'success' && pose.sparkles ? 1 : 0;
      phase.value = 0;
      return () => body.forEach((v) => cancelAnimation(v));
    }
    to(pop, 0, motion.duration.base);

    switch (state) {
      case 'idle':
        floatY.value = withSequence(withTiming(0, { duration: motion.duration.base }), floatLoop());
        blink.value = blinkLoop();
        waveRight.value = withSequence(
          lead(0),
          withRepeat(
            withSequence(
              withDelay(
                WAVE_GAP_MS,
                withTiming(WAVE_RAISE, { duration: motion.duration.slow, easing: ease }),
              ),
              withTiming(WAVE_RAISE - WAVE_WIGGLE, { duration: motion.duration.base, easing: ease }),
              withTiming(WAVE_RAISE, { duration: motion.duration.base, easing: ease }),
              withTiming(WAVE_RAISE - WAVE_WIGGLE, { duration: motion.duration.base, easing: ease }),
              withTiming(0, { duration: motion.duration.slow, easing: ease }),
            ),
            -1,
            false,
          ),
        );
        break;
      case 'listening':
        blink.value = blinkLoop();
        glowPulse.value = withSequence(
          lead(0),
          withRepeat(withTiming(1, { duration: GLOW_HALF_MS, easing: ease }), -1, true),
        );
        breath.value = withSequence(
          lead(0),
          withRepeat(withTiming(1, { duration: BREATH_HALF_MS, easing: ease }), -1, true),
        );
        break;
      case 'thinking':
        pupilDrift.value = withSequence(
          withTiming(-PUPIL_DRIFT, { duration: DRIFT_MS / 2, easing: ease }),
          withRepeat(withTiming(PUPIL_DRIFT, { duration: DRIFT_MS, easing: ease }), -1, true),
        );
        browBob.value = withSequence(
          lead(0),
          withRepeat(
            withSequence(
              withDelay(BROW_REST_MS, withTiming(BROW_BOB, { duration: motion.duration.base, easing: ease })),
              withTiming(0, { duration: motion.duration.slow, easing: ease }),
            ),
            -1,
            false,
          ),
        );
        twinkleOn.value = 1;
        phase.value = 0;
        phase.value = withRepeat(
          withTiming(THINKING_SPARKLES, { duration: TWINKLE_CYCLE_MS, easing: Easing.linear }),
          -1,
          false,
        );
        break;
      case 'speaking':
        blink.value = blinkLoop();
        floatY.value = withSequence(
          lead(0),
          withRepeat(withTiming(-BOUNCE_AMPLITUDE, { duration: BOUNCE_HALF_MS, easing: ease }), -1, true),
        );
        gestureLeft.value = withSequence(
          lead(0),
          withRepeat(
            withSequence(
              withDelay(
                GESTURE_GAP_MS,
                withTiming(GESTURE_RAISE, { duration: motion.duration.slow, easing: ease }),
              ),
              withTiming(0, { duration: motion.duration.slow, easing: ease }),
            ),
            -1,
            false,
          ),
        );
        break;
      case 'success':
        // One hop and one sparkle pop per entry, then a gentle float.
        floatY.value = withSequence(
          withTiming(-HOP_HEIGHT, { duration: HOP_UP_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: HOP_DOWN_MS, easing: Easing.in(Easing.quad) }),
          floatLoop(),
        );
        pop.value = 0;
        pop.value = withDelay(HOP_UP_MS, withTiming(1, { duration: POP_MS, easing: Easing.linear }));
        break;
      case 'error':
        // One restrained shake: three swings, then still. No loop.
        shakeX.value = withSequence(
          withTiming(SHAKE_AMPLITUDE, { duration: SHAKE_STEP_MS, easing: ease }),
          withTiming(-SHAKE_AMPLITUDE, { duration: SHAKE_STEP_MS * 2, easing: ease }),
          withTiming(SHAKE_AMPLITUDE / 2, { duration: SHAKE_STEP_MS * 2, easing: ease }),
          withTiming(0, { duration: SHAKE_STEP_MS, easing: ease }),
        );
        break;
    }
    return () => body.forEach((v) => cancelAnimation(v));
    // Shared values are stable refs; only state and still restart the motion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, still]);

  // Mouth: follows audioLevel while speaking, else the pose (or the fallback loop).
  const speakingLevel = state === 'speaking' ? audioLevel : undefined;
  useEffect(() => {
    cancelAnimation(mouthOpen);
    if (still) {
      mouthOpen.value = POSES[state].mouthOpen;
      return () => cancelAnimation(mouthOpen);
    }
    if (state === 'speaking' && speakingLevel === undefined) {
      // Lead with the last step, so each cycle restarts from where it ended.
      const last = SPEAKING_MOUTH_STEPS[SPEAKING_MOUTH_STEPS.length - 1];
      mouthOpen.value = withSequence(
        lead(last),
        withRepeat(
          withSequence(
            ...SPEAKING_MOUTH_STEPS.map((v, i) =>
              withTiming(v, { duration: MOUTH_STEP_MS[i % MOUTH_STEP_MS.length], easing: ease }),
            ),
          ),
          -1,
          false,
        ),
      );
    } else {
      mouthOpen.value = withTiming(mouthOpenFor(state, speakingLevel), {
        duration: state === 'speaking' ? AUDIO_SMOOTH_MS : motion.duration.base,
        easing: ease,
      });
    }
    return () => cancelAnimation(mouthOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, still, speakingLevel]);

  return {
    tilt,
    pupilX,
    pupilY,
    eyeOpen,
    happy,
    browLift,
    browAngle,
    mouthOpen,
    mouthCurve,
    mouthWidth,
    armRaise,
    glowOn,
    cluster,
    twinkleOn,
    floatY,
    breath,
    shakeX,
    blink,
    waveRight,
    gestureLeft,
    pupilDrift,
    browBob,
    glowPulse,
    phase,
    pop,
  };
}
