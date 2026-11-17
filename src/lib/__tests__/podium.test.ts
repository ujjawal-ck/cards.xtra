import { podiumWinner, podiumHeights } from '../podium';

describe('podium', () => {
  it('picks the winner', () => {
    expect(podiumWinner(3400, 5002)).toBe('b');
    expect(podiumWinner(5002, 3400)).toBe('a');
    expect(podiumWinner(3400, 3400)).toBe('none');
    expect(podiumWinner(NaN, 1)).toBe('none');
  });

  it('gives the larger value the full height and scales the other', () => {
    expect(podiumHeights(3400, 5002, 100, 20)).toEqual({ a: 68, b: 100 });
  });

  it('never goes below the minimum height', () => {
    expect(podiumHeights(10, 5000, 100, 20).a).toBe(20);
  });

  it('handles zero and negative values', () => {
    expect(podiumHeights(0, 0, 100, 20)).toEqual({ a: 20, b: 20 });
    expect(podiumHeights(-5, 100, 100, 20)).toEqual({ a: 20, b: 100 });
  });
});
