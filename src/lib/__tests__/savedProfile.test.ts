import { addApplied, MAX_APPLIED_CARDS, parseSavedProfile } from '../savedProfile';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const empty = { applied: [] };
const good = { pincode: '110001', income: '75000', incomeType: 'salaried' };

describe('parseSavedProfile', () => {
  it('returns an empty profile for null, empty or bad JSON', () => {
    expect(parseSavedProfile(null)).toEqual(empty);
    expect(parseSavedProfile('')).toEqual(empty);
    expect(parseSavedProfile('{not json')).toEqual(empty);
  });

  it('returns an empty profile for the wrong top-level shape', () => {
    expect(parseSavedProfile('[]')).toEqual(empty);
    expect(parseSavedProfile('"x"')).toEqual(empty);
    expect(parseSavedProfile('5')).toEqual(empty);
    expect(parseSavedProfile('null')).toEqual(empty);
  });

  it('reads a good profile', () => {
    const raw = JSON.stringify({ eligibility: good, applied: [{ alias: 'a', at: '2026-01-01T00:00:00.000Z' }] });
    expect(parseSavedProfile(raw)).toEqual({
      eligibility: good,
      applied: [{ alias: 'a', at: '2026-01-01T00:00:00.000Z' }],
    });
  });

  it('drops eligibility with a bad incomeType or wrong field types', () => {
    expect(parseSavedProfile(JSON.stringify({ eligibility: { ...good, incomeType: 'student' } })).eligibility).toBeUndefined();
    expect(parseSavedProfile(JSON.stringify({ eligibility: { ...good, income: 75000 } })).eligibility).toBeUndefined();
    expect(parseSavedProfile(JSON.stringify({ eligibility: { pincode: '1' } })).eligibility).toBeUndefined();
  });

  it('drops bad applied entries and keeps good ones', () => {
    const raw = JSON.stringify({
      applied: [null, 3, { alias: 'a' }, { alias: '', at: 'x' }, { alias: 1, at: 'x' }, { alias: 'ok', at: 'x', extra: 1 }],
    });
    expect(parseSavedProfile(raw).applied).toEqual([{ alias: 'ok', at: 'x' }]);
  });

  it('treats a non-array applied as empty', () => {
    expect(parseSavedProfile(JSON.stringify({ applied: 'x' })).applied).toEqual([]);
  });

  it('does not carry unknown fields', () => {
    const p = parseSavedProfile(JSON.stringify({ eligibility: { ...good, eligibleAliases: ['a'] }, userId: 9, phone: '1' }));
    expect(p).toEqual({ eligibility: good, applied: [] });
  });
});

describe('addApplied', () => {
  it('appends a new alias', () => {
    expect(addApplied([], 'a', 't1')).toEqual([{ alias: 'a', at: 't1' }]);
  });

  it('keeps the FIRST at for a repeat alias', () => {
    const list = [{ alias: 'a', at: 't1' }];
    expect(addApplied(list, 'a', 't2')).toEqual([{ alias: 'a', at: 't1' }]);
  });

  it('ignores an empty alias', () => {
    expect(addApplied([], '', 't')).toEqual([]);
  });

  it(`caps at ${MAX_APPLIED_CARDS} and keeps the newest`, () => {
    let list: { alias: string; at: string }[] = [];
    for (let i = 0; i < MAX_APPLIED_CARDS + 5; i++) list = addApplied(list, `c${i}`, `t${i}`);
    expect(list).toHaveLength(MAX_APPLIED_CARDS);
    expect(list[0].alias).toBe('c5');
    expect(list[list.length - 1].alias).toBe(`c${MAX_APPLIED_CARDS + 4}`);
  });
});
