/**
 * Rejection logic tests: small hand-made catalogues, one rule per test.
 * Fees are GST-inclusive (as the tile shows), Rewards are ₹.
 */
import { getRejectionPicks, rejectionReason, contextTag, similarityTo, formatLakh, OTHER_REASON_LINE } from '../rejection';
import type { RejectionReason } from '../rejection';
import type { CrossSellCard } from '../crossSell';

const FUEL_SHOP = ['Fuel', 'Shopping'];

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
    earn: 20000,
    incomeLpa: 0,
    crif: 0,
    priority: 100,
    ...over,
  };
}

const src = mk({ alias: 'src', bank: 'A', joiningFee: 1000, annualFee: 1000, reward: 500, incomeLpa: 12 });

describe('rejectionReason', () => {
  it('income: the bar is above what the user earns', () => {
    const r = rejectionReason(src, { incomeMonthly: 50000, selfEmployed: false });
    expect(r.kind).toBe('income');
    expect(r.lines).toEqual(['This card needs about ₹12L a year.', 'You entered ₹6L a year.']);
    expect(r.highlightField).toBe('income');
  });

  it('income: no trailing zeros, one decimal', () => {
    const card = mk({ alias: 'x', incomeLpa: 2.4 });
    const r = rejectionReason(card, { incomeMonthly: 10000, selfEmployed: false });
    expect(r.lines).toEqual(['This card needs about ₹2.4L a year.', 'You entered ₹1.2L a year.']);
  });

  it('income: uses the self-employed bar when it is known', () => {
    const card = mk({ alias: 'x', incomeLpa: 3, incomeSelfEmpLpa: 6 });
    const r = rejectionReason(card, { incomeMonthly: 40000, selfEmployed: true }); // 4.8L
    expect(r.kind).toBe('income');
    expect(r.lines[0]).toBe('This card needs about ₹6L a year.');
    // The same income clears the salaried bar of 3L.
    expect(rejectionReason(card, { incomeMonthly: 40000, selfEmployed: false }).kind).toBe('other');
  });

  it('income: self-employed with no self-employed bar falls back to the salaried bar', () => {
    const card = mk({ alias: 'x', incomeLpa: 12, incomeSelfEmpLpa: 0 });
    expect(rejectionReason(card, { incomeMonthly: 50000, selfEmployed: true }).lines[0]).toBe(
      'This card needs about ₹12L a year.',
    );
  });

  it('income: a near miss never prints two equal amounts', () => {
    const card = mk({ alias: 'x', incomeLpa: 3 });
    const r = rejectionReason(card, { incomeMonthly: 24990, selfEmployed: false }); // 2.9988L
    expect(r.kind).toBe('income');
    const [need, entered] = r.lines.map((l) => l.match(/₹([\d.]+)L/)![1]);
    expect(need).not.toBe(entered);
  });

  it('other: never invents a reason', () => {
    const other = { kind: 'other', lines: [OTHER_REASON_LINE] };
    expect(rejectionReason(src, null)).toEqual(other); // details unknown
    expect(rejectionReason(mk({ alias: 'x', incomeLpa: 0 }), { incomeMonthly: 10000, selfEmployed: false })).toEqual(
      other,
    ); // bar unknown
    expect(rejectionReason(src, { incomeMonthly: 150000, selfEmployed: false })).toEqual(other); // income above the bar
    expect(rejectionReason(src, { incomeMonthly: 0, selfEmployed: false })).toEqual(other); // no income entered
    expect(rejectionReason(src, { incomeMonthly: NaN, selfEmployed: false })).toEqual(other);
  });

  it('never returns the employment kind (no employment data yet)', () => {
    expect(rejectionReason(src, { incomeMonthly: 100000, selfEmployed: true }).kind).not.toBe('employment');
  });

  it('formatLakh', () => {
    expect(formatLakh(12)).toBe('12');
    expect(formatLakh(2.4)).toBe('2.4');
    expect(formatLakh(6.0000001)).toBe('6');
  });
});

describe('getRejectionPicks', () => {
  // Three jobs, three different cards.
  const closest = mk({ alias: 'closest', bank: 'B', joiningFee: 1000, annualFee: 1000, reward: 600 }); // same tags, same band
  const rich = mk({ alias: 'rich', bank: 'C', tags: ['Fuel', 'Travel'], joiningFee: 1000, annualFee: 1000, reward: 5000 });
  const free = mk({ alias: 'free', bank: 'D', joiningFee: 0, annualFee: 0, reward: 300 });
  const catalogue = [src, closest, rich, free];
  const all = new Set(['closest', 'rich', 'free']);

  it('three different jobs', () => {
    const r = getRejectionPicks(src, catalogue, all);
    expect(r.picks.map((p) => p.slot)).toEqual(['closest', 'topRewards', 'lifetimeFree']);
    expect(r.picks.map((p) => p.card.alias)).toEqual(['closest', 'rich', 'free']);
    expect(r.picks.map((p) => p.tag)).toEqual(['Closest to src', 'Highest Rewards', 'Lifetime free']);
    expect(r.picks.map((p) => p.tone)).toEqual(['info', 'brand', 'success']);
  });

  it('closest: highest similarity first, then nearest fee band', () => {
    const lessSimilar = mk({ alias: 'less', bank: 'E', tags: ['Fuel', 'Travel'], joiningFee: 1000, annualFee: 1000, reward: 9000 });
    const farBand = mk({ alias: 'far', bank: 'F', joiningFee: 8000, annualFee: 8000, reward: 100 });
    const nearBand = mk({ alias: 'near', bank: 'G', joiningFee: 1500, annualFee: 1500, reward: 100 });
    const cat = [src, lessSimilar, farBand, nearBand];
    const r = getRejectionPicks(src, cat, new Set(['less', 'far', 'near']));
    expect(r.picks[0].card.alias).toBe('near');
  });

  it('one card per bank, no card twice', () => {
    const sameBank = mk({ alias: 'same-bank', bank: 'B', reward: 9000 }); // bank B again, highest reward
    const cat = [src, closest, sameBank, rich, free];
    const r = getRejectionPicks(src, cat, new Set(['closest', 'same-bank', 'rich', 'free']));
    const banks = r.picks.map((p) => p.card.bank);
    expect(new Set(banks).size).toBe(banks.length);
    expect(new Set(r.picks.map((p) => p.card.id)).size).toBe(r.picks.length);
  });

  it('ineligible cards are never picked, and neither is the tapped card or an invite-only card', () => {
    const notEligible = mk({ alias: 'no', bank: 'X', reward: 99999 });
    const invite = mk({ alias: 'invite', bank: 'Y', reward: 99999, inviteOnly: true });
    const cat = [src, closest, notEligible, invite];
    const r = getRejectionPicks(src, cat, new Set(['closest', 'invite', 'src']));
    expect(r.picks.map((p) => p.card.alias)).toEqual(['closest']);
    expect(r.eligibleCount).toBe(1);
  });

  it('the earning gate applies (no Rewards means no pick) but not to the count', () => {
    const noReward = mk({ alias: 'none', bank: 'X', reward: 0 });
    const r = getRejectionPicks(src, [src, closest, noReward], new Set(['closest', 'none']));
    expect(r.picks.map((p) => p.card.alias)).toEqual(['closest']);
    expect(r.eligibleCount).toBe(2);
  });

  it('viewed cards are not picked but still counted', () => {
    const r = getRejectionPicks(src, catalogue, all, { viewed: ['closest'] });
    expect(r.picks.map((p) => p.card.alias)).not.toContain('closest');
    expect(r.eligibleCount).toBe(3);
  });

  it('fewer than 3 eligible: returns what there is', () => {
    const r = getRejectionPicks(src, [src, closest, rich], new Set(['closest', 'rich']));
    expect(r.picks).toHaveLength(2);
    expect(r.picks.map((p) => p.slot)).toEqual(['closest', 'topRewards']);
  });

  it('zero eligible: no picks, count 0', () => {
    expect(getRejectionPicks(src, catalogue, new Set())).toEqual({ picks: [], eligibleCount: 0 });
  });

  it('no lifetime free card: the next closest card takes the third place', () => {
    const second = mk({ alias: 'second', bank: 'E', joiningFee: 1000, annualFee: 1000, reward: 100 });
    const cat = [src, closest, rich, second];
    const r = getRejectionPicks(src, cat, new Set(['closest', 'rich', 'second']));
    expect(r.picks).toHaveLength(3);
    expect(r.picks[2].slot).toBe('closest');
    expect(r.picks[2].tag).toBe('Closest to src');
    expect(r.picks.map((p) => p.card.alias).sort()).toEqual(['closest', 'rich', 'second']);
  });

  it('few close cards: relaxes the same-category rule and ranks by similarity', () => {
    // Only one card shares tags; the others share none (below nicheMin).
    const near = mk({ alias: 'near', bank: 'B' });
    const far1 = mk({ alias: 'far1', bank: 'C', tags: ['Travel'] });
    const far2 = mk({ alias: 'far2', bank: 'D', tags: ['Dining'] });
    const cat = [src, near, far1, far2];
    const r = getRejectionPicks(src, cat, new Set(['near', 'far1', 'far2']));
    expect(r.picks).toHaveLength(3);
    expect(r.picks[0].card.alias).toBe('near');
  });

  it('eligibleCount: every eligible non-invite card except the tapped one', () => {
    const r = getRejectionPicks(src, catalogue, all);
    expect(r.eligibleCount).toBe(3);
  });
});

describe('similarityTo', () => {
  it('is 1 for identical tags and 0 for none, within 0..1', () => {
    const same = mk({ alias: 'same' });
    const none = mk({ alias: 'none', tags: ['Travel'] });
    const S = similarityTo(src, [src, same, none, mk({ alias: 'o', tags: ['Dining'] })]);
    expect(S(same)).toBeCloseTo(1);
    expect(S(none)).toBe(0);
  });
});

describe('contextTag', () => {
  const rare = mk({ alias: 'rare', bank: 'A', tags: ['Fuel', 'UPI'] });
  const catalogue = [
    rare,
    ...Array.from({ length: 6 }, (_, i) => mk({ alias: `s${i}`, tags: ['Shopping'] })),
    mk({ alias: 'f', tags: ['Fuel'] }),
  ];
  const source = mk({ alias: 'source', bank: 'A', tags: ['Shopping', 'UPI'] });
  const cat = [source, ...catalogue];
  const incomeReason: RejectionReason = { kind: 'income', lines: [] };
  const otherReason: RejectionReason = { kind: 'other', lines: [] };

  it('same bank comes first, even with an income reason', () => {
    expect(contextTag(source, rare, incomeReason, cat).text).toBe('Also from A');
    expect(contextTag(source, rare, otherReason, cat).text).toBe('Also from A');
  });

  it('income reason: a shared tag still wins, so tags differ between cards', () => {
    const other = mk({ alias: 'o3', bank: 'Z', tags: ['Shopping', 'UPI'] });
    const plain = mk({ alias: 'p3', bank: 'Y', tags: ['Travel'] });
    const c3 = [...cat, other, plain];
    expect(contextTag(source, other, incomeReason, c3).text).toBe('Also has UPI');
    expect(contextTag(source, plain, incomeReason, c3).text).toBe('Fits your income');
  });

  it('income reason without a catalogue: other bank gets "Fits your income"', () => {
    const other = mk({ alias: 'o4', bank: 'Z', tags: ['Shopping'] });
    expect(contextTag(source, other, incomeReason).text).toBe('Fits your income');
  });

  it('shares the tapped card\'s rarest tag', () => {
    const other = mk({ alias: 'o', bank: 'Z', tags: ['Shopping', 'UPI'] });
    const c2 = [...cat, other];
    expect(contextTag(source, other, undefined, c2).text).toBe('Also has UPI'); // UPI is rarer than Shopping
  });

  it('otherwise "You can get this"', () => {
    const none = mk({ alias: 'n', bank: 'Z', tags: ['Travel'] });
    expect(contextTag(source, none, otherReason, cat).text).toBe('You can get this');
    // Without the catalogue the rarest-tag rule is skipped.
    const other = mk({ alias: 'o2', bank: 'Z', tags: ['Shopping'] });
    expect(contextTag(source, other).text).toBe('You can get this');
  });
});
