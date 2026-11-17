/** buildEligibleList: closest row, filters, sorts, exclusions. */
import type { CardModel } from '../../molecules/CardTile';
import type { CrossSellCard } from '../crossSell';
import { buildEligibleList, categoryChips, countEligible } from '../eligibleList';
import { getRejectionPicks } from '../rejection';

let n = 0;
const cs = (o: Partial<CrossSellCard> = {}): CrossSellCard => {
  n += 1;
  return {
    id: `c${n}`, alias: `a${n}`, name: `Card ${n}`, bank: `bank${n}`, rewardType: 'rewards',
    tags: ['Travel'], joiningFee: 1180, annualFee: 1180, inviteOnly: false,
    reward: 500, earn: 800, incomeLpa: 0, crif: 0, priority: 1, ...o,
  };
};
/** A CardModel with only the fields the builder reads. */
const card = (o: Partial<CrossSellCard> = {}, extra: Partial<CardModel> = {}): CardModel => {
  const x = cs(o);
  return {
    id: x.id, name: x.name, tags: x.tags, feeType: 'with-fees', crossSell: x,
    filterMeta: { cardAlias: x.alias },
    ...extra,
  } as unknown as CardModel;
};
const ids = (items: { id: string }[]) => items.map((i) => i.id);
const aliases = (cards: CardModel[]) => cards.map((c) => c.crossSell?.alias ?? (c.filterMeta?.cardAlias as string));
const base = {
  categories: [] as string[],
  lifetimeFreeOnly: false,
  sort: 'closest' as const,
};

describe('sheet number and screen count', () => {
  it('countEligible = buildEligibleList().count, and includes a card without a crossSell model', () => {
    const rejected = card();
    const a = card();
    const b = card();
    const noModel = { id: 'nm', name: 'No model', tags: ['Travel'], feeType: 'with-fees', filterMeta: { cardAlias: 'nm-alias' } } as unknown as CardModel;
    const cards = [rejected, a, b, noModel];
    const eligibleAliases = aliases(cards);
    const screen = buildEligibleList({ ...base, rejected, cards, eligibleAliases });
    expect(screen.count).toBe(3);
    expect(countEligible(rejected, cards, eligibleAliases)).toBe(screen.count);
    // The picks' own count only sees cards with a model, so it is lower: it must not be the displayed number.
    const catalogue = cards.flatMap((c) => (c.crossSell ? [c.crossSell] : []));
    const r = getRejectionPicks(rejected.crossSell as CrossSellCard, catalogue, new Set(eligibleAliases));
    expect(r.eligibleCount).toBe(2);
    expect(countEligible(rejected, cards, eligibleAliases)).not.toBe(r.eligibleCount);
  });
});

describe('buildEligibleList', () => {
  it('preset = rejected tags that at least one eligible card shares', () => {
    const rejected = card({ tags: ['Travel', 'Fuel', 'Lounge'] });
    const a = card({ tags: ['Travel'] });
    const b = card({ tags: ['Fuel', 'Dining'] });
    const notEligible = card({ tags: ['Lounge'] });
    const r = buildEligibleList({
      ...base, rejected, cards: [rejected, a, b, notEligible], eligibleAliases: aliases([a, b]),
    });
    expect(r.presetCategories).toEqual(['Travel', 'Fuel']);
  });

  it('excludes the rejected card even when its alias is in the list', () => {
    const rejected = card();
    const a = card();
    const r = buildEligibleList({ ...base, rejected, cards: [rejected, a], eligibleAliases: aliases([rejected, a]) });
    expect(ids(r.all)).toEqual([a.id]);
    expect(ids(r.closest)).toEqual([a.id]);
    expect(r.count).toBe(1);
  });

  it('excludes invite-only cards (flag on crossSell or on the card)', () => {
    const rejected = card();
    const open = card();
    const inviteCs = card({ inviteOnly: true });
    const inviteCard = card({}, { inviteOnly: true });
    const cards = [rejected, open, inviteCs, inviteCard];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards) });
    expect(ids(r.all)).toEqual([open.id]);
    expect(r.count).toBe(1);
  });

  it('only lists cards whose alias is in eligibleAliases', () => {
    const rejected = card();
    const yes = card();
    const no = card();
    const r = buildEligibleList({ ...base, rejected, cards: [rejected, yes, no], eligibleAliases: aliases([yes]) });
    expect(ids(r.all)).toEqual([yes.id]);
  });

  it('closest: max 5, one per bank, most similar first', () => {
    const rejected = card({ tags: ['Travel', 'Fuel'], bank: 'rej' });
    const best = card({ tags: ['Travel', 'Fuel'], bank: 'x' });
    const bestSameBank = card({ tags: ['Travel', 'Fuel'], bank: 'x', reward: 100 });
    const others = [1, 2, 3, 4, 5].map(() => card({ tags: ['Travel'] }));
    const cards = [rejected, bestSameBank, ...others, best];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards) });
    expect(r.closest).toHaveLength(5);
    expect(r.closest[0].id).toBe(best.id); // same bank, higher reward wins the tie
    expect(ids(r.closest)).not.toContain(bestSameBank.id);
    expect(r.all).toHaveLength(7);
  });

  it('closest ignores the category and lifetime-free filters', () => {
    const rejected = card({ tags: ['Travel'] });
    const a = card({ tags: ['Travel'] });
    const r = buildEligibleList({
      ...base, rejected, cards: [rejected, a], eligibleAliases: aliases([a]),
      categories: ['Fuel'], lifetimeFreeOnly: true,
    });
    expect(r.all).toEqual([]);
    expect(ids(r.closest)).toEqual([a.id]);
  });

  it('category filter matches ANY selected category', () => {
    const rejected = card();
    const travel = card({ tags: ['Travel'] });
    const fuel = card({ tags: ['Fuel'] });
    const dining = card({ tags: ['Dining'] });
    const cards = [rejected, travel, fuel, dining];
    const r = buildEligibleList({
      ...base, rejected, cards, eligibleAliases: aliases(cards), categories: ['Travel', 'Fuel'],
    });
    expect(ids(r.all).sort()).toEqual([travel.id, fuel.id].sort());
    expect(r.count).toBe(3);
  });

  it('lifetime free filter keeps only lifetime free cards', () => {
    const rejected = card();
    const free = card({ joiningFee: 0, annualFee: 0 });
    const paid = card();
    const cards = [rejected, free, paid];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards), lifetimeFreeOnly: true });
    expect(ids(r.all)).toEqual([free.id]);
  });

  it('sort closest: more similar first, then nearer fee band, then higher reward', () => {
    const rejected = card({ tags: ['Travel', 'Fuel'], annualFee: 1180, joiningFee: 1180 });
    const far = card({ tags: ['Dining'] });
    const half = card({ tags: ['Travel'], annualFee: 1180, joiningFee: 1180, reward: 100 });
    const halfRich = card({ tags: ['Travel'], annualFee: 1180, joiningFee: 1180, reward: 900 });
    const full = card({ tags: ['Travel', 'Fuel'] });
    const cards = [rejected, far, half, halfRich, full];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards), sort: 'closest' });
    expect(ids(r.all)).toEqual([full.id, halfRich.id, half.id, far.id]);
  });

  it('sort reward: highest Rewards first', () => {
    const rejected = card();
    const lo = card({ reward: 100 });
    const hi = card({ reward: 900 });
    const mid = card({ reward: 400 });
    const cards = [rejected, lo, hi, mid];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards), sort: 'reward' });
    expect(ids(r.all)).toEqual([hi.id, mid.id, lo.id]);
  });

  it('sort fee: lowest fee first, ties by higher Rewards', () => {
    const rejected = card();
    const dear = card({ joiningFee: 5900, annualFee: 5900 });
    const free = card({ joiningFee: 0, annualFee: 0, reward: 100 });
    const freeRich = card({ joiningFee: 0, annualFee: 0, reward: 300 });
    const cheap = card({ joiningFee: 590, annualFee: 590 });
    const cards = [rejected, dear, free, freeRich, cheap];
    const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: aliases(cards), sort: 'fee' });
    expect(ids(r.all)).toEqual([freeRich.id, free.id, cheap.id, dear.id]);
  });

  it('cards without crossSell are listed last in every sort and never in closest', () => {
    const rejected = card();
    const scored = card({ reward: 100 });
    const bare = card({}, { crossSell: undefined, filterMeta: { cardAlias: 'bare' } } as Partial<CardModel>);
    const cards = [rejected, bare, scored];
    for (const sort of ['closest', 'reward', 'fee'] as const) {
      const r = buildEligibleList({ ...base, rejected, cards, eligibleAliases: ['bare', ...aliases([scored])], sort });
      expect(ids(r.all)).toEqual([scored.id, bare.id]);
      expect(ids(r.closest)).toEqual([scored.id]);
    }
  });

  it('a bare card still matches the category filter through card.tags', () => {
    const rejected = card();
    const bare = card({}, { crossSell: undefined, tags: ['Fuel'], filterMeta: { cardAlias: 'bare' } } as Partial<CardModel>);
    const r = buildEligibleList({
      ...base, rejected, cards: [rejected, bare], eligibleAliases: ['bare'], categories: ['Fuel'],
    });
    expect(ids(r.all)).toEqual([bare.id]);
  });

  it('every item carries a context tag', () => {
    const rejected = card();
    const a = card();
    const r = buildEligibleList({ ...base, rejected, cards: [rejected, a], eligibleAliases: aliases([a]), reasonKind: 'income' });
    expect(typeof r.all[0].tag.text).toBe('string');
    expect(typeof r.closest[0].tag.tone).toBe('string');
  });

  it('empty result: no eligible cards', () => {
    const rejected = card();
    const a = card();
    const r = buildEligibleList({ ...base, rejected, cards: [rejected, a], eligibleAliases: [] });
    expect(r).toEqual({ closest: [], all: [], count: 0, presetCategories: [] });
  });

  it('empty result: filters remove everything but the count stays', () => {
    const rejected = card();
    const a = card({ tags: ['Travel'] });
    const r = buildEligibleList({
      ...base, rejected, cards: [rejected, a], eligibleAliases: aliases([a]), categories: ['Dining'],
    });
    expect(r.all).toEqual([]);
    expect(r.count).toBe(1);
  });

  it('rejected card without crossSell: no closest row, all still listed', () => {
    const rejected = card({}, { crossSell: undefined, tags: ['Travel'], filterMeta: { cardAlias: 'rej' } } as Partial<CardModel>);
    const a = card();
    const r = buildEligibleList({ ...base, rejected, cards: [rejected, a], eligibleAliases: aliases([a]) });
    expect(r.closest).toEqual([]);
    expect(ids(r.all)).toEqual([a.id]);
    expect(r.presetCategories).toEqual(['Travel']);
  });
});

describe('categoryChips', () => {
  it('preset first, then the most common tags, capped without cutting the preset', () => {
    const rejected = card({ tags: ['Travel', 'Fuel'] });
    const cards = [
      rejected,
      card({ tags: ['Dining'] }), card({ tags: ['Dining', 'Travel'] }), card({ tags: ['Grocery'] }),
      card({ tags: ['Fuel'] }),
    ];
    expect(categoryChips(rejected, cards, aliases(cards))).toEqual(['Travel', 'Fuel', 'Dining', 'Grocery']);
    expect(categoryChips(rejected, cards, aliases(cards), 2)).toEqual(['Travel', 'Fuel']);
    expect(categoryChips(rejected, cards, aliases(cards), 3)).toEqual(['Travel', 'Fuel', 'Dining']);
  });
});
