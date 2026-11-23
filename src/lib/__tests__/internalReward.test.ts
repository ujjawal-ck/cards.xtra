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

  it('the cross-sell lenses rank the same cards, except the displayed "More rewards" claim', () => {
    const ids = (r: ReturnType<typeof getCrossSellV2>) =>
      r.lenses
        .filter((l) => l.key !== 'top' && l.key !== 'moreRewards')
        .map((l) => [l.key, l.picks.map((p) => p.card.id)]);
    const a = getCrossSellV2(now[0], now);
    const b = getCrossSellV2(old[0], old);
    expect(ids(a)).toEqual(ids(b));
    expect(ids(a).length).toBeGreaterThan(0);
    // The claim "₹X more Rewards" reads the displayed reward only: no CashKaro amounts, no claim.
    expect(a.lenses.find((l) => l.key === 'moreRewards')).toBeUndefined();
  });
});
