import { pickResultPlace, inlineResultParams } from '../inlineEligibility';

describe('pickResultPlace', () => {
  it('shows inline when no sheet handler is given', () => {
    expect(pickResultPlace({ hadDefaults: false, hasSheetHandler: false })).toBe('inline');
  });
  it('shows inline when details were pre-filled', () => {
    expect(pickResultPlace({ hadDefaults: true, hasSheetHandler: true })).toBe('inline');
  });
  it('uses the sheet only for a fresh check with a handler (Home)', () => {
    expect(pickResultPlace({ hadDefaults: false, hasSheetHandler: true })).toBe('sheet');
  });
});

describe('inlineResultParams', () => {
  it('names the entry surface and carries the outcome', () => {
    expect(inlineResultParams('c1', 'maybe', 'skippable')).toEqual({
      item_id: 'c1',
      outcome: 'maybe',
      gate_variant: 'skippable',
      surface: 'card_detail_inline',
    });
  });
});
