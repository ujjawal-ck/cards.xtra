import {
  bestApplicable,
  beatTableRows,
  filterPickRows,
  heroKind,
  heroTitle,
  lineDetail,
  lineRate,
  pickBanks,
  rowFooter,
  rowWinner,
  waivedNote,
  winLine,
} from '../beatView';
import type { CardSavings, CardSavingsLine } from '../cardTools';

function sv(over: Partial<CardSavings>): CardSavings {
  return {
    alias: 'a',
    name: 'Card A',
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
    ...over,
  };
}
const line = (over: Partial<CardSavingsLine>): CardSavingsLine => ({
  key: 'fuel',
  label: 'Fuel',
  spend: 1000,
  savings: 10,
  explanation: 'Why.',
  ...over,
});

describe('beatView', () => {
  const list = [
    { savings: sv({ alias: 'a', name: 'Alpha Card', bankName: 'Bank One' }) },
    { savings: sv({ alias: 'b', name: 'Beta Card', bankName: 'Bank Two' }), card: { name: 'Beta Plus' } },
    { savings: sv({ alias: 'c', name: 'Gamma Card', bankName: 'Bank One' }) },
    { savings: sv({ alias: 'd', name: 'Delta Card' }) },
  ];

  it('lists banks, most cards first', () => {
    expect(pickBanks(list)).toEqual([
      { bank: 'Bank One', count: 2 },
      { bank: 'Bank Two', count: 1 },
    ]);
  });

  it('filters by bank and query', () => {
    expect(filterPickRows(list, null, '')).toHaveLength(4);
    expect(filterPickRows(list, 'Bank One', '')).toHaveLength(2);
    expect(filterPickRows(list, null, '  ALPHA ')).toHaveLength(1);
    expect(filterPickRows(list, null, 'beta plus')).toHaveLength(1);
    expect(filterPickRows(list, 'Bank Two', 'gamma')).toHaveLength(0);
    expect(filterPickRows(list, null, 'bank two')).toHaveLength(1);
  });

  it('names the hero and the win line', () => {
    expect(heroKind('best_wins')).toBe('other_wins');
    expect(heroKind('mine_wins')).toBe('mine_wins');
    expect(heroKind('equal')).toBe('tie');
    expect(heroTitle('other_wins')).toBe('A better card wins');
    expect(heroTitle('mine_wins')).toBe('Your card wins');
    expect(heroTitle('tie')).toBe('It is a tie');
    expect(winLine(1500, 'Beta')).toBe('Beta wins by ₹1,500 a year');
    expect(winLine(-200, 'Beta')).toBe('Your card wins by ₹200 a year');
    expect(winLine(0, 'Beta')).toBeNull();
  });

  it('finds the winner of a row', () => {
    expect(rowWinner({ mine: 1, best: 5 })).toBe('other');
    expect(rowWinner({ mine: 5, best: 1 })).toBe('mine');
    expect(rowWinner({ mine: 5, best: 5 })).toBe('tie');
    expect(rowFooter({ mine: 5, best: 5 }, 'Beta')).toBeNull();
    expect(rowFooter({ mine: 100, best: 1100 }, 'Beta')).toBe('Beta wins by ₹1,000');
    expect(rowFooter({ mine: 1100, best: 100 }, 'Beta')).toBe('Your card wins by ₹1,000');
  });

  it('builds table rows that add up to the net', () => {
    const mine = sv({ yearlySavings: 1000, extraBenefits: 200, annualFee: 500, annualFeeCounted: 500, netYearly: 700 });
    const other = sv({
      yearlySavings: 2000,
      loungeValue: 300,
      annualFee: 1000,
      annualFeeCounted: 0,
      feeWaived: true,
      netYearly: 2300,
    });
    const rows = beatTableRows(mine, other);
    expect(rows.map((r) => r.label)).toEqual([
      'Spend savings',
      'Milestone benefits',
      'Lounge benefits',
      'Annual fee',
    ]);
    expect(rows.reduce((s, r) => s + r.a, 0)).toBe(mine.netYearly);
    expect(rows.reduce((s, r) => s + r.b, 0)).toBe(other.netYearly);
    expect(waivedNote(mine, other, 'Beta')).toBe('Waived at your spend: Beta.');
    expect(waivedNote(mine, mine, 'Beta')).toBeNull();
  });

  it('leaves out lounge and fee rows when both are zero', () => {
    expect(beatTableRows(sv({}), sv({})).map((r) => r.label)).toEqual(['Spend savings', 'Milestone benefits']);
  });

  it('shows a rate only when the API sent one', () => {
    expect(lineRate(undefined)).toBeUndefined();
    expect(lineRate(line({}))).toBeUndefined();
    const pct = list.length; // any value: the text must repeat what the API sent
    expect(lineRate(line({ cashbackPct: pct }))).toBe(`${pct}% back`);
    expect(lineRate(line({ pointsEarned: 100, pointValue: 0.5 }))).toBe('1,200 points a year, ₹0.50 each');
    expect(lineRate(line({ pointsEarned: 100 }))).toBe('1,200 points a year');
  });

  it('writes the detail text of a card', () => {
    expect(lineDetail('Your card', undefined, 0)).toBe('Your card: no savings on this spend.');
    const pct = list.length;
    expect(lineDetail('Beta', line({ cashbackPct: pct }), 1200)).toBe(`Beta: saves ₹1,200 a year, ${pct}% back. Why.`);
  });

  it('finds the best card the user can apply for', () => {
    const rows = [
      { savings: sv({ alias: 'x', netYearly: 900 }) },
      { savings: sv({ alias: 'me', netYearly: 500 }), card: {} },
      { savings: sv({ alias: 'y', netYearly: 800 }), card: {} },
      { savings: sv({ alias: 'z', netYearly: 400 }), card: {} },
    ];
    expect(bestApplicable(rows, 'me', 500)?.savings.alias).toBe('y');
    expect(bestApplicable(rows, 'me', 800)).toBeUndefined();
  });
});
