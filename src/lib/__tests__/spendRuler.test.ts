import {
  tickCount,
  snapValue,
  valueToOffset,
  offsetToValue,
  stepValue,
  isLabelTick,
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
