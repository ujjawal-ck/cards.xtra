import { COMPARE_TABLE, columnOffset, nextSelected, isSelectedColumn } from '../compareTable';

describe('compareTable', () => {
  it('uses the Figma cell sizes', () => {
    expect(COMPARE_TABLE.valueW).toBe(88);
    expect(COMPARE_TABLE.valueH).toBe(88);
    expect(COMPARE_TABLE.headerH).toBe(52);
    expect(COMPARE_TABLE.heroW).toBe(146);
    expect(COMPARE_TABLE.heroH).toBe(172);
  });

  it('gives the scroll offset of a column and never a negative one', () => {
    expect(columnOffset(0)).toBe(0);
    expect(columnOffset(3)).toBe(264);
    expect(columnOffset(-2)).toBe(0);
    expect(columnOffset(NaN)).toBe(0);
  });

  it('toggles the selected column', () => {
    expect(nextSelected(null, 'a')).toBe('a');
    expect(nextSelected('a', 'a')).toBeNull();
    expect(nextSelected('a', 'b')).toBe('b');
  });

  it('selects nothing when the id is unknown or empty', () => {
    expect(isSelectedColumn('a', 'a', ['a', 'b'])).toBe(true);
    expect(isSelectedColumn('b', 'a', ['a', 'b'])).toBe(false);
    expect(isSelectedColumn('a', 'zzz', ['a', 'b'])).toBe(false);
    expect(isSelectedColumn('a', null, ['a'])).toBe(false);
  });
});
