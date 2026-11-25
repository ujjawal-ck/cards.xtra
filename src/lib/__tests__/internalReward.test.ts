/**
 * Display vs internal reward (decision 2026-11-23).
 *
 * A card with a BankKaro commission and no CashKaro rate shows no reward amount
 * (`reward` 0), but the cross-sell earning gate, the engine's ranking and the
 * rejection picks must behave exactly as at e4d37a1, when `reward` held the
 * commission. "Old" cards below rebuild that e4d37a1 shape: `reward` = the
 * commission, no `internalReward`.
 */
import { mapBkCardToCardModel } from '../../api/cardMapper';
import type { BkCard } from '../../api/cardMapper';
import { getCrossSellV2, passesEarningGate, rankReward } from '../crossSell';
import type { CrossSellCard } from '../crossSell';
import { getRejectionPicks } from '../rejection';
import { presentPick } from '../crossSellPresent';

const bk = (id: number, over: Partial<BkCard>): BkCard => ({
  id,
  name: `Card ${id} Credit Card`,
  card_alias: `card-${id}`,
  bank_id: id, // one bank per card, so one-per-bank never hides a pick
  joining_fee_text: '499',
  annual_fee_text: '499',
  commission: '1000',
  bk_commission: '5000', // what CashKaro earns: above every reward, so the net rule passes
  tags: [
    { id: 1, name: 'Shopping' },
    { id: 2, name: 'Dining' },
  ],
  ...over,
});

// No CashKaro rate on any card: the case of production today.
const raw: BkCard[] = [
  bk(1, { commission: '1200' }), // the tapped / rejected card
  bk(2, { commission: '2500' }),
  bk(3, { commission: '1800', annual_fee_text: '0', joining_fee_text: '0' }),
  bk(4, { commission: '0', bk_commission: '0' }), // CashKaro earns nothing: gated out
  bk(5, { commission: '900', annual_fee_text: '2999' }),
  bk(6, { commission: '3000', tags: [{ id: 1, name: 'Shopping' }] }),
  bk(7, { commission: 'N/A', bk_commission: '1100' }),
];

const now: CrossSellCard[] = raw.map((b) => mapBkCardToCardModel(b, {}, null).crossSell as CrossSellCard);
// The e4d37a1 shape: `reward` held the resolved value (CashKaro rate, else commission).
const old: CrossSellCard[] = now.map(({ internalReward, ...c }) => ({ ...c, reward: internalReward ?? 0 }));

describe('internal reward keeps the e4d37a1 maths', () => {
  it('displays no reward without a CashKaro rate, and keeps the commission internally', () => {
    expect(now.every((c) => c.reward === 0)).toBe(true);
    expect(now.map(rankReward)).toEqual([1200, 2500, 1800, 0, 900, 3000, 1100]);
    expect(old.map((c) => c.reward)).toEqual(now.map(rankReward));
  });

  it('the earning gate gives the same answer for every card', () => {
    expect(now.map((c) => passesEarningGate(c))).toEqual(old.map((c) => passesEarningGate(c)));
    expect(now.map((c) => passesEarningGate(c))).toEqual([true, true, true, false, true, true, true]);
  });

  it('the rejection picks are the same cards, slots and tags', () => {
    const eligible = new Set(now.map((c) => c.alias));
    const strip = (r: ReturnType<typeof getRejectionPicks>) =>
      r.picks.map((p) => ({ id: p.card.id, slot: p.slot, tag: p.tag }));
    const a = getRejectionPicks(now[0], now, eligible);
    const b = getRejectionPicks(old[0], old, eligible);
    expect(strip(a)).toEqual(strip(b));
    expect(a.picks.map((p) => p.slot)).toEqual(['closest', 'topRewards', 'closest']);
    expect(a.eligibleCount).toBe(b.eligibleCount);
  });

  // Review R-04: the `top` lens (what the rail shows first) and "More rewards" pick and rank on
  // the internal reward, so they give the e4d37a1 cards. Ids and lens keys are compared, not texts.
  const ids = (r: ReturnType<typeof getCrossSellV2>) => r.lenses.map((l) => [l.key, l.picks.map((p) => p.card.id)]);

  it('the cross-sell lenses, Top picks and "More rewards" included, pick the same cards', () => {
    const a = getCrossSellV2(now[0], now);
    const b = getCrossSellV2(old[0], old);
    expect(ids(a)).toEqual(ids(b));
    expect(a.show).toBe(b.show);
    // Not a vacuous match: "More rewards" has picks (the random test below covers Top picks).
    const more = a.lenses.find((l) => l.key === 'moreRewards');
    expect(more?.picks.map((p) => p.card.id)).toEqual(['2', '3']);
  });

  it('a "More rewards" pick shows no amount when the cards show no reward amount', () => {
    const src = now[0];
    const r = getCrossSellV2(src, now);
    const picks = r.lenses.find((l) => l.key === 'moreRewards')?.picks ?? [];
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) {
      expect(p.delta).not.toMatch(/₹/);
      expect(p.delta).toMatch(/^More rewards, /);
      const v = presentPick(src, p, { cashbackValue: '' });
      expect(v.bandAmount).toBeUndefined();
      expect(v.bandText).toBe('More rewards');
    }
  });

  it('the amount shows only from displayed rewards, and only when it is higher', () => {
    // Card 1 shows ₹500, card 2 ₹900 (internal 2500), card 3 ₹300 (internal 1800, lifetime free).
    const shown: Record<string, number> = { '1': 500, '2': 900, '3': 300 };
    const cat = now.map((c) => ({ ...c, reward: shown[c.id] ?? 0 }));
    const picks = getCrossSellV2(cat[0], cat).lenses.find((l) => l.key === 'moreRewards')?.picks ?? [];
    // Picked and ranked on the internal reward, as before.
    expect(picks.map((p) => p.card.id)).toEqual(['2', '3']);
    expect(picks[0].delta).toBe('₹400 more Rewards, same fee');
    expect(presentPick(cat[0], picks[0], { cashbackValue: '₹900' })).toMatchObject({ bandAmount: '₹400', bandText: 'more Rewards' });
    // Internally more, displayed less: still picked, with no amount.
    expect(picks[1].delta).toBe('More rewards, lifetime free');
    expect(presentPick(cat[0], picks[1], { cashbackValue: '₹300' }).bandAmount).toBeUndefined();
  });

  it('Top picks match e4d37a1 on 300 random commission-only catalogues', () => {
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return Math.floor(seed / 65536) % n; // the high bits: the low bits of this generator repeat
    };
    const TAGS = ['Shopping', 'Dining', 'Travel', 'Fuel', 'Movies', 'UPI'];
    const FEES = ['0', '499', '999', '1499', '2999', '4999'];
    let withMoreRewards = 0;
    for (let round = 0; round < 300; round++) {
      const cat: BkCard[] = Array.from({ length: 10 }, (_, i) => {
        const fee = FEES[rnd(FEES.length)];
        return bk(round * 100 + i + 1, {
          bank_id: rnd(6) + 1,
          joining_fee_text: fee,
          annual_fee_text: fee,
          commission: String(rnd(8) * 400),
          bk_commission: String(rnd(10) * 600),
          tags: TAGS.filter(() => rnd(2) === 1).map((name, k) => ({ id: k + 1, name })),
        });
      });
      const n = cat.map((b) => mapBkCardToCardModel(b, {}, null).crossSell as CrossSellCard);
      const o = n.map(({ internalReward, ...c }) => ({ ...c, reward: internalReward ?? 0 }));
      expect(n.every((c) => c.reward === 0)).toBe(true);
      const a = getCrossSellV2(n[0], n);
      expect(ids(a)).toEqual(ids(getCrossSellV2(o[0], o)));
      if (a.lenses.find((l) => l.key === 'top')?.picks.some((p) => p.lens === 'moreRewards')) withMoreRewards++;
    }
    // Not vacuous: Top picks use a "More rewards" pick in many catalogues (69 of 300 with this seed).
    expect(withMoreRewards).toBeGreaterThan(30);
  });
});
