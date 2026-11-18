import { podiumWinner, podiumHeights } from '../podium';

describe('podium', () => {
  it('picks the winner', () => {
    expect(podiumWinner(3400, 5002)).toBe('b');
    expect(podiumWinner(5002, 3400)).toBe('a');
    expect(podiumWinner(3400, 3400)).toBe('none');
    expect(podiumWinner(NaN, 1)).toBe('none');
  });

  it('has no winner when both values are 0 or less', () => {
    expect(podiumWinner(-5, -3)).toBe('none');
    expect(podiumWinner(-3, -5)).toBe('none');
    expect(podiumWinner(0, 0)).toBe('none');
    expect(podiumWinner(-5, 0)).toBe('none');
  });

  it('lets a positive value win over a negative or zero one', () => {
    expect(podiumWinner(-5, 100)).toBe('b');
    expect(podiumWinner(100, -5)).toBe('a');
    expect(podiumWinner(0, 100)).toBe('b');
    expect(podiumWinner(100, 0)).toBe('a');
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
