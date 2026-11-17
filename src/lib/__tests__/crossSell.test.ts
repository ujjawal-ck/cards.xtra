/**
 * Cross-sell engine tests: small hand-made catalogues, one rule per test.
 * Fees are GST-inclusive (as the tile shows); bands use fee / 1.18. Rewards are ₹.
 */
import { getCrossSellV2, CONFIG, band } from '../crossSell';
import type { CrossSellCard, CrossSellPick, CrossSellResult } from '../crossSell';

const FUEL_SHOP = ['Fuel', 'Shopping'];
const TRAVEL = ['Travel', 'Lounge'];

let seq = 0;
function mk(over: Partial<CrossSellCard> & { alias: string }): CrossSellCard {
  seq += 1;
  return {
    id: String(seq),
    name: `${over.alias} Credit Card`,
    bank: `bank-${over.alias}`,
    rewardType: 'rewards',
    tags: FUEL_SHOP,
    joiningFee: 500,
    annualFee: 500,
    inviteOnly: false,
    reward: 1000,
    earn: 1500,
    incomeLpa: 0,
    crif: 0,
    priority: 100,
    ...over,
  };
}

// Source: entry band (₹1,000), ₹500 reward, needs ₹6L income.
const src = mk({ alias: 'src', bank: 'A', joiningFee: 1000, annualFee: 1000, reward: 500, earn: 800, incomeLpa: 6 });
const cheapLtf = mk({ alias: 'cheap-ltf', bank: 'B', joiningFee: 0, annualFee: 0, reward: 400, earn: 600, incomeLpa: 3 });
const cheapFee = mk({ alias: 'cheap-fee', bank: 'C', joiningFee: 250, annualFee: 250, reward: 450, earn: 700 });
const rich = mk({ alias: 'rich', bank: 'D', tags: ['Fuel', 'Dining'], joiningFee: 1000, annualFee: 1000, reward: 1500, earn: 2000, incomeLpa: 8 });
const losing = mk({ alias: 'losing', bank: 'E', reward: 900, earn: 300 }); // earn < reward
const unknownEarn = mk({ alias: 'unknown-earn', bank: 'F', reward: 700, earn: 0, incomeLpa: 4 });
const noReward = mk({ alias: 'no-reward', bank: 'G', reward: 0, earn: 500 });
const pricey = mk({ alias: 'pricey', bank: 'H', joiningFee: 2500, annualFee: 2500, reward: 3000, earn: 4000 }); // mid band, costs more
const sameBankAsLtf = mk({ alias: 'same-bank', bank: 'B', joiningFee: 100, annualFee: 100, reward: 350, earn: 500 });
const fillers = [
  mk({ alias: 'f1', bank: 'I', tags: TRAVEL }),
  mk({ alias: 'f2', bank: 'J', tags: TRAVEL }),
  mk({ alias: 'f3', bank: 'K', tags: ['Travel', 'Dining'] }),
];
const catalogue = [src, cheapLtf, cheapFee, rich, losing, unknownEarn, noReward, pricey, sameBankAsLtf, ...fillers];

const picksOf = (r: CrossSellResult): CrossSellPick[] => r.lenses.flatMap((l) => l.picks);
const idsOf = (r: CrossSellResult) => picksOf(r).map((p) => p.card.alias);
const lensPicks = (r: CrossSellResult, key: string) => r.lenses.find((l) => l.key === key)?.picks ?? [];
const costOf = (c: CrossSellCard) => Math.max(c.joiningFee, c.annualFee);

describe('crossSell engine', () => {
  it('shows a rail for the base catalogue', () => {
    const r = getCrossSellV2(src, catalogue);
    expect(r.show).toBe(true);
    expect(r.state).toBe('unknown');
    expect(r.askEligibility).toBe(true);
    expect(r.lenses[0].key).toBe('top');
    expect(r.lenses[0].picks.length).toBeLessThanOrEqual(CONFIG.maxPicks);
  });

  it('(1) never picks a card with earn < reward, but does pick earn 0 with reward > 0', () => {
    const r = getCrossSellV2(src, catalogue);
    const ids = idsOf(r);
    expect(ids).not.toContain('losing');
    expect(ids).not.toContain('no-reward');
    expect(ids).toContain('unknown-earn');
  });

  it('(2) "More rewards" never costs more than the tapped card (within feeTolerance)', () => {
    const picks = lensPicks(getCrossSellV2(src, catalogue), 'moreRewards');
    expect(picks.length).toBeGreaterThanOrEqual(2);
    picks.forEach((p) => {
      expect(costOf(p.card)).toBeLessThanOrEqual(costOf(src) * CONFIG.feeTolerance);
      expect(p.card.reward).toBeGreaterThanOrEqual(src.reward + CONFIG.minRewardGain);
    });
    expect(picks.map((p) => p.card.alias)).not.toContain('pricey');
  });

  it('(3) never picks viewed or applied aliases', () => {
    const r = getCrossSellV2(src, catalogue, { viewed: ['rich', 'cheap-fee'], applied: new Set(['cheap-ltf']) });
    const ids = idsOf(r);
    ['rich', 'cheap-fee', 'cheap-ltf'].forEach((a) => expect(ids).not.toContain(a));
  });

  it('(4) with an eligible set, every pick is in it', () => {
    const eligible = new Set(['src', 'cheap-ltf', 'unknown-earn', 'rich']);
    const r = getCrossSellV2(src, catalogue, { eligible });
    expect(r.state).toBe('eligible');
    expect(r.askEligibility).toBe(false);
    expect(picksOf(r).length).toBeGreaterThan(0);
    picksOf(r).forEach((p) => expect(eligible.has(p.card.alias)).toBe(true));
  });

  it('(4) tapped card outside the eligible set: ineligible, top picks all from the eligible lens', () => {
    const eligible = new Set(['cheap-ltf', 'cheap-fee', 'unknown-earn']);
    const r = getCrossSellV2(src, catalogue, { eligible });
    expect(r.state).toBe('ineligible');
    expect(r.headline).toBe('You may not get src');
    expect(r.show).toBe(true);
    const top = r.lenses[0];
    expect(top.key).toBe('top');
    expect(top.picks.length).toBeGreaterThanOrEqual(2);
    top.picks.forEach((p) => {
      expect(p.lens).toBe('eligible');
      expect(eligible.has(p.card.alias)).toBe(true);
    });
    // The helper lens itself is not offered as a chip.
    expect(r.lenses.map((l) => l.key)).not.toContain('eligible');
  });

  it('(5) one card per bank in a view', () => {
    const s = mk({ alias: 's', bank: 'A', reward: 500, earn: 800 });
    const sameBank = ['b1', 'b2', 'b3'].map((a, i) => mk({ alias: a, bank: 'B', reward: 700, earn: 900, priority: i + 1 }));
    const other = mk({ alias: 'c1', bank: 'C', reward: 700, earn: 900, priority: 10 });
    const others = [mk({ alias: 'o1', tags: TRAVEL }), mk({ alias: 'o2', tags: TRAVEL }), mk({ alias: 'o3', tags: TRAVEL })];
    const r = getCrossSellV2(s, [s, ...sameBank, other, ...others]);
    expect(r.show).toBe(true);
    r.lenses.forEach((l) => {
      const banks = l.picks.map((p) => p.card.bank);
      expect(new Set(banks).size).toBe(banks.length);
    });
    // Four candidates, two banks: a view holds one B card and the C card.
    expect(lensPicks(r, 'similar').map((p) => p.card.alias).sort()).toEqual(['b1', 'c1']);
    expect(r.lenses[0].picks.map((p) => p.card.bank).sort()).toEqual(['B', 'C']);
  });

  it('(6) a card already shown ranks after a fresh card of equal standing', () => {
    const s = mk({ alias: 's', bank: 'A', reward: 500, earn: 800 });
    const x = mk({ alias: 'x', bank: 'X', reward: 600, earn: 900, priority: 1 }); // wins the tie-break
    const y = mk({ alias: 'y', bank: 'Y', reward: 600, earn: 900, priority: 2 });
    const z = mk({ alias: 'z', bank: 'Z', reward: 600, earn: 900, priority: 3 });
    const others = [mk({ alias: 'o1', tags: TRAVEL }), mk({ alias: 'o2', tags: TRAVEL }), mk({ alias: 'o3', tags: TRAVEL })];
    const cat = [s, x, y, z, ...others];
    const fresh = lensPicks(getCrossSellV2(s, cat), 'similar').map((p) => p.card.alias);
    expect(fresh[0]).toBe('x');
    const seen = lensPicks(getCrossSellV2(s, cat, { shown: { x: 1 } }), 'similar').map((p) => p.card.alias);
    expect(seen[0]).toBe('y');
    expect(seen.indexOf('x')).toBeGreaterThan(seen.indexOf('y'));
    expect(lensPicks(getCrossSellV2(s, cat, { shown: { x: 1 } }), 'similar').find((p) => p.card.alias === 'x')?.seenBefore).toBe(true);
  });

  it('(7) delta strings', () => {
    const r = getCrossSellV2(src, catalogue);
    const delta = (lens: string, alias: string) =>
      lensPicks(r, lens).find((p) => p.card.alias === alias)?.delta;
    // Lower fee: lifetime free card, and a plain fee saving (as given, no GST maths).
    expect(delta('lowerFee', 'cheap-ltf')).toBe('Lifetime free, ₹1,000 less a year');
    expect(delta('lowerFee', 'cheap-fee')).toBe('₹750 lower annual fee');
    // More rewards: Indian grouping, fee note.
    expect(delta('moreRewards', 'rich')).toBe('₹1,000 more Rewards, same fee');
    expect(delta('moreRewards', 'unknown-earn')).toBe('₹200 more Rewards, lower fee');
    // Easier to get: income bar of the pick vs the tapped card.
    expect(delta('easier', 'cheap-ltf')).toBe('Needs ₹3L income a year, not ₹6L');
    expect(delta('easier', 'unknown-earn')).toBe('Needs ₹4L income a year, not ₹6L');
  });

  it('(7) lower fee with a joining-fee only saving', () => {
    const s = mk({ alias: 's', bank: 'A', joiningFee: 2000, annualFee: 0, reward: 500, earn: 800 });
    const a = mk({ alias: 'a', bank: 'B', joiningFee: 500, annualFee: 0, reward: 500, earn: 800 });
    const b = mk({ alias: 'b', bank: 'C', joiningFee: 900, annualFee: 0, reward: 500, earn: 800 });
    const others = [mk({ alias: 'o1', tags: TRAVEL }), mk({ alias: 'o2', tags: TRAVEL }), mk({ alias: 'o3', tags: TRAVEL })];
    const r = getCrossSellV2(s, [s, a, b, ...others]);
    const p = lensPicks(r, 'lowerFee').find((x) => x.card.alias === 'a');
    expect(p?.delta).toBe('₹1,500 lower joining fee');
  });

  it('(8) show is false with fewer than 2 picks', () => {
    const cat = [src, cheapLtf, ...fillers];
    const r = getCrossSellV2(src, cat);
    expect(r.lenses[0].picks.length).toBeLessThan(2);
    expect(r.show).toBe(false);
    // Also when eligibility leaves a single candidate.
    const r2 = getCrossSellV2(src, catalogue, { eligible: new Set(['src', 'cheap-ltf']) });
    expect(r2.show).toBe(false);
  });

  it('(9) a cashback card prefers a cashback pick in Similar', () => {
    const s = mk({ alias: 's', bank: 'A', rewardType: 'cashback', reward: 500, earn: 800 });
    const rewardsFirst = mk({ alias: 'rw', bank: 'B', rewardType: 'rewards', reward: 600, earn: 900, priority: 1 });
    const cashback = mk({ alias: 'cb', bank: 'C', rewardType: 'cashback', reward: 600, earn: 900, priority: 50 });
    const cashback2 = mk({ alias: 'cb2', bank: 'D', rewardType: 'cashback', reward: 600, earn: 900, priority: 60 });
    const others = [mk({ alias: 'o1', tags: TRAVEL }), mk({ alias: 'o2', tags: TRAVEL }), mk({ alias: 'o3', tags: TRAVEL })];
    const r = getCrossSellV2(s, [s, rewardsFirst, cashback, cashback2, ...others]);
    const picks = lensPicks(r, 'similar');
    expect(picks[0].card.rewardType).toBe('cashback');
    expect(picks[0].delta).toBe('Cashback card for Fuel');
    expect(picks.map((p) => p.card.alias).indexOf('rw')).toBeGreaterThan(0);
  });

  it('skips invite-only cards and the tapped card itself', () => {
    const inv = mk({ alias: 'invite', bank: 'Z', inviteOnly: true });
    const ids = idsOf(getCrossSellV2(src, [...catalogue, inv]));
    expect(ids).not.toContain('invite');
    expect(ids).not.toContain('src');
  });

  it('builds a profile from viewed cards (sub-line and count)', () => {
    const r = getCrossSellV2(src, catalogue, { viewed: ['rich'] });
    expect(r.profileCards).toBe(2);
    expect(r.sub).toBe('Picked from the 2 cards you viewed');
    expect(getCrossSellV2(src, catalogue).sub).toBe('Compare it with these');
  });

  it('fee bands use the base fee (fee / 1.18)', () => {
    expect(band(mk({ alias: 'b1', joiningFee: 1180, annualFee: 0 }))).toBe('entry'); // 1,000 base
    expect(band(mk({ alias: 'b2', joiningFee: 1181, annualFee: 0 }))).toBe('mid');
    expect(band(mk({ alias: 'b3', joiningFee: 0, annualFee: 3540 }))).toBe('mid'); // 3,000 base
    expect(band(mk({ alias: 'b4', joiningFee: 0, annualFee: 7080 }))).toBe('premium'); // 6,000 base
    expect(band(mk({ alias: 'b5', joiningFee: 0, annualFee: 7081 }))).toBe('super');
    expect(band(mk({ alias: 'b6', joiningFee: 0, annualFee: 0 }))).toBe('ltf');
  });

  it('"Easier to get" never suggests a costlier fee band', () => {
    const s = mk({ alias: 's', bank: 'A', joiningFee: 1000, annualFee: 1000, reward: 500, earn: 800, incomeLpa: 6 });
    const same = mk({ alias: 'same', bank: 'B', joiningFee: 900, annualFee: 900, incomeLpa: 4 });
    const lower = mk({ alias: 'lower', bank: 'C', joiningFee: 0, annualFee: 0, incomeLpa: 3 });
    const higher = mk({ alias: 'higher', bank: 'D', joiningFee: 3000, annualFee: 3000, incomeLpa: 5 }); // lower income, mid band
    const others = [mk({ alias: 'o1', tags: TRAVEL }), mk({ alias: 'o2', tags: TRAVEL }), mk({ alias: 'o3', tags: TRAVEL })];
    const r = getCrossSellV2(s, [s, same, lower, higher, ...others]);
    const ids = lensPicks(r, 'easier').map((p) => p.card.alias);
    expect(ids).toEqual(expect.arrayContaining(['same', 'lower']));
    expect(ids).not.toContain('higher');
  });
});
