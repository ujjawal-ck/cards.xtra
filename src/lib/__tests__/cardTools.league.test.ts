/**
 * Tools v2 (league table) tests: questions, categories, brands, the new mapper
 * fields and the league helpers. Rates are never written here: they are read
 * from the fixture and compared through the mapper.
 */
import {
  DEFAULT_LEAGUE_FILTERS,
  EMPTY_SPENDS,
  SPEND_QUESTIONS,
  TOOL_BRANDS,
  TOOL_CATEGORIES,
  beatMyCard,
  brandColumns,
  buildLeague,
  categoryIdForWord,
  enteredKeys,
  extrasYearly,
  filterLeague,
  joinAppCards,
  mapCalculateResponse,
  questionsForCategory,
  rankByNetValue,
  searchLeague,
  sortLeague,
  totalYearlySpend,
  yearlyForKey,
  type CardSavings,
  type CardSavingsLine,
} from '../cardTools';
import { CalculateResponse } from '../../api/schemas/calculate';

const fixture = require('../../api/__fixtures__/uat.calculate_trimmed.json');
const waiverFixture = require('../../api/__fixtures__/uat.calculate_waiver_lounge_trimmed.json');
const league = require('../../api/__fixtures__/uat.calculate_league_trimmed.json');

const card = (alias: string, p: Partial<CardSavings> = {}): CardSavings => ({
  alias,
  name: alias,
  discontinued: false,
  inviteOnly: false,
  lifetimeFree: false,
  monthlySavings: 0,
  yearlySavings: 0,
  extraBenefits: 0,
  joiningFee: 0,
  annualFee: 0,
  loungeValue: 0,
  feeWaiverSpend: 0,
  feeWaived: false,
  annualFeeCounted: 0,
  netYearly: 0,
  lines: [],
  ...p,
});

const line = (key: string, rawSavings: number, p: Partial<CardSavingsLine> = {}): CardSavingsLine => ({
  key,
  label: key,
  spend: 1000,
  savings: Math.round(rawSavings),
  rawSavings,
  explanation: '',
  ...p,
});

describe('SPEND_QUESTIONS', () => {
  it('has all 21 keys in the contract order and groups', () => {
    expect(SPEND_QUESTIONS.map((q) => `${q.group}:${q.key}`)).toEqual([
      'shopping:amazon_spends',
      'shopping:flipkart_spends',
      'shopping:other_online_spends',
      'shopping:other_offline_spends',
      'groceries:grocery_spends_online',
      'groceries:offline_grocery',
      'food:online_food_ordering',
      'dining:dining_or_going_out',
      'fuel:fuel',
      'travel:flights_annual',
      'travel:hotels_annual',
      'travel:domestic_lounge_usage_quarterly',
      'travel:international_lounge_usage_quarterly',
      'bills:mobile_phone_bills',
      'bills:electricity_bills',
      'bills:water_bills',
      'insurance:life_insurance',
      'insurance:insurance_health_annual',
      'insurance:insurance_car_or_bike_annual',
      'rent:rent',
      'education:school_fees',
    ]);
    expect(SPEND_QUESTIONS.map((q) => q.key).sort()).toEqual(Object.keys(EMPTY_SPENDS).sort());
  });

  it('has no `core` flag any more', () => {
    for (const q of SPEND_QUESTIONS) expect(q).not.toHaveProperty('core');
  });

  it('typed maxima follow the contract', () => {
    const max = (k: string) => SPEND_QUESTIONS.find((q) => q.key === k)!.max;
    for (const k of ['amazon_spends', 'flipkart_spends', 'other_online_spends', 'other_offline_spends', 'grocery_spends_online', 'offline_grocery', 'online_food_ordering', 'dining_or_going_out', 'fuel']) {
      expect(max(k)).toBe(1000000);
    }
    for (const k of ['mobile_phone_bills', 'electricity_bills', 'water_bills']) expect(max(k)).toBe(200000);
    for (const k of ['rent', 'school_fees', 'flights_annual', 'hotels_annual', 'life_insurance', 'insurance_health_annual', 'insurance_car_or_bike_annual']) {
      expect(max(k)).toBe(5000000);
    }
    expect(max('domestic_lounge_usage_quarterly')).toBe(40);
    expect(max('international_lounge_usage_quarterly')).toBe(40);
  });

  it('each ruler stays within the typed max, ends on a step and has at most about 250 ticks', () => {
    for (const q of SPEND_QUESTIONS) {
      expect(q.rulerMax).toBeLessThanOrEqual(q.max);
      expect(q.rulerMax).toBeGreaterThan(q.min);
      expect((q.rulerMax - q.min) % q.step).toBe(0);
      expect((q.rulerMax - q.min) / q.step + 1).toBeLessThanOrEqual(251);
    }
  });

  it('gives brand hints for the splits users find hard', () => {
    const hint = (k: string) => SPEND_QUESTIONS.find((q) => q.key === k)!.hint;
    expect(hint('grocery_spends_online')).toMatch(/Blinkit/);
    expect(hint('offline_grocery')).toMatch(/DMart/);
    expect(hint('other_online_spends')).toMatch(/Myntra/);
    expect(hint('online_food_ordering')).toMatch(/Swiggy/);
  });
});

describe('TOOL_CATEGORIES', () => {
  it('has the 10 categories in picker order', () => {
    expect(TOOL_CATEGORIES.map((c) => c.label)).toEqual([
      'Shopping',
      'Groceries',
      'Paying Bills',
      'Fuel',
      'Insurance',
      'Ordering Food',
      'Dining Out',
      'Travel',
      'Rent',
      'Education Fees',
    ]);
  });

  it('keys are the question group, and every question sits in exactly one category', () => {
    for (const c of TOOL_CATEGORIES) {
      expect(c.keys).toEqual(SPEND_QUESTIONS.filter((q) => q.group === c.id).map((q) => q.key));
    }
    const all = TOOL_CATEGORIES.flatMap((c) => c.keys);
    expect(all.sort()).toEqual(Object.keys(EMPTY_SPENDS).sort());
  });

  it('questionsForCategory gives the group in ask order, [] when unknown', () => {
    expect(questionsForCategory('groceries').map((q) => q.key)).toEqual(['grocery_spends_online', 'offline_grocery']);
    expect(questionsForCategory('travel')).toHaveLength(4);
    expect(questionsForCategory('nope')).toEqual([]);
  });

  it('every label (the Home tile word) resolves to its category', () => {
    for (const c of TOOL_CATEGORIES) expect(categoryIdForWord(c.label)).toBe(c.id);
    expect(categoryIdForWord('')).toBeUndefined();
  });
});

describe('TOOL_BRANDS and brandColumns', () => {
  it('maps the three new brands to one key each', () => {
    const b = (id: string) => TOOL_BRANDS.find((x) => x.id === id)!;
    expect(b('swiggy-instamart')).toMatchObject({ key: 'grocery_spends_online', exact: false, tab: 'groceries' });
    expect(b('dmart')).toMatchObject({ key: 'offline_grocery', exact: false, tab: 'groceries' });
    expect(b('jio')).toMatchObject({ key: 'mobile_phone_bills', exact: false, tab: 'bills' });
  });

  it('only Amazon and Flipkart are exact; every other brand says how it is counted; tabs are category ids', () => {
    const ids = new Set(TOOL_CATEGORIES.map((c) => c.id));
    for (const b of TOOL_BRANDS) {
      expect(ids.has(b.tab)).toBe(true);
      expect(b.exact).toBe(b.id === 'amazon' || b.id === 'flipkart');
      if (!b.exact) expect(b.groupLabel).toBeTruthy();
    }
    expect(new Set(TOOL_BRANDS.map((b) => b.id)).size).toBe(TOOL_BRANDS.length);
  });

  it('one column per distinct key, names joined with " + ", in pick order', () => {
    expect(brandColumns(['swiggy', 'amazon', 'zomato', 'swiggy', 'nope'])).toEqual([
      { key: 'online_food_ordering', label: 'Swiggy + Zomato' },
      { key: 'amazon_spends', label: 'Amazon' },
    ]);
    expect(brandColumns([])).toEqual([]);
  });
});

describe('mapper: new fields on the league fixture', () => {
  const rows: any[] = league.data.savings;
  const list = mapCalculateResponse(league);
  const by = (a: string) => list.find((c) => c.alias === a)!;
  const raw = (a: string) => rows.find((r) => r.seo_card_alias === a)!;

  it('the fixture passes the calculate schema and maps every row', () => {
    expect(CalculateResponse.safeParse(league).success).toBe(true);
    expect(list).toHaveLength(rows.length);
  });

  it('netYearly still equals round(roi) within 2 rupees', () => {
    for (const r of rows) {
      expect(Math.abs(by(r.seo_card_alias).netYearly - Math.round(Number(r.roi)))).toBeLessThanOrEqual(2);
    }
  });

  it('covers the cases the league needs', () => {
    expect(list.some((c) => c.discontinued)).toBe(true);
    expect(list.some((c) => c.inviteOnly)).toBe(true);
    expect(list.some((c) => c.lifetimeFree)).toBe(true);
    expect(list.some((c) => c.feeWaived)).toBe(true);
    expect(list.some((c) => c.netYearly <= 0)).toBe(true);
    expect(list.some((c) => c.lines.some((l) => l.cashbackPct !== undefined))).toBe(true);
    expect(list.some((c) => c.lines.some((l) => l.savingsType === 'points' && l.pointValue !== undefined))).toBe(true);
  });

  it('discontinued only when sourceable is false or 0', () => {
    for (const r of rows) {
      expect(by(r.seo_card_alias).discontinued).toBe(r.sourceable === false || r.sourceable === 0);
    }
    expect(by('sbi-ola-money-credit-card').discontinued).toBe(true);
    // The old fixtures have no `sourceable`: missing is not discontinued.
    for (const c of [...mapCalculateResponse(fixture), ...mapCalculateResponse(waiverFixture)]) {
      expect(c.discontinued).toBe(false);
    }
  });

  it('invite only from true or 1', () => {
    expect(by('kotak-solitaire-credit-card').inviteOnly).toBe(true);
    expect(by('hsbc-live-plus-credit-card').inviteOnly).toBe(false);
  });

  it('lifetime free needs both fees 0, not discontinued and not invite only', () => {
    expect(by('icici-amazon-pay-credit-card')).toMatchObject({ annualFee: 0, joiningFee: 0, lifetimeFree: true });
    // Both fees 0 but invite only.
    expect(by('kotak-solitaire-credit-card')).toMatchObject({ annualFee: 0, joiningFee: 0, lifetimeFree: false });
    // Annual fee 0 but a joining fee.
    expect(by('makemytrip-icici-signature')).toMatchObject({ annualFee: 0, lifetimeFree: false });
    // A waived fee is not lifetime free.
    expect(by('hsbc-live-plus-credit-card')).toMatchObject({ feeWaived: true, lifetimeFree: false });
  });

  it('bank name and image from the row, image falls back to card_bg_image', () => {
    const r = raw('hsbc-live-plus-credit-card');
    expect(by('hsbc-live-plus-credit-card')).toMatchObject({ bankName: r.bank_name, imageUrl: r.image });
    const [c] = mapCalculateResponse({ data: { savings: [{ seo_card_alias: 'x', image: '', card_bg_image: 'https://img/bg.png', bank_name: ' ' }] } });
    expect(c.imageUrl).toBe('https://img/bg.png');
    expect(c.bankName).toBeUndefined();
  });

  it('line fields come from the API as sent, and only when sent', () => {
    for (const r of rows) {
      const c = by(r.seo_card_alias);
      for (const l of c.lines) {
        const src = r.spending_breakdown[l.key];
        expect(l.savingsType).toBe(src.savings_type ?? undefined);
        expect(l.cashbackPct).toBe(src.cashback_percentage ?? undefined);
        expect(l.pointValue).toBe(src.conv_rate ?? undefined);
        expect(l.pointsEarned).toBe(src.points_earned ?? undefined);
        if (!('cashback_percentage' in src)) expect(l).not.toHaveProperty('cashbackPct');
      }
    }
  });

  it('keeps the yearly explanation first and adds the monthly one', () => {
    const l = by('hsbc-live-plus-credit-card').lines.find((x) => x.key === 'amazon_spends')!;
    expect(l.explanation).toMatch(/^On yearly spends/);
    expect(l.explanationMonthly).toMatch(/^On monthly spends/);
    expect(l.explanationMonthly).not.toContain('<');
  });
});

describe('guard: netYearly and rank order of the two existing fixtures did not change', () => {
  it('uat.calculate_trimmed', () => {
    const out = rankByNetValue(mapCalculateResponse(fixture)).map((c) => [c.alias, c.netYearly]);
    expect(out).toEqual([
      ['bob-cashback-credit-card', 11111],
      ['cred-indusind-bank-credit-card', 11111],
      ['sbi-cashback-credit-card', 10740],
      ['phonepe-sbi-card-select-black', 9931],
      ['magnus-burgundy-credit-card', -22764],
    ]);
  });

  it('uat.calculate_waiver_lounge_trimmed', () => {
    const out = rankByNetValue(mapCalculateResponse(waiverFixture)).map((c) => [c.alias, c.netYearly]);
    expect(out).toEqual([
      ['hsbc-live-plus-credit-card', 11160],
      ['american-express-mr-credit-card', 9674],
      ['idfc-first-hello-cashback-credit-card', 8340],
      ['reliance-sbi-card-prime', 7561],
      ['paytm-hdfc-bank-select-credit-card', 7200],
      ['canara-rupay-select-credit-card', 6246],
    ]);
  });
});

describe('yearlyForKey', () => {
  it('rounds raw monthly savings x 12 once, 0 when absent or outside the total', () => {
    const c = card('a', {
      lines: [line('amazon_spends', 107.5), line('domestic_lounge_usage_quarterly', 500, { outsideTotal: true })],
    });
    expect(yearlyForKey(c, 'amazon_spends')).toBe(1290);
    expect(yearlyForKey(c, 'fuel')).toBe(0);
    expect(yearlyForKey(c, 'domestic_lounge_usage_quarterly')).toBe(0);
  });
});

describe('enteredKeys and totalYearlySpend', () => {
  const spends = {
    ...EMPTY_SPENDS,
    fuel: 3000,
    amazon_spends: 5000,
    flights_annual: 60000,
    life_insurance: 24000,
    domestic_lounge_usage_quarterly: 2,
  };

  it('enteredKeys: keys above 0 in question order, no lounge keys', () => {
    expect(enteredKeys(spends)).toEqual(['amazon_spends', 'fuel', 'flights_annual', 'life_insurance']);
    expect(enteredKeys(EMPTY_SPENDS)).toEqual([]);
  });

  it('totalYearlySpend: monthly x 12 plus yearly inputs, lounge not counted', () => {
    expect(totalYearlySpend(spends)).toBe((5000 + 3000) * 12 + 60000 + 24000);
    expect(totalYearlySpend(EMPTY_SPENDS)).toBe(0);
  });
});

describe('filterLeague', () => {
  const list = [
    card('ltf', { lifetimeFree: true, netYearly: 100 }),
    card('invite', { inviteOnly: true, netYearly: 200 }),
    card('loss', { netYearly: -50 }),
    card('gone', { discontinued: true, netYearly: 10 }),
  ];

  it('defaults keep everything (loss-making and discontinued too)', () => {
    expect(DEFAULT_LEAGUE_FILTERS).toEqual({ lifetimeFreeOnly: false, includeInviteOnly: true });
    expect(filterLeague(list, DEFAULT_LEAGUE_FILTERS).map((c) => c.alias)).toEqual(['ltf', 'invite', 'loss', 'gone']);
  });

  it('lifetime free only, and invite only left out', () => {
    expect(filterLeague(list, { lifetimeFreeOnly: true, includeInviteOnly: true }).map((c) => c.alias)).toEqual(['ltf']);
    expect(filterLeague(list, { lifetimeFreeOnly: false, includeInviteOnly: false }).map((c) => c.alias)).toEqual(['ltf', 'loss', 'gone']);
  });

  it('works on league rows and keeps their rank', () => {
    const rows = list.map((savings, i) => ({ rank: i + 1, savings }));
    const out = filterLeague(rows, { lifetimeFreeOnly: false, includeInviteOnly: false });
    expect(out.map((r) => r.rank)).toEqual([1, 3, 4]);
  });
});

describe('sortLeague', () => {
  const a = card('a', { netYearly: 300, yearlySavings: 100, extraBenefits: 0, loungeValue: 0, annualFeeCounted: 500, lines: [line('fuel', 1)] });
  const b = card('b', { netYearly: 200, yearlySavings: 400, extraBenefits: 50, loungeValue: 100, annualFeeCounted: 0, lines: [line('fuel', 10)] });
  const c = card('c', { netYearly: 100, yearlySavings: 400, extraBenefits: 0, loungeValue: 0, annualFeeCounted: 0 });
  const list = [c, a, b];
  const order = (s: Parameters<typeof sortLeague>[1]) => sortLeague(list, s).map((x) => x.alias);

  it("'net' is the rankByNetValue order", () => {
    expect(order('net')).toEqual(rankByNetValue(list).map((x) => x.alias));
    expect(order('net')).toEqual(['a', 'b', 'c']);
  });

  it("'savings' high to low, ties by net", () => {
    expect(order('savings')).toEqual(['b', 'c', 'a']);
  });

  it("'extras' is extra benefits plus lounge value, high to low", () => {
    expect(extrasYearly(b)).toBe(150);
    expect(order('extras')).toEqual(['b', 'a', 'c']);
  });

  it("'fee' is the counted fee, low to high, ties by net", () => {
    expect(order('fee')).toEqual(['b', 'c', 'a']);
  });

  it('{ key } sorts by yearly savings on that key', () => {
    expect(order({ key: 'fuel' })).toEqual(['b', 'a', 'c']);
  });

  it('works on league rows and does not mutate the input', () => {
    const rows = list.map((savings, i) => ({ rank: i + 1, savings }));
    const out = sortLeague(rows, 'net');
    expect(out.map((r) => r.savings.alias)).toEqual(['a', 'b', 'c']);
    expect(rows.map((r) => r.savings.alias)).toEqual(['c', 'a', 'b']);
  });
});

describe('searchLeague', () => {
  const rows = [
    { rank: 1, savings: card('x', { name: 'HDFC Millennia', bankName: 'HDFC Bank' }) },
    { rank: 2, savings: card('y', { name: 'Cashback Card', bankName: 'SBI' }), card: { name: 'SBI Cashback' } },
    { rank: 3, savings: card('z', { name: 'Ace' }) },
  ];

  it('matches name or bank, ignoring case and outer spaces', () => {
    expect(searchLeague(rows, '  hdfc ')).toEqual([0]);
    expect(searchLeague(rows, 'sbi')).toEqual([1]);
    expect(searchLeague(rows, 'CARD')).toEqual([1]);
    expect(searchLeague(rows, 'nothing')).toEqual([]);
  });

  it('also matches the app card name', () => {
    expect(searchLeague(rows, 'sbi cashback')).toEqual([1]);
  });

  it('an empty query returns []', () => {
    expect(searchLeague(rows, '')).toEqual([]);
    expect(searchLeague(rows, '   ')).toEqual([]);
  });
});

describe('beatMyCard v2 fields', () => {
  it('each row carries the yearly spend and both lines', () => {
    const mineAmazon = line('amazon_spends', 100);
    const bestAmazon = line('amazon_spends', 300);
    const bestFuel = line('fuel', 10, { spend: 2000 });
    const ranked = [
      card('best', { netYearly: 5000, lines: [bestAmazon, bestFuel] }),
      card('mine', { netYearly: 2000, lines: [mineAmazon] }),
    ];
    const r = beatMyCard(ranked, 'mine')!;
    const amazon = r.rows.find((x) => x.key === 'amazon_spends')!;
    expect(amazon).toMatchObject({ spendYearly: 12000, mine: 1200, best: 3600 });
    expect(amazon.mineLine).toBe(mineAmazon);
    expect(amazon.bestLine).toBe(bestAmazon);
    const fuel = r.rows.find((x) => x.key === 'fuel')!;
    expect(fuel).toMatchObject({ spendYearly: 24000, mine: 0, best: 120 });
    expect(fuel.mineLine).toBeUndefined();
  });

  it('finds my card in `all` when a filter hid it', () => {
    const mine = card('mine', { netYearly: 2000, inviteOnly: true });
    const best = card('best', { netYearly: 5000 });
    const filtered = [best];
    expect(beatMyCard(filtered, 'mine')).toBeNull();
    const r = beatMyCard(filtered, 'mine', [best, mine])!;
    expect(r.mine.alias).toBe('mine');
    expect(r.best.alias).toBe('best');
    expect(r.verdict).toBe('best_wins');
  });

  it('on the fixture, the best card is never mine', () => {
    const ranked = rankByNetValue(mapCalculateResponse(league));
    const r = beatMyCard(ranked, ranked[0].alias)!;
    expect(r.best.alias).toBe(ranked[1].alias);
    expect(r.verdict).toBe('mine_wins');
    for (const row of r.rows) expect(row.spendYearly).toBeGreaterThan(0);
  });
});

describe('joinAppCards and buildLeague', () => {
  const ranked = [card('a', { id: '1' }), card('b', { id: '2' }), card('c', { id: '3' })];
  const appA = { id: '99', filterMeta: { cardAlias: 'a' }, name: 'App A' };
  const appB = { id: '2', name: 'App B' };
  // Same alias as A: an app card joins at most one row, the first wins.
  const appA2 = { id: '98', filterMeta: { cardAlias: 'a' }, name: 'App A2' };

  it('joins by alias first, then by id, one app card per row', () => {
    const m = joinAppCards(ranked, [appA, appB, appA2]);
    expect(m.get(ranked[0])).toBe(appA);
    expect(m.get(ranked[1])).toBe(appB);
    expect(m.get(ranked[2])).toBeUndefined();
  });

  it('an alias match beats an id match for the same app card', () => {
    const both = { id: '1', filterMeta: { cardAlias: 'b' } };
    const m = joinAppCards(ranked, [both]);
    expect(m.get(ranked[1])).toBe(both);
    expect(m.get(ranked[0])).toBeUndefined();
  });

  it('keeps every row with its overall rank; card only when joined', () => {
    const out = buildLeague(ranked, [appA, appB]);
    expect(out.map((r) => [r.rank, r.savings.alias, r.card?.name])).toEqual([
      [1, 'a', 'App A'],
      [2, 'b', 'App B'],
      [3, 'c', undefined],
    ]);
    expect(out[2]).not.toHaveProperty('card');
  });

  it('loads without the cards list (undefined): every row, no card', () => {
    const out = buildLeague(ranked, undefined);
    expect(out).toHaveLength(3);
    for (const r of out) expect(r.card).toBeUndefined();
  });

  it('with showNotInApp false, only joined rows, ranked again', () => {
    const out = buildLeague(ranked, [appB], false);
    expect(out.map((r) => [r.rank, r.savings.alias])).toEqual([[1, 'b']]);
  });
});
