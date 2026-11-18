/**
 * leagueView tests. Rates are never written here: a rate is read from the
 * fixture through the mapper and compared with what the helper returns.
 */
import {
  EMPTY_SPENDS,
  SPEND_QUESTIONS,
  mapCalculateResponse,
  rankByNetValue,
  yearlyForKey,
  type CardSavings,
  type CardSavingsLine,
} from '../cardTools';
import {
  breakdownLines,
  cardLabels,
  editKeys,
  editSheetItems,
  indexOfAlias,
  leagueColumns,
  lineFigures,
  rewardText,
  rowSum,
  rulerRange,
  sortOptions,
  stepCursor,
  topByKey,
} from '../leagueView';

const league = require('../../api/__fixtures__/uat.calculate_league_trimmed.json');
const mapped: CardSavings[] = rankByNetValue(mapCalculateResponse(league));

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
  explanation: 'yearly text',
  ...p,
});

describe('leagueColumns', () => {
  const spends = { ...EMPTY_SPENDS, amazon_spends: 5000, online_food_ordering: 2000, domestic_lounge_usage_quarterly: 2 };

  it('lists entered keys with question labels, lounge keys left out', () => {
    expect(leagueColumns('ultimate', spends)).toEqual([
      { key: 'amazon_spends', label: 'Amazon' },
      { key: 'online_food_ordering', label: 'Food delivery' },
    ]);
  });

  it('uses brand names for the brands tool and drops keys with no spend', () => {
    expect(leagueColumns('brands', spends, ['swiggy', 'zomato', 'amazon', 'myntra'])).toEqual([
      { key: 'online_food_ordering', label: 'Swiggy + Zomato' },
      { key: 'amazon_spends', label: 'Amazon' },
    ]);
  });

  it('falls back to question labels when no brand column has a spend', () => {
    expect(leagueColumns('brands', spends, ['myntra'])).toEqual(leagueColumns('category', spends));
  });
});

describe('sortOptions', () => {
  it('has the four fixed sorts first, then one per column', () => {
    const opts = sortOptions([{ key: 'fuel', label: 'Fuel' }]);
    expect(opts.map((o) => o.label)).toEqual(['Annual savings', 'Savings', 'Milestones', 'Lowest fee', 'Fuel']);
    expect(opts[2].sort).toBe('extras');
    expect(opts[4]).toEqual({ id: 'key:fuel', label: 'Fuel', sort: { key: 'fuel' } });
  });
});

describe('editKeys and editSheetItems', () => {
  it('gives all 21 keys for ultimate and beat', () => {
    expect(editKeys('ultimate', {})).toHaveLength(21);
    expect(editKeys('beat', { fuel: 1 })).toHaveLength(21);
  });

  it('gives only answered keys, in question order, for category and brands', () => {
    expect(editKeys('category', { fuel: 0, amazon_spends: 100 })).toEqual(['amazon_spends', 'fuel']);
    expect(editKeys('brands', {})).toEqual([]);
  });

  it('puts each category heading once before its questions', () => {
    const items = editSheetItems(['offline_grocery', 'amazon_spends', 'grocery_spends_online']);
    expect(items.map((i) => (i.type === 'group' ? `#${i.label}` : i.id))).toEqual([
      '#Shopping',
      'amazon_spends',
      '#Groceries',
      'grocery_spends_online',
      'offline_grocery',
    ]);
  });

  it('lists all 21 questions under 10 headings by default', () => {
    const items = editSheetItems();
    expect(items.filter((i) => i.type === 'question')).toHaveLength(SPEND_QUESTIONS.length);
    expect(items.filter((i) => i.type === 'group')).toHaveLength(10);
  });
});

describe('topByKey', () => {
  it('keeps the highest yearly value of each key, only above 0', () => {
    const a = card('a', { lines: [line('fuel', 10), line('rent', 0)] });
    const b = card('b', { lines: [line('fuel', 25.5)] });
    expect(topByKey([a, b], ['fuel', 'rent', 'amazon_spends'])).toEqual({ fuel: Math.round(25.5 * 12) });
  });
});

describe('cardLabels', () => {
  it('lists the labels in a fixed order', () => {
    expect(cardLabels(card('x', { discontinued: true, inviteOnly: true }))).toEqual(['inviteOnly', 'discontinued']);
    expect(cardLabels(card('y', { lifetimeFree: true }))).toEqual(['lifetimeFree']);
    expect(cardLabels(card('z'))).toEqual([]);
  });

  it('finds every label kind in the fixture', () => {
    const all = new Set(mapped.flatMap(cardLabels));
    expect([...all].sort()).toEqual(['discontinued', 'inviteOnly', 'lifetimeFree']);
  });
});

describe('rewardText', () => {
  it('builds the text the way CardTile does', () => {
    expect(rewardText({ cashbackValue: 'VALUE', rewardPrefix: 'Upto' })).toBe('Upto VALUE Rewards');
    expect(rewardText({ cashbackValue: 'VALUE' })).toBe('Flat VALUE Rewards');
  });

  it('is undefined without a value', () => {
    expect(rewardText(undefined)).toBeUndefined();
    expect(rewardText({ cashbackValue: '  ' })).toBeUndefined();
  });
});

describe('stepCursor', () => {
  it('wraps at both ends', () => {
    expect(stepCursor(2, 3, 1)).toBe(0);
    expect(stepCursor(0, 3, -1)).toBe(2);
    expect(stepCursor(1, 3, 1)).toBe(2);
    expect(stepCursor(5, 0, 1)).toBe(0);
  });
});

describe('rowSum on the fixture', () => {
  it('adds up for every card: savings + milestones + lounge - counted fee = net', () => {
    expect(mapped.length).toBeGreaterThan(5);
    for (const s of mapped) {
      const r = rowSum(s);
      expect(r.savings + r.milestones + r.lounge - r.feeCounted).toBe(r.net);
      expect(r.feeCounted).toBe(r.feeWaived ? 0 : r.fee);
    }
  });

  it('has a waived fee and a loss-making card', () => {
    expect(mapped.some((s) => rowSum(s).feeWaived && rowSum(s).fee > 0)).toBe(true);
    expect(mapped.some((s) => rowSum(s).net <= 0)).toBe(true);
  });
});

describe('breakdownLines and lineFigures', () => {
  it('leaves out lounge lines and lines with no spend', () => {
    const s = card('a', {
      lines: [
        line('fuel', 5),
        line('domestic_lounge_usage_quarterly', 100, { outsideTotal: true }),
        line('rent', 5, { spend: 0 }),
      ],
    });
    expect(breakdownLines(s).map((l) => l.key)).toEqual(['fuel']);
  });

  it('gives yearly and monthly figures from the monthly line', () => {
    const l = line('fuel', 10.4, { spend: 3000, explanationMonthly: 'monthly text' });
    expect(lineFigures(l, 'month')).toEqual({ spend: 3000, savings: 10, explanation: 'monthly text' });
    expect(lineFigures(l, 'year')).toEqual({ spend: 36000, savings: Math.round(10.4 * 12), explanation: 'yearly text' });
    expect(lineFigures(line('fuel', 1), 'month').explanation).toBe('yearly text');
  });

  it('agrees with yearlyForKey', () => {
    for (const s of mapped) {
      for (const l of breakdownLines(s)) expect(lineFigures(l, 'year').savings).toBe(yearlyForKey(s, l.key));
    }
  });

  it('passes the API rate through: percent when sent, else points', () => {
    const withPct = mapped.flatMap((s) => s.lines).find((l) => l.cashbackPct !== undefined);
    expect(withPct).toBeDefined();
    expect(lineFigures(withPct!, 'year').rate).toEqual({ kind: 'percent', percent: withPct!.cashbackPct });

    const withPoints = mapped.flatMap((s) => s.lines).find((l) => l.cashbackPct === undefined && (l.pointsEarned ?? 0) > 0);
    expect(withPoints).toBeDefined();
    const rate = lineFigures(withPoints!, 'month').rate;
    expect(rate?.kind).toBe('points');
    if (rate?.kind === 'points') {
      expect(rate.points).toBe(Math.round(withPoints!.pointsEarned! * 100) / 100);
      expect(rate.pointValue).toBe(withPoints!.pointValue);
    }
  });

  it('has no rate when the API sent neither', () => {
    expect(lineFigures(line('fuel', 1), 'year').rate).toBeUndefined();
  });

  it('shows no points row when the API sent 0 points', () => {
    expect(lineFigures(line('fuel', 1, { pointsEarned: 0 }), 'year').rate).toBeUndefined();
    expect(lineFigures(line('fuel', 1, { pointsEarned: 0, pointValue: 1 }), 'month').rate).toBeUndefined();
  });

  it('yearly spend uses the unrounded monthly spend, rounded once', () => {
    // A yearly input of 1,00,000 comes back as 1,00,000 / 12 a month.
    const raw = 100000 / 12;
    const l = line('flights_annual', 1, { spend: Math.round(raw), rawSpend: raw });
    expect(lineFigures(l, 'year').spend).toBe(100000);
    expect(lineFigures(l, 'month').spend).toBe(Math.round(raw));
  });
});

describe('indexOfAlias', () => {
  it('finds a row by alias', () => {
    const rows = mapped.map((savings) => ({ savings }));
    expect(indexOfAlias(rows, mapped[2].alias)).toBe(2);
    expect(indexOfAlias(rows, 'nope')).toBe(-1);
    expect(indexOfAlias(rows, undefined)).toBe(-1);
  });
});

describe('rulerRange', () => {
  const q = SPEND_QUESTIONS.find((x) => x.key === 'amazon_spends')!;

  it('keeps rulerMax for values up to it', () => {
    expect(rulerRange(q, 0)).toEqual({ max: q.rulerMax });
    expect(rulerRange(q, q.rulerMax)).toEqual({ max: q.rulerMax });
  });

  it('stretches to the value, rounded up to a whole step, never above the typed max', () => {
    expect(rulerRange(q, q.rulerMax + 1)).toEqual({ max: q.rulerMax + q.step });
    expect(rulerRange(q, q.max * 2)).toEqual({ max: q.max });
  });
});
