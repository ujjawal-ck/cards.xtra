import { ADVISOR_AVATAR_STATES } from '../types';
import {
  POSES,
  MOUTH_CURVE_STOPS,
  MOUTH_SAG,
  FLOAT_AMPLITUDE,
  HOP_HEIGHT,
  SHAKE_AMPLITUDE,
  GLOW_PULSE_SCALE,
  avatarGeometry,
  curveLayerInput,
  mouthCurveWeights,
  detailForSize,
  clampAudioLevel,
  mouthOpenFor,
  accessibilityLabelFor,
} from '../pose';

describe('POSES', () => {
  it('has a pose for every state', () => {
    for (const s of ADVISOR_AVATAR_STATES) expect(POSES[s]).toBeDefined();
  });
  it('the six still poses are pairwise different', () => {
    const keys = ADVISOR_AVATAR_STATES.map((s) => JSON.stringify(POSES[s]));
    expect(new Set(keys).size).toBe(ADVISOR_AVATAR_STATES.length);
  });
  it('each pose differs from the others in the eyes or the mouth (visible at 48 dp)', () => {
    const face = (s: (typeof ADVISOR_AVATAR_STATES)[number]) => {
      const p = POSES[s];
      return JSON.stringify([p.eyeOpen, p.happyEyes, p.pupilX, p.pupilY, p.mouthOpen, p.mouthCurve]);
    };
    expect(new Set(ADVISOR_AVATAR_STATES.map(face)).size).toBe(ADVISOR_AVATAR_STATES.length);
  });
  it('every pair of still poses differs visibly at 48 dp (compact: eyes and mouth only)', () => {
    const size = 48;
    const g = avatarGeometry(detailForSize(size));
    const strokeDp = g.mouth.stroke * size;
    const dipDp = (curve: number) => curve * MOUTH_SAG * g.mouth.w * size;
    const states = ADVISOR_AVATAR_STATES;
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const a = POSES[states[i]];
        const b = POSES[states[j]];
        const visible =
          a.happyEyes !== b.happyEyes ||
          Math.abs(a.eyeOpen - b.eyeOpen) >= 0.1 ||
          Math.hypot(a.pupilX - b.pupilX, a.pupilY - b.pupilY) >= 0.3 ||
          Math.abs(a.mouthOpen - b.mouthOpen) >= 0.2 ||
          Math.abs(dipDp(a.mouthCurve) - dipDp(b.mouthCurve)) >= strokeDp;
        expect([states[i], states[j], visible]).toEqual([states[i], states[j], true]);
      }
    }
  });
  it('follows the brief for the key features', () => {
    expect(POSES.success.happyEyes).toBe(true);
    expect(POSES.success.armRaise).toBeGreaterThanOrEqual(60);
    expect(POSES.error.browAngle).toBeGreaterThan(0);
    expect(POSES.error.mouthCurve).toBeLessThan(0);
    expect(POSES.error.sparkles).toBe(false);
    expect(POSES.listening.glow).toBe(true);
    expect(POSES.thinking.pupilY).toBeLessThan(0);
    expect(POSES.thinking.sparkles).toBe(true);
  });
});

describe('mouth curve layers', () => {
  it('has one sorted stop per distinct curve', () => {
    const sorted = [...MOUTH_CURVE_STOPS].sort((a, b) => a - b);
    expect(MOUTH_CURVE_STOPS).toEqual(sorted);
    for (const s of ADVISOR_AVATAR_STATES) expect(MOUTH_CURVE_STOPS).toContain(POSES[s].mouthCurve);
  });
  it('input ranges are strictly increasing', () => {
    MOUTH_CURVE_STOPS.forEach((_, i) => {
      const [a, b, c] = curveLayerInput(i);
      expect(a).toBeLessThan(b);
      expect(b).toBeLessThan(c);
    });
  });
  it('weights sum to 1 and a pose curve shows exactly one layer', () => {
    for (const c of [-1, -0.4, -0.1, 0.1, 0.3, 0.6, 0.8, 1, 1.5]) {
      const sum = mouthCurveWeights(c).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
    for (const s of ADVISOR_AVATAR_STATES) {
      const w = mouthCurveWeights(POSES[s].mouthCurve);
      expect(w.filter((x) => x === 1)).toHaveLength(1);
    }
  });
});

describe('detailForSize', () => {
  it('maps sizes to detail levels', () => {
    expect(detailForSize(48)).toBe('compact');
    expect(detailForSize(96)).toBe('standard');
    expect(detailForSize(160)).toBe('full');
    expect(detailForSize(300)).toBe('full');
  });
  it('switches at 72 and 140', () => {
    expect(detailForSize(71.9)).toBe('compact');
    expect(detailForSize(72)).toBe('standard');
    expect(detailForSize(139.9)).toBe('standard');
    expect(detailForSize(140)).toBe('full');
  });
});

describe('clampAudioLevel', () => {
  it('keeps undefined, zeroes NaN, clamps to 0..1', () => {
    expect(clampAudioLevel(undefined)).toBeUndefined();
    expect(clampAudioLevel(NaN)).toBe(0);
    expect(clampAudioLevel(-1)).toBe(0);
    expect(clampAudioLevel(2)).toBe(1);
    expect(clampAudioLevel(0.5)).toBe(0.5);
  });
});

describe('mouthOpenFor', () => {
  it('rises with the audio level while speaking', () => {
    expect(mouthOpenFor('speaking', 0)).toBeCloseTo(0.15, 10);
    expect(mouthOpenFor('speaking', 1)).toBeCloseTo(1, 10);
    expect(mouthOpenFor('speaking', 0.6)).toBeGreaterThan(mouthOpenFor('speaking', 0.3));
    expect(mouthOpenFor('speaking', 5)).toBeCloseTo(1, 10);
  });
  it('uses the pose without a level, and ignores the level in other states', () => {
    expect(mouthOpenFor('speaking', undefined)).toBe(POSES.speaking.mouthOpen);
    for (const s of ADVISOR_AVATAR_STATES.filter((x) => x !== 'speaking')) {
      expect(mouthOpenFor(s, 0.9)).toBe(POSES[s].mouthOpen);
      expect(mouthOpenFor(s, undefined)).toBe(POSES[s].mouthOpen);
    }
  });
});

describe('accessibilityLabelFor', () => {
  it('builds the default label from the state', () => {
    expect(accessibilityLabelFor('idle')).toBe('Swipey, your card advisor. Ready');
    expect(accessibilityLabelFor('success')).toBe('Swipey, your card advisor. Found cards');
    expect(accessibilityLabelFor('error', '')).toBe('Swipey, your card advisor. Something went wrong');
  });
  it('uses a custom label when given', () => {
    expect(accessibilityLabelFor('thinking', 'Advisor')).toBe('Advisor');
  });
});

describe('avatarGeometry', () => {
  it('keeps the card inside the square at every detail', () => {
    for (const d of ['compact', 'standard', 'full'] as const) {
      const g = avatarGeometry(d);
      expect(g.card.x).toBeGreaterThan(0);
      expect(g.card.y).toBeGreaterThan(0);
      expect(g.card.x + g.card.w).toBeLessThan(1);
      expect(g.card.y + g.card.h).toBeLessThan(1);
      expect(g.card.w).toBeGreaterThan(g.card.h);
    }
  });
  it('keeps glow, sparkles and the moving card inside the square', () => {
    const SPARKLE_POP = 1.25;
    for (const d of ['compact', 'standard', 'full'] as const) {
      const g = avatarGeometry(d);
      const inside = (lo: number, hi: number) => {
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(1);
      };
      // Card with the shake and the float.
      inside(g.card.x - SHAKE_AMPLITUDE, g.card.x + g.card.w + SHAKE_AMPLITUDE);
      inside(g.card.y - FLOAT_AMPLITUDE, g.card.y + g.card.h + g.card.depth);
      // Glow at the top of its pulse.
      const gs = 1 + GLOW_PULSE_SCALE;
      inside(g.glow.cx - (g.glow.outerW * gs) / 2, g.glow.cx + (g.glow.outerW * gs) / 2);
      inside(g.glow.cy - (g.glow.outerH * gs) / 2, g.glow.cy + (g.glow.outerH * gs) / 2);
      // Sparkles at the top of the pop, during the hop.
      for (const s of g.sparkles) {
        const r = s.r * SPARKLE_POP;
        inside(s.x - r, s.x + r);
        inside(s.y - r - HOP_HEIGHT, s.y + r);
      }
    }
  });
  it('draws a bigger card and larger eyes when compact', () => {
    const c = avatarGeometry('compact');
    const s = avatarGeometry('standard');
    expect(c.card.w).toBeGreaterThan(s.card.w);
    expect(c.eyeRx / c.card.w).toBeGreaterThan(s.eyeRx / s.card.w);
  });
});
