import {
  PROBE_SPENDS,
  categoriesForTags,
  orderChips,
  defaultSelection,
  toggleCategory,
  answeredCategories,
  canSeeResult,
  answersToSend,
  basedOnText,
  categoryCountText,
  groupSummary,
} from '../beatFlow';
import { EMPTY_SPENDS, TOOL_CATEGORIES, buildSpends } from '../cardTools';
import { keysForCategories } from '../toolFlows';

describe('beatFlow: probe', () => {
  it('PROBE_SPENDS is Amazon 5000 and every other key 0', () => {
    expect(PROBE_SPENDS).toEqual({ ...EMPTY_SPENDS, amazon_spends: 5000 });
    expect(Object.keys(PROBE_SPENDS)).toHaveLength(21);
    expect(Object.keys(PROBE_SPENDS).sort()).toEqual(Object.keys(buildSpends({})).sort());
    expect(PROBE_SPENDS.domestic_lounge_usage_quarterly).toBe(0);
    expect(PROBE_SPENDS.international_lounge_usage_quarterly).toBe(0);
    const others = Object.entries(PROBE_SPENDS).filter(([k]) => k !== 'amazon_spends');
    expect(others.every(([, v]) => v === 0)).toBe(true);
  });
});

describe('beatFlow: chips', () => {
  it('categoriesForTags maps tags uniquely in picker order, ignores UPI, lounge is travel', () => {
    expect(categoriesForTags([2, 7, 15, 4, 12])).toEqual(['shopping', 'groceries', 'travel']);
    expect(categoriesForTags([4])).toEqual(['travel']);
    expect(categoriesForTags([14, 1, 5, 6])).toEqual(['bills', 'fuel', 'food', 'dining']);
    expect(categoriesForTags([15, 99])).toEqual([]);
    expect(categoriesForTags([])).toEqual([]);
  });

  it('orderChips puts rewarded first, then the rest, each in picker order', () => {
    const chips = orderChips(['fuel', 'shopping']).map((c) => c.id);
    expect(chips).toHaveLength(10);
    expect(chips.slice(0, 2)).toEqual(['shopping', 'fuel']);
    expect(chips.slice(2)).toEqual(
      TOOL_CATEGORIES.map((c) => c.id).filter((id) => id !== 'shopping' && id !== 'fuel'),
    );
    expect(orderChips([]).map((c) => c.id)).toEqual(TOOL_CATEGORIES.map((c) => c.id));
  });

  it('defaultSelection picks categories with a saved answer above 0', () => {
    expect(defaultSelection({})).toEqual([]);
    expect(defaultSelection({ amazon_spends: 5000, fuel: 0 })).toEqual(['shopping']);
    expect(defaultSelection({ rent: 1, flights_annual: 1000 })).toEqual(['travel', 'rent']);
  });

  it('toggleCategory adds and removes, keeping picker order', () => {
    expect(toggleCategory([], 'fuel')).toEqual(['fuel']);
    expect(toggleCategory(['fuel'], 'shopping')).toEqual(['shopping', 'fuel']);
    expect(toggleCategory(['shopping', 'fuel', 'travel'], 'fuel')).toEqual(['shopping', 'travel']);
    expect(toggleCategory(['shopping', 'travel'], 'fuel')).toEqual(['shopping', 'fuel', 'travel']);
  });
});

describe('beatFlow: answers', () => {
  it('answeredCategories keeps selected categories with a value above 0', () => {
    expect(answeredCategories(['fuel', 'shopping', 'rent'], { amazon_spends: 100, rent: 0, fuel: 50 })).toEqual([
      'shopping',
      'fuel',
    ]);
    expect(answeredCategories([], { fuel: 50 })).toEqual([]);
  });

  it('canSeeResult is false when the only value is in an unselected category', () => {
    expect(canSeeResult(['shopping'], { fuel: 3000 })).toBe(false);
    expect(canSeeResult(['shopping'], { amazon_spends: 0 })).toBe(false);
    expect(canSeeResult(['shopping', 'fuel'], { fuel: 3000 })).toBe(true);
  });

  it('answersToSend keeps only selected keys, 0 for missing', () => {
    const a = answersToSend(['fuel', 'shopping'], { fuel: 3000, rent: 9999, flights_annual: 50000 });
    expect(Object.keys(a)).toEqual(keysForCategories(['shopping', 'fuel']));
    expect(a.fuel).toBe(3000);
    expect(a.amazon_spends).toBe(0);
    expect(a.flipkart_spends).toBe(0);
    expect(a.rent).toBeUndefined();
    expect(a.flights_annual).toBeUndefined();
    expect(answersToSend([], { fuel: 3000 })).toEqual({});
  });
});

describe('beatFlow: text', () => {
  it('basedOnText lists answered labels with "and" before the last', () => {
    expect(basedOnText([], {})).toBe('');
    expect(basedOnText(['fuel'], { amazon_spends: 100 })).toBe('');
    expect(basedOnText(['fuel'], { fuel: 100 })).toBe('Based on Fuel');
    expect(basedOnText(['fuel', 'shopping'], { fuel: 100, amazon_spends: 100 })).toBe(
      'Based on Shopping and Fuel',
    );
    expect(
      basedOnText(['dining', 'fuel', 'shopping'], { fuel: 100, amazon_spends: 100, dining_or_going_out: 100 }),
    ).toBe('Based on Shopping, Fuel and Dining Out');
    // Selected but unanswered categories are left out.
    expect(basedOnText(['fuel', 'shopping', 'rent'], { fuel: 100, amazon_spends: 100 })).toBe(
      'Based on Shopping and Fuel',
    );
  });

  it('categoryCountText is singular, plural or empty', () => {
    expect(categoryCountText(['fuel'], {})).toBe('');
    expect(categoryCountText(['fuel'], { fuel: 100 })).toBe('Based on 1 category');
    expect(
      categoryCountText(['fuel', 'shopping', 'rent'], { fuel: 100, amazon_spends: 1, rent: 5 }),
    ).toBe('Based on 3 categories');
    expect(categoryCountText(['fuel'], { rent: 5 })).toBe('');
  });

  it('groupSummary: monthly-only group sums a month', () => {
    expect(groupSummary('shopping', { amazon_spends: 5000, flipkart_spends: 7000, other_online_spends: 0 })).toBe(
      '₹12,000 a month',
    );
  });

  it('groupSummary: yearly group sums a year', () => {
    expect(groupSummary('travel', { flights_annual: 100000, hotels_annual: 20000 })).toBe('₹1,20,000 a year');
    expect(groupSummary('insurance', { life_insurance: 12000 })).toBe('₹12,000 a year');
  });

  it('groupSummary: mixed rupees and lounge visits', () => {
    expect(groupSummary('travel', { flights_annual: 5000, domestic_lounge_usage_quarterly: 4 })).toBe(
      '₹5,000 a year · 4 lounge visits a year',
    );
  });

  it('groupSummary: lounge visits only, summed', () => {
    expect(
      groupSummary('travel', { domestic_lounge_usage_quarterly: 4, international_lounge_usage_quarterly: 2 }),
    ).toBe('6 lounge visits a year');
  });

  it('groupSummary: nothing answered is empty', () => {
    expect(groupSummary('travel', {})).toBe('');
    expect(groupSummary('fuel', { fuel: 0, amazon_spends: 5000 })).toBe('');
  });
});
