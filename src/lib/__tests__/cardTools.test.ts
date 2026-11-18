import {
  EMPTY_SPENDS,
  SPEND_QUESTIONS,
  beatMyCard,
  brandIdForWord,
  buildSpends,
  categoryIdForWord,
  hasAnySpend,
  mapCalculateResponse,
  rankByNetValue,
  ROTATING_BRANDS,
  TOOL_BRANDS,
  TOOL_CATEGORIES,
  spendsFromBrands,
  spendsKey,
  stripHtml,
  toApiValue,
  type CardSavings,
} from '../cardTools';

const fixture = require('../../api/__fixtures__/uat.calculate_trimmed.json');
const waiverFixture = require('../../api/__fixtures__/uat.calculate_waiver_lounge_trimmed.json');

/** A small synthetic card for ranking and beat tests. */
const card = (alias: string, p: Partial<CardSavings> = {}): CardSavings => ({
  alias,
  name: alias,
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
  discontinued: false,
  inviteOnly: false,
  lifetimeFree: false,
  ...p,
});

describe('mapCalculateResponse on the UAT fixture', () => {
  const list = mapCalculateResponse(fixture);
  const byAlias = (a: string) => list.find((c) => c.alias === a)!;

  it('maps all 5 cards', () => {
    expect(list).toHaveLength(5);
    expect(list.map((c) => c.alias)).toContain('magnus-burgundy-credit-card');
  });

  it('parses fees from strings and rounds money to whole rupees', () => {
    const bob = byAlias('bob-cashback-credit-card');
    expect(bob.annualFee).toBe(589);
    expect(bob.joiningFee).toBe(589);
    const magnus = byAlias('magnus-burgundy-credit-card');
    expect(magnus.annualFee).toBe(35400);
    expect(magnus.yearlySavings).toBe(12636);
    expect(magnus.monthlySavings).toBe(1053);
    const cred = byAlias('cred-indusind-bank-credit-card');
    expect(cred.joiningFee).toBe(0);
    expect(cred.annualFee).toBe(589);
  });

  it('computes netYearly = yearly + extra + lounge - counted annual fee', () => {
    for (const c of list) {
      expect(c.netYearly).toBe(c.yearlySavings + c.extraBenefits + c.loungeValue - c.annualFeeCounted);
    }
    expect(byAlias('cred-indusind-bank-credit-card').netYearly).toBe(11111);
    expect(byAlias('bob-cashback-credit-card').netYearly).toBe(11111);
    expect(byAlias('magnus-burgundy-credit-card').netYearly).toBe(-22764);
    expect(byAlias('phonepe-sbi-card-select-black').netYearly).toBe(9931);
    // Fee 1,179 waived at 2,00,000 a year; monthly spends 22,500 x 12 = 2,70,000.
    const sbi = byAlias('sbi-cashback-credit-card');
    expect(sbi).toMatchObject({ annualFee: 1179, feeWaiverSpend: 200000, feeWaived: true, annualFeeCounted: 0 });
    expect(sbi.netYearly).toBe(10740);
  });

  it('keeps lines only for spends above 0, highest savings first', () => {
    for (const c of list) {
      expect(c.lines.length).toBeGreaterThan(0);
      for (const l of c.lines) expect(l.spend).toBeGreaterThan(0);
      for (let i = 1; i < c.lines.length; i++) {
        expect(c.lines[i - 1].savings).toBeGreaterThanOrEqual(c.lines[i].savings);
      }
    }
    const magnus = byAlias('magnus-burgundy-credit-card');
    expect(magnus.lines[0]).toMatchObject({ key: 'amazon_spends', label: 'Amazon', spend: 5000, savings: 270 });
    // Fuel has spend but no savings and no explanation: still a line, empty text.
    expect(magnus.lines.find((l) => l.key === 'fuel')).toMatchObject({ savings: 0, explanation: '' });
  });

  it('strips HTML and prefers the yearly explanation', () => {
    for (const c of list) for (const l of c.lines) expect(l.explanation).not.toContain('<');
    const amazon = byAlias('magnus-burgundy-credit-card').lines[0];
    expect(amazon.explanation).toMatch(/^On yearly spend of ₹60K/);
  });

  it('returns [] for bad shapes', () => {
    expect(mapCalculateResponse(null)).toEqual([]);
    expect(mapCalculateResponse('x')).toEqual([]);
    expect(mapCalculateResponse({})).toEqual([]);
    expect(mapCalculateResponse({ data: {} })).toEqual([]);
    expect(mapCalculateResponse({ data: { savings: {} } })).toEqual([]);
  });

  it('drops rows with no alias and survives odd rows', () => {
    const out = mapCalculateResponse({
      data: {
        savings: [
          null,
          { card_name: 'No alias' },
          {
            seo_card_alias: 'odd',
            total_savings_yearly: 'abc',
            annual_fees: null,
            invite_only: 1,
            spending_breakdown: { amazon_spends: null, new_x: { spend: '200', savings: 5, explanation: 'bad' } },
          },
        ],
      },
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ alias: 'odd', yearlySavings: 0, annualFee: 0, netYearly: 0, name: 'odd' });
    expect(out[0].lines).toEqual([
      { key: 'new_x', label: 'new_x', spend: 200, rawSpend: 200, savings: 5, rawSavings: 5, explanation: '' },
    ]);
    expect(out[0].id).toBeUndefined();
  });

  it('maps the BankKaro id as a string, from a number or a string', () => {
    expect(byAlias('magnus-burgundy-credit-card').id).toBe('173');
    const out = mapCalculateResponse({
      data: { savings: [{ seo_card_alias: 's', id: ' 42 ' }, { seo_card_alias: 'b', id: '' }] },
    });
    expect(out[0].id).toBe('42');
    expect(out[1].id).toBeUndefined();
  });

  it('flags lounge lines, also the railway one that is not an input, as outside the total', () => {
    const [c] = mapCalculateResponse({
      data: {
        savings: [
          {
            seo_card_alias: 'r',
            spending_breakdown: {
              railway_lounge_usage_quarterly: { spend: 1, savings: 100 },
              international_lounge_usage_quarterly: { spend: 1, savings: 100 },
              life_insurance: { spend: 1000, savings: 10 },
            },
          },
        ],
      },
    });
    const flagged = c.lines.filter((l) => l.outsideTotal).map((l) => l.key).sort();
    expect(flagged).toEqual(['international_lounge_usage_quarterly', 'railway_lounge_usage_quarterly']);
  });

  it('keeps the unrounded monthly savings on each line', () => {
    const magnus = byAlias('magnus-burgundy-credit-card');
    for (const l of magnus.lines) expect(Math.round(l.rawSavings!)).toBe(l.savings);
  });
});

describe('rankByNetValue', () => {
  it('sorts by netYearly, high to low', () => {
    const out = rankByNetValue([card('a', { netYearly: 10 }), card('b', { netYearly: 30 }), card('c', { netYearly: -5 })]);
    expect(out.map((c) => c.alias)).toEqual(['b', 'a', 'c']);
  });

  it('breaks a tie on higher yearlySavings', () => {
    const out = rankByNetValue([card('a', { netYearly: 10, yearlySavings: 20 }), card('b', { netYearly: 10, yearlySavings: 40 })]);
    expect(out.map((c) => c.alias)).toEqual(['b', 'a']);
  });

  it('then on lower annualFee', () => {
    const out = rankByNetValue([
      card('a', { netYearly: 10, yearlySavings: 20, annualFee: 500 }),
      card('b', { netYearly: 10, yearlySavings: 20, annualFee: 100 }),
    ]);
    expect(out.map((c) => c.alias)).toEqual(['b', 'a']);
  });

  it('then on alias A to Z', () => {
    const out = rankByNetValue([card('zeta', { netYearly: 1 }), card('alpha', { netYearly: 1 })]);
    expect(out.map((c) => c.alias)).toEqual(['alpha', 'zeta']);
  });

  it('does not mutate the input', () => {
    const input = [card('a', { netYearly: 1 }), card('b', { netYearly: 2 })];
    const copy = [...input];
    rankByNetValue(input);
    expect(input).toEqual(copy);
    expect(input[0].alias).toBe('a');
  });

  it('ranks the fixture by net value', () => {
    // bob and cred tie on net, yearly and fee, so the alias decides. sbi-cashback
    // has its fee waived at this spend (10,740), so it is above phonepe (9,931).
    const out = rankByNetValue(mapCalculateResponse(fixture));
    expect(out.map((c) => c.alias)).toEqual([
      'bob-cashback-credit-card',
      'cred-indusind-bank-credit-card',
      'sbi-cashback-credit-card',
      'phonepe-sbi-card-select-black',
      'magnus-burgundy-credit-card',
    ]);
  });
});

describe('toApiValue', () => {
  it('passes rupee keys through as whole numbers', () => {
    expect(toApiValue('amazon_spends', 5000)).toBe(5000);
    expect(toApiValue('amazon_spends', 99.6)).toBe(100);
  });

  it('sends lounge visits per quarter, rounded, at least 1 when above 0', () => {
    expect(toApiValue('domestic_lounge_usage_quarterly', 1)).toBe(1);
    expect(toApiValue('domestic_lounge_usage_quarterly', 2)).toBe(1);
    expect(toApiValue('domestic_lounge_usage_quarterly', 3)).toBe(1);
    expect(toApiValue('domestic_lounge_usage_quarterly', 4)).toBe(1);
    expect(toApiValue('international_lounge_usage_quarterly', 5)).toBe(1);
    expect(toApiValue('international_lounge_usage_quarterly', 6)).toBe(2);
    expect(toApiValue('domestic_lounge_usage_quarterly', 0)).toBe(0);
  });

  it('never returns a negative or a NaN', () => {
    expect(toApiValue('fuel', -100)).toBe(0);
    expect(toApiValue('fuel', NaN)).toBe(0);
  });
});

describe('buildSpends', () => {
  it('fills all 21 keys and runs each answer through toApiValue', () => {
    const out = buildSpends({ amazon_spends: 3000, domestic_lounge_usage_quarterly: 6 });
    expect(Object.keys(out)).toHaveLength(21);
    expect(out.amazon_spends).toBe(3000);
    expect(out.domestic_lounge_usage_quarterly).toBe(2);
    expect(out.fuel).toBe(0);
  });

  it('does not return or change EMPTY_SPENDS', () => {
    const out = buildSpends({});
    expect(out).toEqual(EMPTY_SPENDS);
    expect(out).not.toBe(EMPTY_SPENDS);
    out.fuel = 5;
    expect(EMPTY_SPENDS.fuel).toBe(0);
  });

  it('has a question for every key', () => {
    expect(SPEND_QUESTIONS.map((q) => q.key).sort()).toEqual(Object.keys(EMPTY_SPENDS).sort());
  });
});

describe('spendsFromBrands', () => {
  it('adds spends of brands that share a key', () => {
    const out = spendsFromBrands([
      { brandId: 'swiggy', monthly: 2000 },
      { brandId: 'zomato', monthly: 1500 },
      { brandId: 'amazon', monthly: 4000 },
    ]);
    expect(out.online_food_ordering).toBe(3500);
    expect(out.amazon_spends).toBe(4000);
    expect(out.flipkart_spends).toBe(0);
  });

  it('ignores unknown ids and amounts of 0 or less', () => {
    const out = spendsFromBrands([
      { brandId: 'unknown', monthly: 9999 },
      { brandId: 'myntra', monthly: 0 },
      { brandId: 'ajio', monthly: -10 },
    ]);
    expect(out).toEqual(EMPTY_SPENDS);
  });
});

describe('ROTATING_BRANDS', () => {
  it('names only brands in TOOL_BRANDS, so Home can turn each name into a brandId', () => {
    const names = new Set(TOOL_BRANDS.map((b) => b.name));
    for (const name of ROTATING_BRANDS) expect(names.has(name)).toBe(true);
  });
});

describe('hasAnySpend', () => {
  it('is false for an empty body and true when one key is above 0', () => {
    expect(hasAnySpend(EMPTY_SPENDS)).toBe(false);
    expect(hasAnySpend({ ...EMPTY_SPENDS, water_bills: 1 })).toBe(true);
  });
});

describe('spendsKey', () => {
  it('gives the same key for the same profile whatever the property order', () => {
    const a = { ...EMPTY_SPENDS, amazon_spends: 100, fuel: 200 };
    const reversed = Object.fromEntries(Object.entries(a).reverse()) as typeof a;
    expect(spendsKey(reversed)).toBe(spendsKey(a));
  });

  it('gives different keys for different profiles', () => {
    expect(spendsKey({ ...EMPTY_SPENDS, fuel: 1 })).not.toBe(spendsKey({ ...EMPTY_SPENDS, rent: 1 }));
  });
});

describe('beatMyCard', () => {
  const line = (key: string, savings: number) => ({ key, label: key, spend: 1000, savings, explanation: '' });

  it('says the best card wins and gives yearly rows, largest gap first', () => {
    const ranked = [
      card('best', { netYearly: 5000, lines: [line('amazon_spends', 300), line('fuel', 10)] }),
      card('mine', { netYearly: 2000, lines: [line('amazon_spends', 100), line('flights_annual', 50)] }),
    ];
    const r = beatMyCard(ranked, 'mine')!;
    expect(r.best.alias).toBe('best');
    expect(r.mine.alias).toBe('mine');
    expect(r.gapYearly).toBe(3000);
    expect(r.verdict).toBe('best_wins');
    // Contract v2 added spendYearly, mineLine and bestLine to each row; they are checked in
    // cardTools.league.test.ts. Here only the original four fields are compared.
    expect(r.rows.map(({ key, label, mine, best }) => ({ key, label, mine, best }))).toEqual([
      { key: 'amazon_spends', label: 'amazon_spends', mine: 1200, best: 3600 },
      { key: 'flights_annual', label: 'flights_annual', mine: 600, best: 0 },
      { key: 'fuel', label: 'fuel', mine: 0, best: 120 },
    ]);
  });

  it('says mine wins when my card ranks first', () => {
    const ranked = [card('mine', { netYearly: 4000 }), card('other', { netYearly: 1000 })];
    const r = beatMyCard(ranked, 'mine')!;
    expect(r.best.alias).toBe('other');
    expect(r.gapYearly).toBe(-3000);
    expect(r.verdict).toBe('mine_wins');
  });

  it('says equal when the gap is under 1 rupee', () => {
    const ranked = [card('a', { netYearly: 1000 }), card('mine', { netYearly: 1000 })];
    expect(beatMyCard(ranked, 'mine')!.verdict).toBe('equal');
  });

  it('returns null when my card is missing', () => {
    expect(beatMyCard([card('a'), card('b')], 'mine')).toBeNull();
  });

  it('returns null for a list with only my card', () => {
    expect(beatMyCard([card('mine')], 'mine')).toBeNull();
  });

  it('builds rows from unrounded monthly savings, so rows agree with the total', () => {
    // Three lines at 107.50 a month: rounding first gives 3 x 108 x 12 = 3,888,
    // the yearly total is round(322.5 x 12) = 3,870.
    const breakdown = (v: number) => ({ spend: 1000, savings: v });
    const [mine] = mapCalculateResponse({
      data: {
        savings: [
          {
            seo_card_alias: 'mine',
            total_savings: 322.5,
            total_savings_yearly: 3870,
            spending_breakdown: {
              amazon_spends: breakdown(107.5),
              flipkart_spends: breakdown(107.5),
              fuel: breakdown(107.5),
            },
          },
        ],
      },
    });
    expect(mine.lines.map((l) => l.savings)).toEqual([108, 108, 108]);
    const r = beatMyCard([card('other', { netYearly: 99999 }), mine], 'mine')!;
    expect(r.rows.map((row) => row.mine)).toEqual([1290, 1290, 1290]);
    expect(r.rows.reduce((t, row) => t + row.mine, 0)).toBe(3870);
    expect(mine.yearlySavings).toBe(3870);
  });
});

describe('stripHtml', () => {
  it('removes tags without gluing words', () => {
    expect(stripHtml('<div>You get <b>180 RP</b>.</div>')).toBe('You get 180 RP.');
    expect(stripHtml('<b>a</b>b')).toBe('a b');
  });

  it('decodes entities and keeps the rupee sign', () => {
    expect(stripHtml('Fuel &amp; bills')).toBe('Fuel & bills');
    expect(stripHtml('On&nbsp;₹3K')).toBe('On ₹3K');
    expect(stripHtml('&#8377;500')).toBe('₹500');
    expect(stripHtml('&amp;nbsp;')).toBe('&nbsp;');
  });

  it('collapses spaces and handles empty input', () => {
    expect(stripHtml('  a \n\n  b  ')).toBe('a b');
    expect(stripHtml('')).toBe('');
  });
});

describe('lines and the savings totals (live UAT 2026-11-18)', () => {
  // Numbers from one card of the live call: amazon 5000, insurance_health_annual
  // 24000, life_insurance 36000, flights_annual 60000 (yearly inputs come back
  // as monthly spend), 2 domestic lounge visits a quarter.
  const bl = (spend: number, savings: number) => ({
    spend,
    savings,
    explanation: [{ key: 'annual', explanation: '<div>x</div>' }],
  });
  const raw = (alias: string) => ({
    data: {
      savings: [
        {
          seo_card_alias: alias,
          total_savings: 112.5,
          total_savings_yearly: 1350,
          total_extra_benefits: 0,
          annual_fees: '0',
          spending_breakdown: {
            amazon_spends: bl(5000, 25),
            insurance_health_annual: bl(2000, 10),
            life_insurance: bl(3000, 15),
            flights_annual: bl(5000, 62.5),
            domestic_lounge_usage_quarterly: bl(2, 500),
          },
        },
      ],
    },
  });
  const [mine] = mapCalculateResponse(raw('mine'));

  it('flags the lounge line as outside the total, and only that line', () => {
    const lounge = mine.lines.find((l) => l.key === 'domestic_lounge_usage_quarterly')!;
    expect(lounge.outsideTotal).toBe(true);
    expect(mine.lines.filter((l) => l.outsideTotal)).toHaveLength(1);
  });

  it('yearly rows of the in-total lines add up to yearlySavings, within rounding', () => {
    const other = card('other', { netYearly: 99999 });
    const r = beatMyCard(rankByNetValue([mine, other]), 'mine')!;
    const inTotal = mine.lines.filter((l) => !l.outsideTotal);
    const sum = r.rows.reduce((t, row) => t + row.mine, 0);
    expect(mine.yearlySavings).toBe(1350);
    // Each line is rounded to whole rupees a month: at most 6 rupees a year off per line.
    expect(Math.abs(sum - mine.yearlySavings)).toBeLessThanOrEqual(6 * inTotal.length);
  });

  it('keeps the lounge line out of beat rows', () => {
    const r = beatMyCard([card('other', { netYearly: 99999 }), mine], 'mine')!;
    expect(r.rows.map((row) => row.key)).not.toContain('domestic_lounge_usage_quarterly');
    expect(r.rows).toHaveLength(4);
  });
});

describe('Home tile words open the tool with that word picked', () => {
  it('every word the category tile rotates through maps to its own category', () => {
    for (const c of TOOL_CATEGORIES) expect(categoryIdForWord(c.label)).toBe(c.id);
  });

  it('every word the brands tile rotates through maps to a brand', () => {
    for (const name of ROTATING_BRANDS) {
      const id = brandIdForWord(name);
      expect(id).toBeDefined();
      expect(TOOL_BRANDS.find((b) => b.id === id)!.name).toBe(name);
    }
    expect(brandIdForWord('MYNTRA')).toBe('myntra');
  });

  it('an unknown or missing word picks nothing', () => {
    expect(categoryIdForWord('Nope')).toBeUndefined();
    expect(categoryIdForWord(undefined)).toBeUndefined();
    expect(brandIdForWord('Nope')).toBeUndefined();
    expect(brandIdForWord(undefined)).toBeUndefined();
  });
});

describe('net yearly with the fee waiver and the lounge value (D26)', () => {
  const rows = [...fixture.data.savings, ...waiverFixture.data.savings];
  const mapped = [...mapCalculateResponse(fixture), ...mapCalculateResponse(waiverFixture)];

  it('maps all 11 UAT rows', () => {
    expect(rows).toHaveLength(11);
    expect(mapped).toHaveLength(11);
  });

  // Ties our explicit sum to BankKaro's undocumented roi on real data.
  it.each(rows.map((r: any) => [r.seo_card_alias, r.roi]))(
    '%s: netYearly equals round(roi) within 2 rupees',
    (alias, roi) => {
      const c = mapped.find((m) => m.alias === alias)!;
      expect(Math.abs(c.netYearly - Math.round(Number(roi)))).toBeLessThanOrEqual(2);
    },
  );

  it.each([
    // alias, feeWaived, loungeValue, annualFee, annualFeeCounted, feeWaiverSpend
    ['hsbc-live-plus-credit-card', true, 0, 1179, 0, 200000],
    ['idfc-first-hello-cashback-credit-card', true, 0, 1180, 0, 200000],
    ['american-express-mr-credit-card', true, 0, 5310, 0, 150000],
    ['paytm-hdfc-bank-select-credit-card', true, 6000, 1180, 0, 150000],
    ['canara-rupay-select-credit-card', false, 6000, 354, 354, 0],
    ['reliance-sbi-card-prime', false, 6000, 3539, 3539, 300000],
  ])('%s: waived %s, lounge %d, fee %d, counted %d', (alias, waived, lounge, fee, counted, waiverSpend) => {
    const c = mapCalculateResponse(waiverFixture).find((m) => m.alias === alias)!;
    expect(c).toMatchObject({
      feeWaived: waived,
      loungeValue: lounge,
      annualFee: fee,
      annualFeeCounted: counted,
      feeWaiverSpend: waiverSpend,
    });
  });

  it('reliance-sbi-card-prime: extra benefits and lounge value are both counted', () => {
    const c = mapCalculateResponse(waiverFixture).find((m) => m.alias === 'reliance-sbi-card-prime')!;
    expect(c.extraBenefits).toBe(3750);
    expect(c.netYearly).toBe(1350 + 3750 + 6000 - 3539);
  });

  describe('edge cases on hand-built rows', () => {
    const one = (extra: Record<string, unknown>) =>
      mapCalculateResponse({
        data: {
          savings: [{ seo_card_alias: 'x', total_savings_yearly: 5000, annual_fees: '1000', total_spends: 10000, ...extra }],
        },
      })[0];

    it('no waiver when annual_fee_spends is empty, "0" or not a number', () => {
      for (const v of ['', '0', 'abc', null, undefined]) {
        const c = one({ annual_fee_spends: v });
        expect(c).toMatchObject({ feeWaiverSpend: 0, feeWaived: false, annualFeeCounted: 1000, netYearly: 4000 });
      }
    });

    it('no waiver when total_spends is missing', () => {
      const c = one({ annual_fee_spends: '50000', total_spends: undefined });
      expect(c).toMatchObject({ feeWaiverSpend: 50000, feeWaived: false, annualFeeCounted: 1000, netYearly: 4000 });
    });

    it('waived when the yearly spend is exactly the waiver spend', () => {
      const c = one({ annual_fee_spends: '120000' });
      expect(c).toMatchObject({ feeWaived: true, annualFee: 1000, annualFeeCounted: 0, netYearly: 5000 });
    });

    it('not waived one rupee a year below the waiver spend', () => {
      expect(one({ annual_fee_spends: '120001' }).feeWaived).toBe(false);
    });

    it('lounge value is 0 when travel_benefits is null or missing, and reads a string number', () => {
      expect(one({ travel_benefits: null }).loungeValue).toBe(0);
      expect(one({}).loungeValue).toBe(0);
      expect(one({ travel_benefits: {} }).loungeValue).toBe(0);
      const c = one({ travel_benefits: { total_travel_benefit_annual: '2499.6' } });
      expect(c.loungeValue).toBe(2500);
      expect(c.netYearly).toBe(5000 + 2500 - 1000);
    });
  });

  it('beatMyCard: a waived card against one not waived follows the new sum', () => {
    // Both save 10,000 a year with a 3,000 fee. Only "best" reaches its waiver.
    const raw = (alias: string, waiver: string) => ({
      seo_card_alias: alias,
      total_savings_yearly: 10000,
      annual_fees: '3000',
      annual_fee_spends: waiver,
      total_spends: 20000,
    });
    const list = rankByNetValue(
      mapCalculateResponse({ data: { savings: [raw('mine', '300000'), raw('best', '240000')] } }),
    );
    expect(list.map((c) => c.alias)).toEqual(['best', 'mine']);
    const r = beatMyCard(list, 'mine')!;
    expect(r.best.netYearly).toBe(10000);
    expect(r.mine.netYearly).toBe(7000);
    expect(r.gapYearly).toBe(3000);
    expect(r.verdict).toBe('best_wins');
    // Under the old sum both were 7,000: the verdict would have been 'equal'.
  });
});
