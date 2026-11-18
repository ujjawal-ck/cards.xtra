import { mergeAnswers, parseSavedSpends } from '../savedSpends';
import { SPEND_QUESTIONS } from '../cardTools';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const maxOf = (key: string) => SPEND_QUESTIONS.find((q) => q.key === key)!.max;

describe('parseSavedSpends', () => {
  it('reads known keys with finite numbers', () => {
    expect(parseSavedSpends(JSON.stringify({ amazon_spends: 5000, domestic_lounge_usage_quarterly: 6 }))).toEqual({
      amazon_spends: 5000,
      domestic_lounge_usage_quarterly: 6,
    });
  });

  it('gives {} for empty, bad JSON and bad shapes', () => {
    expect(parseSavedSpends(null)).toEqual({});
    expect(parseSavedSpends(undefined)).toEqual({});
    expect(parseSavedSpends('')).toEqual({});
    expect(parseSavedSpends('{not json')).toEqual({});
    expect(parseSavedSpends('[1,2]')).toEqual({});
    expect(parseSavedSpends('"text"')).toEqual({});
    expect(parseSavedSpends('null')).toEqual({});
  });

  it('drops unknown keys and values that are not finite numbers', () => {
    expect(
      parseSavedSpends(JSON.stringify({ nope: 5, fuel: '3000', rent: null, water_bills: true, dining_or_going_out: 2000 })),
    ).toEqual({ dining_or_going_out: 2000 });
  });

  it('clamps to the question min and max', () => {
    expect(
      parseSavedSpends(JSON.stringify({ fuel: -10, amazon_spends: 99999999, international_lounge_usage_quarterly: 500 })),
    ).toEqual({
      fuel: 0,
      amazon_spends: maxOf('amazon_spends'),
      international_lounge_usage_quarterly: maxOf('international_lounge_usage_quarterly'),
    });
  });
});

describe('mergeAnswers', () => {
  it('new answers win key by key, others are kept', () => {
    expect(mergeAnswers({ fuel: 3000, rent: 20000 }, { fuel: 4000, amazon_spends: 1000 })).toEqual({
      fuel: 4000,
      rent: 20000,
      amazon_spends: 1000,
    });
  });

  it('a 0 answer replaces a saved one', () => {
    expect(mergeAnswers({ fuel: 3000 }, { fuel: 0 })).toEqual({ fuel: 0 });
  });

  it('cleans both sides the same way as a parse', () => {
    const bad = { nope: 1, fuel: Number.NaN, rent: 1e12 } as any;
    expect(mergeAnswers(bad, { water_bills: -5 })).toEqual({ rent: maxOf('rent'), water_bills: 0 });
  });
});
