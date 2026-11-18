import { rotatingWordIndex, TICKS_PER_WORD, TOOLS_ROW_TICK_MS } from '../toolsRowRotation';

const LEN = 5;
const TICKS = 60;

describe('rotatingWordIndex', () => {
  it('both tiles start on word 0', () => {
    expect(rotatingWordIndex(0, 0, LEN)).toBe(0);
    expect(rotatingWordIndex(0, 1, LEN)).toBe(0);
  });

  it('the two tiles never change on the same tick', () => {
    for (let t = 1; t < TICKS; t++) {
      const a = rotatingWordIndex(t, 0, LEN) !== rotatingWordIndex(t - 1, 0, LEN);
      const b = rotatingWordIndex(t, 1, LEN) !== rotatingWordIndex(t - 1, 1, LEN);
      expect(a && b).toBe(false);
    }
  });

  it('category changes on even ticks, brands on odd ticks', () => {
    for (let t = 1; t < TICKS; t++) {
      const a = rotatingWordIndex(t, 0, 99) !== rotatingWordIndex(t - 1, 0, 99);
      const b = rotatingWordIndex(t, 1, 99) !== rotatingWordIndex(t - 1, 1, 99);
      expect(a).toBe(t % 2 === 0);
      expect(b).toBe(t % 2 === 1);
    }
  });

  it('each word is shown for exactly two ticks (the brands first word, one)', () => {
    const run = (phase: 0 | 1) => {
      const runs: number[] = [];
      let n = 1;
      for (let t = 1; t < TICKS; t++) {
        if (rotatingWordIndex(t, phase, 99) === rotatingWordIndex(t - 1, phase, 99)) n++;
        else {
          runs.push(n);
          n = 1;
        }
      }
      return runs;
    };
    expect(run(0).every((n) => n === TICKS_PER_WORD)).toBe(true);
    const brands = run(1);
    expect(brands[0]).toBe(1);
    expect(brands.slice(1).every((n) => n === TICKS_PER_WORD)).toBe(true);
  });

  it('wraps at the list length', () => {
    expect(rotatingWordIndex(2 * LEN, 0, LEN)).toBe(0);
    expect(rotatingWordIndex(2 * LEN - 1, 1, LEN)).toBe(0);
    expect(rotatingWordIndex(2 * LEN + 2, 0, LEN)).toBe(1);
  });

  it('is safe for an empty list and gives 4200 ms per word', () => {
    expect(rotatingWordIndex(7, 0, 0)).toBe(0);
    expect(TOOLS_ROW_TICK_MS * TICKS_PER_WORD).toBe(4200);
  });
});
