/** Card advisor engine: questions, slots, filters, reveal and pills. */
jest.mock('../../../api/bankkaro', () => ({ checkEligibility: jest.fn() }));

import type { CardModel } from '../../../molecules/CardTile';
import { ADVISOR_CONFIG } from '../config';
import { answerPills, buildReveal, deriveSlots, nextQuestion, slotsToFilters } from '../engine';
import { NOT_SURE, type AdvisorState, type QuestionId } from '../types';

let n = 0;
interface Opts {
  cat?: number[];
  network?: string;
  bank?: string;
  annualFee?: number;
  isFree?: boolean;
  newToCredit?: boolean;
  benefits?: Array<{ title: string; tagId?: number }>;
  tags?: string[];
  cashback?: string;
  bare?: boolean;
}
const card = (o: Opts = {}): CardModel => {
  n += 1;
  const free = o.isFree ?? false;
  const base = {
    id: `c${n}`,
    name: `Card ${n}`,
    filterMeta: {
      cardAlias: `a${n}`,
      bankName: o.bank ?? `Bank ${n}`,
      network: o.network ?? 'VISA',
      categoryIds: o.cat ?? [2],
      annualFeeValue: free ? 0 : o.annualFee ?? 500,
      isFree: free,
      newToCredit: o.newToCredit ?? false,
    },
  };
  if (o.bare) return base as unknown as CardModel;
  return {
    ...base,
    annualFee: free ? 'Free' : `₹${o.annualFee ?? 500}`,
    tileBenefits: (o.benefits ?? []).map((b) => ({ icon: 'feat-cashback', ...b })),
    tags: o.tags ?? [],
    cashback: o.cashback ?? '',
  } as unknown as CardModel;
};
const ids = (cards: CardModel[]) => cards.map((c) => c.id);
const st = (answers: Partial<Record<QuestionId, string>>, held: string[] = []): AdvisorState => ({ answers, held });
const C = ADVISOR_CONFIG;
const known = { eligibilityKnown: false };

const SHOPPING = 2;
const FUEL = 1;
const FOOD = 5;
const DINING = 6;
const GROCERY = 7;
const TRAVEL = 12;

describe('nextQuestion', () => {
  it('asks the opener first', () => {
    const step = nextQuestion(st({}), C, [card()], known);
    expect(step?.question.id).toBe('opener');
    expect(step?.stepNumber).toBe(1);
    expect(step?.options.map((o) => o.id)).toEqual(['first', 'better', 'specific', 'explore']);
    expect(step?.options.every((o) => o.count === undefined)).toBe(true);
  });

  it('uses the starter wording for journey first, and counts answers for the step number', () => {
    const cards = [card({ cat: [SHOPPING], isFree: true, newToCredit: true }), card({ cat: [FUEL], isFree: true, newToCredit: true })];
    const step = nextQuestion(st({ opener: 'first', history: 'no' }), C, cards, known);
    expect(step?.question.id).toBe('need');
    expect(step?.ask).toBe('Where does most of your monthly spend go?');
    expect(step?.why).toBe('A card pays back most where you already spend.');
    expect(step?.stepNumber).toBe(3);
  });

  it('hides a need option that leaves zero cards and gives counts', () => {
    const cards = [card({ cat: [SHOPPING] }), card({ cat: [SHOPPING] }), card({ cat: [FUEL] })];
    const step = nextQuestion(st({ opener: 'specific' }), C, cards, known);
    expect(step?.question.id).toBe('need');
    const byId = Object.fromEntries(step!.options.map((o) => [o.id, o.count]));
    expect(byId.shopping).toBe(2);
    expect(byId.fuel).toBe(1);
    expect(byId.bills).toBeUndefined();
    expect(byId.travel).toBeUndefined();
    expect(byId.everything).toBe(3);
  });

  it('skips a filters question when no option changes the list', () => {
    const cards = [
      card({ cat: [FOOD, DINING, GROCERY], isFree: true }),
      card({ cat: [FOOD, DINING, GROCERY], annualFee: 3000 }),
    ];
    const step = nextQuestion(st({ opener: 'specific', need: 'food' }), C, cards, known);
    expect(step?.question.id).toBe('fee');
  });

  it('hides "No fees at all" when the fee is already free', () => {
    const cards = [card({ cat: [SHOPPING], isFree: true, newToCredit: true }), card({ cat: [FUEL], isFree: true, newToCredit: true })];
    const first = nextQuestion(st({ opener: 'first', history: 'no' }), C, cards, known);
    expect(first?.options.map((o) => o.id)).not.toContain('nofees');
    const specific = nextQuestion(st({ opener: 'specific' }), C, [...cards, card({ cat: [SHOPPING], annualFee: 900 })], known);
    expect(specific?.options.map((o) => o.id)).toContain('nofees');
  });

  it('skips the four eligibility questions when eligibility is known', () => {
    const cards = [card({ cat: [SHOPPING] })];
    const answers = { opener: 'specific', need: 'shopping', fee: 'any' };
    expect(nextQuestion(st(answers), C, cards, known)?.question.id).toBe('eligBridge');
    expect(nextQuestion(st(answers), C, cards, { eligibilityKnown: true })).toBeNull();
  });

  it('walks the eligibility chain: bridge, job, income, pincode, then done', () => {
    const cards = [card({ cat: [SHOPPING] })];
    const base = { opener: 'specific', need: 'shopping', fee: 'any' };
    expect(nextQuestion(st({ ...base, eligBridge: 'yes' }), C, cards, known)?.question.id).toBe('job');
    expect(nextQuestion(st({ ...base, eligBridge: 'yes', job: 'salaried' }), C, cards, known)?.question.id).toBe('income');
    const pin = nextQuestion(st({ ...base, eligBridge: 'yes', job: 'salaried', income: '40to75' }), C, cards, known);
    expect(pin?.question.kind).toBe('pincode');
    expect(nextQuestion(st({ ...base, eligBridge: 'yes', job: 'salaried', income: '40to75', pincode: '560001' }), C, cards, known)).toBeNull();
    expect(nextQuestion(st({ ...base, eligBridge: 'yes', job: 'none' }), C, cards, known)).toBeNull();
    expect(nextQuestion(st({ ...base, eligBridge: 'no' }), C, cards, known)).toBeNull();
  });

  it('asks a removed early answer again and keeps the later answers', () => {
    const cards = [card({ cat: [FUEL], isFree: true }), card({ cat: [SHOPPING], isFree: true }), card({ cat: [SHOPPING], annualFee: 3000 })];
    const state = st({ opener: 'specific', fee: 'free' });
    expect(deriveSlots(state, C).fee).toBe('free');
    expect(nextQuestion(state, C, cards, known)?.question.id).toBe('need');
  });
});

describe('deriveSlots and slotsToFilters', () => {
  it('journey first gives the free and first-card filters', () => {
    const f = slotsToFilters(deriveSlots(st({ opener: 'first' }), C));
    expect(f.feeBucketIndices).toEqual([0]);
    expect(f.traits).toEqual(['firstCard']);
    expect(f.bankNames).toEqual([]);
  });

  it('history "yes" removes the first-card trait; "Not sure" keeps it', () => {
    expect(slotsToFilters(deriveSlots(st({ opener: 'first', history: 'yes' }), C)).traits).toEqual([]);
    expect(slotsToFilters(deriveSlots(st({ opener: 'first', history: NOT_SURE }), C)).traits).toEqual(['firstCard']);
  });

  it('maps fee comfort to bucket indices and UPI need to RuPay', () => {
    expect(slotsToFilters({ fee: 'upto1000' }).feeBucketIndices).toEqual([0, 1]);
    expect(slotsToFilters({ fee: 'upto5000' }).feeBucketIndices).toEqual([0, 1, 2, 3]);
    expect(slotsToFilters({ fee: 'any' }).feeBucketIndices).toEqual([]);
    expect(slotsToFilters({ network: 'RuPay' }).networks).toEqual(['RuPay']);
    expect(slotsToFilters({ categoryTagId: TRAVEL }).categoryTagIds).toEqual([TRAVEL]);
  });

  it('a "Not sure" answer does not stop later answers from applying', () => {
    const s = deriveSlots(st({ opener: 'specific', need: NOT_SURE, fee: 'upto1000' }), C);
    expect(s.categoryTagId).toBeUndefined();
    expect(s.fee).toBe('upto1000');
  });

  it('ignores an answer whose when no longer passes', () => {
    const dining = deriveSlots(st({ opener: 'specific', need: 'food', foodType: 'dining' }), C);
    expect(dining.categoryTagId).toBe(DINING);
    const fuel = deriveSlots(st({ opener: 'specific', need: 'fuel', foodType: 'dining' }), C);
    expect(fuel.categoryTagId).toBe(FUEL);
  });

  it('an invalid pincode sets nothing', () => {
    const base = { opener: 'specific', fee: 'any', eligBridge: 'yes', job: 'salaried', income: '20to40' };
    expect(deriveSlots(st({ ...base, pincode: '012345' }), C).pincode).toBeUndefined();
    expect(deriveSlots(st({ ...base, pincode: '5600' }), C).pincode).toBeUndefined();
    expect(deriveSlots(st({ ...base, pincode: '560001' }), C).pincode).toBe('560001');
    expect(deriveSlots(st({ ...base, pincode: '560001' }), C).incomeMonthly).toBe(20000);
  });
});

describe('buildReveal', () => {
  it('relaxes the filters with a note when nothing matches', () => {
    const fuelPaid = card({ cat: [FUEL], annualFee: 900 });
    const r = buildReveal({ state: st({ opener: 'specific', need: 'fuel', fee: 'free' }), config: C, cards: [fuelPaid, card({ cat: [SHOPPING], isFree: true })] });
    expect(r.dropped).toEqual(['feeBucketIndices']);
    expect(ids(r.all)).toEqual([fuelPaid.id]);
    expect(r.note).toBe('Closest cards for Fuel. We set aside Lifetime free.');
    expect(r.header).toBe('Cards for fuel');
    expect(r.filters.feeBucketIndices).toEqual([]);
  });

  it('UPI "daily" moves RuPay cards up and removes nothing', () => {
    const visa1 = card({ isFree: true, network: 'VISA' });
    const rupay = card({ isFree: true, network: 'VISA,RuPay' });
    const visa2 = card({ isFree: true, network: 'Mastercard' });
    const r = buildReveal({ state: st({ opener: 'first', history: 'yes', need: NOT_SURE, upi: 'daily' }), config: C, cards: [visa1, rupay, visa2] });
    expect(ids(r.all)).toEqual([rupay.id, visa1.id, visa2.id]);
    expect(r.total).toBe(3);
    expect(r.top[0].reason).toBe('Can be linked to UPI');
  });

  it('held cards leave the list', () => {
    const a = card();
    const b = card();
    const r = buildReveal({ state: st({ opener: 'explore' }, [a.id]), config: C, cards: [a, b] });
    expect(ids(r.all)).toEqual([b.id]);
    expect(r.header).toBe('Popular cards');
  });

  describe('eligibility', () => {
    const incomeMonthly = 40000;

    it('(a) keeps only the eligible cards of the matched list', () => {
      const s1 = card({ cat: [SHOPPING] });
      const s2 = card({ cat: [SHOPPING] });
      const f1 = card({ cat: [FUEL] });
      const r = buildReveal({
        state: st({ opener: 'specific', need: 'shopping', fee: 'any' }),
        config: C,
        cards: [s1, s2, f1],
        eligibility: { eligibleAliases: [s2.filterMeta!.cardAlias!, f1.filterMeta!.cardAlias!], incomeMonthly },
      });
      expect(ids(r.all)).toEqual([s2.id]);
      expect(r.proof).toBe('likely');
      expect(r.top[0].proof).toBe('likely');
      expect(r.top[0].reason).toBe('Fits your income and pincode');
      expect(r.header).toBe('Cards you are likely to get for shopping');
      expect(r.note).toBeUndefined();
    });

    it('(b) falls back to the category alone', () => {
      const shopFree = card({ cat: [SHOPPING], isFree: true });
      const shopPaid = card({ cat: [SHOPPING], annualFee: 3000 });
      const r = buildReveal({
        state: st({ opener: 'specific', need: 'shopping', fee: 'free' }),
        config: C,
        cards: [shopFree, shopPaid],
        eligibility: { eligibleAliases: [shopPaid.filterMeta!.cardAlias!], incomeMonthly },
      });
      expect(ids(r.all)).toEqual([shopPaid.id]);
      expect(r.note).toBe('None of those fit your income and pincode. These do.');
      expect(r.filters.categoryTagIds).toEqual([SHOPPING]);
      expect(r.filters.feeBucketIndices).toEqual([]);
      expect(r.dropped).toEqual(['feeBucketIndices']);
      expect(r.proof).toBe('likely');
    });

    it('(c) falls back to any eligible card in the pool', () => {
      const shop = card({ cat: [SHOPPING] });
      const fuel = card({ cat: [FUEL] });
      const r = buildReveal({
        state: st({ opener: 'specific', need: 'shopping', fee: 'any' }),
        config: C,
        cards: [shop, fuel],
        eligibility: { eligibleAliases: [fuel.filterMeta!.cardAlias!], incomeMonthly },
      });
      expect(ids(r.all)).toEqual([fuel.id]);
      expect(r.note).toBe('No card for this need fits your income and pincode. These are the ones that do.');
      expect(r.header).toBe('Cards you are likely to get');
      expect(r.dropped).toEqual(['categoryTagIds']);
    });

    it('(d) no eligible card: lowest fee first, proof none on every card', () => {
      const pricey = card({ cat: [SHOPPING], annualFee: 4000 });
      const cheap = card({ cat: [SHOPPING], annualFee: 300 });
      const r = buildReveal({
        state: st({ opener: 'specific', need: 'shopping', fee: 'any' }),
        config: C,
        cards: [pricey, cheap],
        eligibility: { eligibleAliases: [], incomeMonthly },
      });
      expect(ids(r.all)).toEqual([cheap.id, pricey.id]);
      expect(r.top.every((t) => t.proof === 'none')).toBe(true);
      expect(r.proof).toBe('none');
      expect(r.note).toBe(
        'We could not find a card that fits this income and pincode. You can change your answers. These have the lowest fees.',
      );
    });

    it('(d) with the journey default fee: the contrast card also shows proof none', () => {
      const free = card({ isFree: true, newToCredit: true });
      const paid = card({ annualFee: 800, newToCredit: true });
      const r = buildReveal({
        state: st({ opener: 'first' }),
        config: C,
        cards: [free, paid],
        eligibility: { eligibleAliases: [], incomeMonthly },
      });
      expect(r.top.map((t) => t.label)).toEqual(['Best match', 'Worth a look']);
      expect(r.top.every((t) => t.proof === 'none')).toBe(true);
    });

    it('not earning: no eligibility applied, lowest fee first, income-proof note', () => {
      const pricey = card({ annualFee: 4000 });
      const cheap = card({ annualFee: 300 });
      const r = buildReveal({
        state: st({ opener: 'specific', need: NOT_SURE, fee: 'any', eligBridge: 'yes', job: 'none' }),
        config: C,
        cards: [pricey, cheap],
        eligibility: { eligibleAliases: [pricey.filterMeta!.cardAlias!], incomeMonthly },
      });
      expect(ids(r.all)).toEqual([cheap.id, pricey.id]);
      expect(r.note).toBe('Banks usually ask for income proof. These have the lowest fees.');
      expect(r.proof).not.toBe('likely');
      expect(r.top.map((t) => t.label)).not.toContain('Worth a look');
    });
  });

  describe('top three', () => {
    it('contrast for the journey default fee: a paid card up to ₹1,000, not added to all', () => {
      const f1 = card({ isFree: true, newToCredit: true });
      const f2 = card({ isFree: true, newToCredit: true });
      const f3 = card({ isFree: true, newToCredit: true });
      const paid = card({ annualFee: 800, newToCredit: true });
      const r = buildReveal({ state: st({ opener: 'first' }), config: C, cards: [f1, f2, f3, paid] });
      expect(r.top.map((t) => t.card.id)).toEqual([f1.id, f2.id, paid.id]);
      expect(r.top.map((t) => t.label)).toEqual(['Best match', 'Also great', 'Worth a look']);
      expect(r.top[2].proof).toBe('matches');
      expect(ids(r.all)).not.toContain(paid.id);
      expect(r.header).toBe('Free first cards');
      expect(r.top[0].reason).toBe('No joining fee and no annual fee');
    });

    it('contrast when no fee is set: the first free card after two paid ones', () => {
      const p1 = card({ cat: [SHOPPING], annualFee: 2000 });
      const p2 = card({ cat: [SHOPPING], annualFee: 2500 });
      const p3 = card({ cat: [SHOPPING], annualFee: 3000 });
      const free = card({ cat: [SHOPPING], isFree: true });
      const r = buildReveal({ state: st({ opener: 'explore', matters: 'saving', need: 'shopping' }), config: C, cards: [p1, p2, p3, free] });
      expect(r.top.map((t) => t.card.id)).toEqual([p1.id, p2.id, free.id]);
      expect(r.top[2].label).toBe('Worth a look');
    });

    it('no contrast when the user chose the fee', () => {
      const cards = [card({ isFree: true }), card({ isFree: true }), card({ isFree: true }), card({ annualFee: 800 })];
      const r = buildReveal({ state: st({ opener: 'specific', need: NOT_SURE, fee: 'free' }), config: C, cards });
      expect(r.top.map((t) => t.label)).toEqual(['Best match', 'Also great', 'Also great']);
      expect(r.top.map((t) => t.card.id)).toEqual(ids(cards.slice(0, 3)));
    });

    it('slot 2 prefers a different bank', () => {
      const h1 = card({ bank: 'HDFC Bank' });
      const h2 = card({ bank: 'HDFC Bank' });
      const sbi = card({ bank: 'SBI Card' });
      const r = buildReveal({ state: st({ opener: 'specific', need: NOT_SURE, fee: 'any' }), config: C, cards: [h1, h2, sbi] });
      expect(r.top.map((t) => t.card.id)).toEqual([h1.id, sbi.id, h2.id]);
    });

    it('marks new cards and says when the best three did not change', () => {
      const a = card();
      const b = card();
      const c = card();
      const d = card();
      const state = st({ opener: 'specific', need: NOT_SURE, fee: 'any' });
      const first = buildReveal({ state, config: C, cards: [a, b, c, d] });
      expect(first.top.every((t) => !t.isNew)).toBe(true);
      const same = buildReveal({ state, config: C, cards: [a, b, c, d], previousTop: [a.id, b.id, c.id] });
      expect(same.note).toBe('Same cards. That answer did not change the best three.');
      expect(same.top.every((t) => !t.isNew)).toBe(true);
      const changed = buildReveal({ state, config: C, cards: [a, b, c, d], previousTop: [a.id, b.id, d.id] });
      expect(changed.note).toBeUndefined();
      expect(changed.top.map((t) => t.isNew)).toEqual([false, false, true]);
    });

    it('works with one card and with an empty catalogue', () => {
      const only = card();
      const one = buildReveal({ state: st({ opener: 'specific', fee: 'any' }), config: C, cards: [only] });
      expect(one.top.map((t) => t.card.id)).toEqual([only.id]);
      const none = buildReveal({ state: st({ opener: 'specific', fee: 'any' }), config: C, cards: [] });
      expect(none.top).toEqual([]);
      expect(none.total).toBe(0);
      expect(none.proof).toBe('none');
    });
  });

  describe('reasons and header', () => {
    it('a reason is never empty, even for a card with no benefits and no tags', () => {
      const bare = card({ bare: true });
      const r = buildReveal({ state: st({ opener: 'explore' }), config: C, cards: [bare] });
      expect(r.top[0].reason).toBe('A popular card');
    });

    it('a category answer uses the matching benefit, then falls back in order', () => {
      const withBenefit = card({ cat: [TRAVEL], benefits: [{ title: 'Lounge access' }, { title: ' 5% on flights ', tagId: TRAVEL }] });
      const withTags = card({ cat: [TRAVEL], tags: ['Travel', 'Lounge'] });
      const withCashback = card({ cat: [TRAVEL], cashback: 'Up to 10%' });
      const r = buildReveal({ state: st({ opener: 'better', missing: 'travel' }), config: C, cards: [withBenefit, withTags, withCashback] });
      const reason = Object.fromEntries(r.top.map((t) => [t.card.id, t.reason]));
      expect(reason[withBenefit.id]).toBe('5% on flights');
      expect(reason[withTags.id]).toBe('Travel · Lounge');
      expect(reason[withCashback.id]).toBe('Up to 10%');
    });

    it('a fee answer after the category gives the fee line', () => {
      const paid = card({ cat: [TRAVEL], annualFee: 900, benefits: [{ title: 'Lounge access', tagId: TRAVEL }] });
      const r = buildReveal({ state: st({ opener: 'better', missing: 'travel', fee: 'upto1000' }), config: C, cards: [paid] });
      expect(r.top[0].reason).toBe('Annual fee ₹900');
    });

    it('a history answer says "Open to first-time applicants"', () => {
      const ntc = card({ isFree: true, newToCredit: true });
      const r = buildReveal({ state: st({ opener: 'first', history: 'no' }), config: C, cards: [ntc] });
      expect(r.top[0].reason).toBe('Open to first-time applicants');
    });

    it('writes natural headers', () => {
      const shopFirst = card({ cat: [SHOPPING], isFree: true, newToCredit: true });
      expect(buildReveal({ state: st({ opener: 'first', history: 'no', need: 'shopping' }), config: C, cards: [shopFirst] }).header).toBe(
        'Free first cards for shopping',
      );
      const travel = card({ cat: [TRAVEL], annualFee: 900 });
      expect(buildReveal({ state: st({ opener: 'specific', need: 'travel', fee: 'upto1000' }), config: C, cards: [travel] }).header).toBe(
        'Travel cards up to ₹1,000 a year',
      );
      const rupay = card({ network: 'RuPay', annualFee: 4000 });
      expect(buildReveal({ state: st({ opener: 'specific', need: 'upi', fee: 'upto5000' }), config: C, cards: [rupay] }).header).toBe(
        'Cards up to ₹5,000 a year that work on UPI',
      );
      const food = card({ cat: [FOOD] });
      expect(buildReveal({ state: st({ opener: 'specific', need: 'food', foodType: NOT_SURE, fee: 'any' }), config: C, cards: [food] }).header).toBe(
        'Cards for food ordering',
      );
    });
  });
});

describe('answerPills', () => {
  it('uses the pill, falls back to the label, skips the bridge and shows a valid pincode', () => {
    const state = st({
      opener: 'specific',
      need: 'bills',
      upi: 'daily',
      fee: 'upto1000',
      eligBridge: 'yes',
      job: 'self',
      income: '40to75',
      pincode: '560001',
    });
    expect(answerPills(state, C)).toEqual([
      { questionId: 'opener', label: 'Something specific' },
      { questionId: 'need', label: 'Bills' },
      { questionId: 'upi', label: 'UPI daily' },
      { questionId: 'fee', label: 'Up to ₹1,000 a year' },
      { questionId: 'job', label: 'Self-employed' },
      { questionId: 'income', label: '₹40,000 to ₹75,000' },
      { questionId: 'pincode', label: 'PIN 560001' },
    ]);
  });

  it('skips "Not sure", inactive answers and an invalid pincode', () => {
    const state = st({
      opener: 'specific',
      need: 'fuel',
      foodType: 'dining',
      upi: 'daily',
      fee: NOT_SURE,
      eligBridge: 'yes',
      job: 'salaried',
      income: 'u20',
      pincode: '12ab56',
    });
    expect(answerPills(state, C).map((p) => p.label)).toEqual(['Something specific', 'Fuel', 'Salaried', 'Under ₹20,000']);
  });
});
