import {
  hasAnyAnswer,
  orderedCategories,
  keysForCategories,
  categoryAnswers,
  categorySubtitle,
  toggleId,
  toggleBrand,
  brandTabs,
  filterBrands,
  brandAnswers,
  brandsSubtitle,
  BRANDS_HONEST_LINE,
} from '../toolFlows';
import { TOOL_BRANDS, MAX_BRANDS, SPEND_QUESTIONS } from '../cardTools';

describe('toolFlows: answers', () => {
  it('hasAnyAnswer checks all keys or a subset', () => {
    expect(hasAnyAnswer({})).toBe(false);
    expect(hasAnyAnswer({ fuel: 0 })).toBe(false);
    expect(hasAnyAnswer({ fuel: 100 })).toBe(true);
    expect(hasAnyAnswer({ fuel: 100 }, ['rent'])).toBe(false);
  });

  it('orders chosen categories like the picker', () => {
    expect(orderedCategories(['fuel', 'shopping', 'nope']).map((c) => c.id)).toEqual(['shopping', 'fuel']);
  });

  it('categoryAnswers holds only the chosen keys, 0 for blank', () => {
    const a = categoryAnswers(['fuel', 'shopping'], { fuel: 3000, rent: 9999 });
    expect(Object.keys(a)).toEqual([...keysForCategories(['shopping', 'fuel'])]);
    expect(a.fuel).toBe(3000);
    expect(a.amazon_spends).toBe(0);
    expect(a.rent).toBeUndefined();
  });

  it('builds the subtitle from labels in picker order', () => {
    expect(categorySubtitle(['fuel', 'shopping'])).toBe('Shopping, Fuel');
    expect(categorySubtitle([])).toBe('');
  });

  it('toggles a category id', () => {
    expect(toggleId([], 'fuel')).toEqual(['fuel']);
    expect(toggleId(['fuel', 'rent'], 'fuel')).toEqual(['rent']);
  });
});

describe('toolFlows: brands', () => {
  it('stops adding at the limit but still removes', () => {
    const full = TOOL_BRANDS.slice(0, MAX_BRANDS).map((b) => b.id);
    expect(toggleBrand(full, TOOL_BRANDS[MAX_BRANDS].id)).toEqual(full);
    expect(toggleBrand(full, full[0])).toEqual(full.slice(1));
    expect(toggleBrand([], 'amazon')).toEqual(['amazon']);
  });

  it('lists only the tabs in use, in category order', () => {
    const tabs = brandTabs();
    expect(tabs[0]).toBe('shopping');
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(tabs).toContain('bills');
  });

  it('filters by tab and by name', () => {
    expect(filterBrands(TOOL_BRANDS, 'all', '').length).toBe(TOOL_BRANDS.length);
    expect(filterBrands(TOOL_BRANDS, 'food', '').map((b) => b.id)).toEqual(['swiggy', 'zomato']);
    expect(filterBrands(TOOL_BRANDS, 'all', '  MYN ').map((b) => b.id)).toEqual(['myntra']);
    expect(filterBrands(TOOL_BRANDS, 'food', 'amazon')).toEqual([]);
  });

  it('sums brand amounts per key', () => {
    const a = brandAnswers([
      { brandId: 'swiggy', monthly: 2000 },
      { brandId: 'zomato', monthly: 1500 },
      { brandId: 'amazon', monthly: 5000 },
      { brandId: 'myntra', monthly: 0 },
      { brandId: 'unknown', monthly: 100 },
    ]);
    expect(a).toEqual({ online_food_ordering: 3500, amazon_spends: 5000 });
  });

  it('shows the honest line only for counted-by-category brands with a spend', () => {
    expect(brandsSubtitle([{ brandId: 'amazon', monthly: 100 }])).toBeUndefined();
    expect(brandsSubtitle([{ brandId: 'swiggy', monthly: 0 }])).toBeUndefined();
    expect(brandsSubtitle([{ brandId: 'swiggy', monthly: 10 }])).toBe(BRANDS_HONEST_LINE);
  });

  it('every question key is reachable from a category', () => {
    const keys = orderedCategories(['shopping', 'groceries', 'bills', 'fuel', 'insurance', 'food', 'dining', 'travel', 'rent', 'education']).flatMap((c) => c.keys);
    expect(keys.sort()).toEqual(SPEND_QUESTIONS.map((q) => q.key).sort());
  });
});
