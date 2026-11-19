import {
  tickCount,
  snapValue,
  valueToOffset,
  offsetToValue,
  stepValue,
  isLabelTick,
  rulerStep,
  stepTyped,
  MAX_RULER_TICKS,
  type RulerConfig,
} from '../spendRuler';

const cfg: RulerConfig = { min: 0, max: 10000, step: 250, tickGap: 8 };

describe('spendRuler', () => {
  it('counts ticks with both ends', () => {
    expect(tickCount(cfg)).toBe(41);
  });

  it('snaps to the nearest tick and clamps', () => {
    expect(snapValue(1100, cfg)).toBe(1000);
    expect(snapValue(1130, cfg)).toBe(1250);
    expect(snapValue(-50, cfg)).toBe(0);
    expect(snapValue(99999, cfg)).toBe(10000);
  });

  it('converts value to offset and back', () => {
    expect(valueToOffset(0, cfg)).toBe(0);
    expect(valueToOffset(2500, cfg)).toBe(80);
    for (const v of [0, 250, 2500, 7500, 10000]) {
      expect(offsetToValue(valueToOffset(v, cfg), cfg)).toBe(v);
    }
  });

  it('rounds a mid-tick offset to the nearest tick and clamps outside offsets', () => {
    expect(offsetToValue(11, cfg)).toBe(250);
    expect(offsetToValue(13, cfg)).toBe(500);
    expect(offsetToValue(-40, cfg)).toBe(0);
    expect(offsetToValue(100000, cfg)).toBe(10000);
  });

  it('works with a non-zero min', () => {
    const c: RulerConfig = { min: 1000, max: 5000, step: 500, tickGap: 10 };
    expect(valueToOffset(3000, c)).toBe(40);
    expect(offsetToValue(40, c)).toBe(3000);
  });

  it('stepper clamps at both ends and lands on ticks', () => {
    expect(stepValue(0, -1, cfg)).toBe(0);
    expect(stepValue(10000, 1, cfg)).toBe(10000);
    expect(stepValue(2500, 1, cfg)).toBe(2750);
    expect(stepValue(2510, -1, cfg)).toBe(2250);
  });

  it('marks label ticks', () => {
    expect(isLabelTick(0, 10)).toBe(true);
    expect(isLabelTick(10, 10)).toBe(true);
    expect(isLabelTick(5, 10)).toBe(false);
    expect(isLabelTick(5, 0)).toBe(false);
  });
});

describe('rulerStep', () => {
  it('keeps the step when the ruler is short enough', () => {
    expect(rulerStep(0, 100000, 500)).toBe(500);
    expect(rulerStep(0, 40, 1)).toBe(1);
  });

  it('widens the step so the ruler has at most 300 ticks', () => {
    const step = rulerStep(0, 1000000, 500);
    expect(step % 500).toBe(0);
    expect(tickCount({ min: 0, max: 1000000, step, tickGap: 10 })).toBeLessThanOrEqual(MAX_RULER_TICKS);
  });
});

describe('stepTyped', () => {
  const c: RulerConfig = { min: 0, max: 1000, step: 100, tickGap: 8 };

  it('acts like stepValue inside the ruler', () => {
    expect(stepTyped(300, 1, c, 5000)).toBe(400);
    expect(stepTyped(300, -1, c, 5000)).toBe(200);
  });

  it('goes past the ruler end up to the typed max', () => {
    expect(stepTyped(1000, 1, c, 5000)).toBe(1100);
    expect(stepTyped(4950, 1, c, 5000)).toBe(5000);
    expect(stepTyped(5000, 1, c, 5000)).toBe(5000);
  });

  it('comes back to the ruler end, not into the gap', () => {
    expect(stepTyped(1050, -1, c, 5000)).toBe(1000);
    expect(stepTyped(1234, -1, c, 5000)).toBe(1134);
  });
});
