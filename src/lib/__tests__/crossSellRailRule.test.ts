import { mayExpandRail } from '../crossSell';

const base = {
  applied: new Set<string>(),
  expanded: new Set<string>(),
  anchorId: 'c1',
  anchorAlias: 'a1',
  listed: true,
  show: true,
};

describe('mayExpandRail', () => {
  it('allows a fresh listed card with picks', () => {
    expect(mayExpandRail(base)).toBe(true);
  });
  it('blocks when the tile is not listed', () => {
    expect(mayExpandRail({ ...base, listed: false })).toBe(false);
  });
  it('blocks when the engine has no rail to show', () => {
    expect(mayExpandRail({ ...base, show: false })).toBe(false);
  });
  it('blocks a card the user applied to', () => {
    expect(mayExpandRail({ ...base, applied: new Set(['a1']) })).toBe(false);
  });
  it('blocks a card that already expanded or was suppressed', () => {
    expect(mayExpandRail({ ...base, expanded: new Set(['c1']) })).toBe(false);
  });
  it('has no per-session cap: the 4th and 10th rail are allowed', () => {
    const expanded = new Set<string>();
    for (let i = 1; i <= 10; i++) {
      const id = `c${i}`;
      expect(mayExpandRail({ ...base, anchorId: id, anchorAlias: `a${i}`, expanded })).toBe(true);
      expanded.add(id);
    }
    expect(expanded.size).toBe(10);
  });
});
