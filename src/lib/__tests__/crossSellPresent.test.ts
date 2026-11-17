/** Band parts, icon and stats for one pick (GST-inclusive amounts). */
import { getCrossSellV2 } from '../crossSell';
import type { CrossSellCard, CrossSellPick } from '../crossSell';
import { presentPick, bandIcon, shortCardName } from '../crossSellPresent';

let n = 0;
const mk = (o: Partial<CrossSellCard>): CrossSellCard => {
  n += 1;
  return {
    id: String(n), alias: `a${n}`, name: `Card ${n}`, bank: `b${n}`, rewardType: 'rewards',
    tags: ['Fuel', 'Shopping'], joiningFee: 1180, annualFee: 1180, inviteOnly: false,
    reward: 500, earn: 800, incomeLpa: 0, crif: 0, priority: 1, ...o,
  };
};
const src = mk({ annualFee: 2950, joiningFee: 2950 });
const pick = (c: CrossSellCard, lens: string, delta = 'delta'): CrossSellPick => ({
  card: c, lens, label: lens, tone: 'info', delta, sim: 1, band: 'entry', eligible: false,
  seenBefore: false, earn: 0, paid: 0, net: 0,
});
const rw = { cashbackValue: '₹700', rewardPrefix: 'Flat' as const };

describe('presentPick', () => {
  it('lower fee: amount + caption, stat is down / good', () => {
    const v = presentPick(src, pick(mk({ annualFee: 1180 }), 'lowerFee'), rw);
    expect(v.bandAmount).toBe('₹1,770');
    expect(v.bandText).toBe('less a year');
    expect(v.icon).toBe('feat-savings-outline');
    expect(v.stats[0]).toEqual({ label: 'Annual fee', value: '₹1,180', delta: '₹1,770 less', direction: 'down', sentiment: 'good' });
  });

  it('higher fee is up / neutral, never bad; equal fee is Same', () => {
    const up = presentPick(mk({ annualFee: 1180 }), pick(mk({ annualFee: 2950 }), 'similar'), rw);
    expect(up.stats[0]).toMatchObject({ delta: '₹1,770 more', direction: 'up', sentiment: 'neutral' });
    const same = presentPick(mk({ annualFee: 1180 }), pick(mk({ annualFee: 1180 }), 'similar'), rw);
    expect(same.stats[0]).toMatchObject({ delta: 'Same', direction: 'same', sentiment: 'neutral' });
  });

  it('fee differences under ₹10 (GST rounding) are Same, ₹10 is shown', () => {
    const base = mk({ annualFee: 1179 });
    const d = (fee: number) => presentPick(base, pick(mk({ annualFee: fee }), 'similar'), rw).stats[0];
    expect(d(1180)).toMatchObject({ value: '₹1,180', delta: 'Same', direction: 'same', sentiment: 'neutral' });
    expect(d(1188)).toMatchObject({ delta: 'Same', direction: 'same', sentiment: 'neutral' });
    expect(d(1189)).toMatchObject({ delta: '₹10 more', direction: 'up', sentiment: 'neutral' });
    expect(d(1169)).toMatchObject({ delta: '₹10 less', direction: 'down', sentiment: 'good' });
    expect(d(1170)).toMatchObject({ delta: 'Same', direction: 'same' });
  });

  it('joining-fee fallback and Rewards use the same ₹10 threshold', () => {
    const s = mk({ annualFee: 0, joiningFee: 500, reward: 500 });
    const j = (fee: number) => presentPick(s, pick(mk({ annualFee: 0, joiningFee: fee, reward: 509 }), 'similar'), rw).stats;
    expect(j(509)[0]).toMatchObject({ label: 'Joining fee', delta: 'Same', direction: 'same' });
    expect(j(510)[0]).toMatchObject({ delta: '₹10 more', direction: 'up' });
    expect(j(509)[1]).toMatchObject({ delta: 'Same', direction: 'same', sentiment: 'neutral' });
    const r10 = presentPick(s, pick(mk({ reward: 510 }), 'similar'), rw).stats[1];
    expect(r10).toMatchObject({ delta: '₹10 more', direction: 'up', sentiment: 'good' });
    const r10less = presentPick(s, pick(mk({ reward: 490 }), 'similar'), rw).stats[1];
    expect(r10less).toMatchObject({ delta: '₹10 less', direction: 'down', sentiment: 'neutral' });
  });

  it('lowerFee band: annual diff under ₹10 falls to joining fee, then to "Similar fee"', () => {
    const s = mk({ annualFee: 1180, joiningFee: 1180 });
    const a = presentPick(s, pick(mk({ annualFee: 1175, joiningFee: 500 }), 'lowerFee'), rw);
    expect(a.bandAmount).toBe('₹680');
    expect(a.bandText).toBe('lower joining fee');
    const b = presentPick(s, pick(mk({ annualFee: 1171, joiningFee: 1175 }), 'lowerFee'), rw);
    expect(b.bandAmount).toBeUndefined();
    expect(b.bandText).toBe('Similar fee');
    const edge = presentPick(s, pick(mk({ annualFee: 1170, joiningFee: 1175 }), 'lowerFee'), rw);
    expect(edge.bandAmount).toBe('₹10');
    expect(edge.bandText).toBe('less a year');
  });

  it('lifetime free: caption only, value Free', () => {
    const v = presentPick(src, pick(mk({ annualFee: 0, joiningFee: 0 }), 'lowerFee'), rw);
    expect(v.bandText).toBe('Lifetime free');
    expect(v.bandAmount).toBeUndefined();
    expect(v.stats[0]).toMatchObject({ value: 'Free', delta: '₹2,950 less', direction: 'down', sentiment: 'good' });
  });

  it('joining-fee-only: amount + caption, joining stat', () => {
    const s = mk({ annualFee: 0, joiningFee: 2000 });
    const v = presentPick(s, pick(mk({ annualFee: 0, joiningFee: 500 }), 'lowerFee'), rw);
    expect(v.bandAmount).toBe('₹1,500');
    expect(v.bandText).toBe('lower joining fee');
    expect(v.stats[0]).toMatchObject({ label: 'Joining fee', value: '₹500', delta: '₹1,500 less' });
  });

  it('more rewards: amount + caption, Upto prefix, up / good', () => {
    const v = presentPick(src, pick(mk({ reward: 1700 }), 'moreRewards'), { cashbackValue: '₹1,700', rewardPrefix: 'Upto' });
    expect(v.bandAmount).toBe('₹1,200');
    expect(v.bandText).toBe('more Rewards');
    expect(v.icon).toBe('feat-rewards-outline');
    expect(v.stats[1]).toEqual({ label: 'Rewards', value: 'Upto ₹1,700', delta: '₹1,200 more', direction: 'up', sentiment: 'good' });
  });

  it('fewer / equal rewards and no reward', () => {
    const s = mk({ reward: 500 });
    const less = presentPick(s, pick(mk({ reward: 300 }), 'similar'), rw);
    expect(less.stats[1]).toMatchObject({ delta: '₹200 less', direction: 'down', sentiment: 'neutral' });
    const same = presentPick(s, pick(mk({ reward: 500 }), 'similar'), rw);
    expect(same.stats[1]).toMatchObject({ delta: 'Same', direction: 'same' });
    const none = presentPick(s, pick(mk({ reward: 0 }), 'similar'), { cashbackValue: '' });
    expect(none.stats[1]).toMatchObject({ value: 'None', direction: 'down', sentiment: 'neutral' });
  });

  it('easier to get: income first (down / good), fee second', () => {
    const s = mk({ incomeLpa: 6, annualFee: 1180 });
    const v = presentPick(s, pick(mk({ incomeLpa: 3, annualFee: 1180 }), 'easier'), rw);
    expect(v.bandText).toBe('Easier to get');
    expect(v.bandAmount).toBeUndefined();
    expect(v.icon).toBe('check-circle-outline');
    expect(v.stats[0]).toEqual({ label: 'Income needed', value: '₹3L a year', delta: '₹3L less', direction: 'down', sentiment: 'good' });
    expect(v.stats[1]).toMatchObject({ label: 'Annual fee', delta: 'Same' });
  });

  it('eligible, similar and upgrade lenses use text only', () => {
    expect(presentPick(src, pick(mk({}), 'eligible'), rw).bandText).toBe('You can get this');
    const sim = presentPick(src, pick(mk({}), 'similar', 'Also for Fuel'), rw);
    expect(sim.bandText).toBe('Also for Fuel');
    expect(sim.bandAmount).toBeUndefined();
    expect(presentPick(src, pick(mk({}), 'upgrade', 'Adds Dining'), rw).icon).toBe('feat-sparkle-outline');
  });

  it('similar icon follows the shared tag, else a dot', () => {
    expect(bandIcon(mk({ tags: ['Travel', 'UPI'] }), pick(mk({ tags: ['UPI', 'Travel'] }), 'similar'))).toBe('feat-travel-outline');
    expect(bandIcon(mk({ tags: ['Online Food Ordering'] }), pick(mk({ tags: ['Online Food Ordering'] }), 'similar'))).toBe('feat-dining-outline');
    expect(bandIcon(mk({ tags: ['UPI'] }), pick(mk({ tags: ['UPI'] }), 'similar'))).toBe('feat-dot-outline');
  });

  it('works on a real engine pick', () => {
    const s = mk({ tags: ['Fuel', 'UPI'] });
    const cat = [s, mk({ tags: ['Fuel', 'UPI'], reward: 900 }), mk({ tags: ['Fuel', 'UPI'], reward: 800 }), mk({ tags: ['Travel'] }), mk({ tags: ['Travel'] })];
    const p = getCrossSellV2(s, cat).lenses[0].picks[0];
    expect(presentPick(s, p, rw).stats).toHaveLength(2);
  });
});

describe('shortCardName', () => {
  it('strips a trailing "Credit Card" / "Card"', () => {
    expect(shortCardName('Axis Bank ACE Credit Card')).toBe('Axis Bank ACE');
    expect(shortCardName('Amazon Pay Card')).toBe('Amazon Pay');
    expect(shortCardName('SBI Cashback')).toBe('SBI Cashback');
  });
});
