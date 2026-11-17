import { stepStates, stepLineKind } from '../stepper';

describe('stepper', () => {
  it('marks steps before the current one done and after it locked', () => {
    expect(stepStates(4, 1)).toEqual(['done', 'current', 'locked', 'locked']);
    expect(stepStates(3, 0)).toEqual(['current', 'locked', 'locked']);
  });

  it('handles all-locked and all-done', () => {
    expect(stepStates(2, -1)).toEqual(['locked', 'locked']);
    expect(stepStates(2, 2)).toEqual(['done', 'done']);
    expect(stepStates(2, 9)).toEqual(['done', 'done']);
  });

  it('never throws on bad input', () => {
    expect(stepStates(0, 0)).toEqual([]);
    expect(stepStates(-3, 1)).toEqual([]);
    expect(stepStates(2, NaN)).toEqual(['locked', 'locked']);
    expect(stepStates(NaN, 1)).toEqual([]);
  });

  it('draws a dark connector only under a done step', () => {
    expect(stepLineKind('done')).toBe('done');
    expect(stepLineKind('current')).toBe('pending');
    expect(stepLineKind('locked')).toBe('pending');
  });
});
