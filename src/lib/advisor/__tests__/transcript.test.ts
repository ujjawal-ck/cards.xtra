/** Card advisor chat transcript: buildTranscript, rewindAnswers, avatarStateFor. */
jest.mock('../../../api/bankkaro', () => ({ checkEligibility: jest.fn() }));

import type { CardModel } from '../../../molecules/CardTile';
import type { AvatarSignals, ChatMessage } from '../chatTypes';
import type { AdvisorConfig } from '../types';
import { ADVISOR_CONFIG } from '../config';
import {
  answeredList,
  answersLost,
  avatarStateFor,
  buildTranscript,
  lastAnswered,
  rewindAnswers,
} from '../transcript';
import { encodeEligForm } from '../answers';
import { NOT_SURE, type AdvisorEligibility, type AdvisorState, type QuestionId } from '../types';

let n = 0;
interface Opts {
  cat?: number[];
  network?: string;
  bank?: string;
  annualFee?: number;
  isFree?: boolean;
  newToCredit?: boolean;
}
const card = (o: Opts = {}): CardModel => {
  n += 1;
  const free = o.isFree ?? false;
  return {
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
    annualFee: free ? 'Free' : `₹${o.annualFee ?? 500}`,
    tileBenefits: [],
    tags: [],
    cashback: '',
  } as unknown as CardModel;
};
const st = (answers: Partial<Record<QuestionId, string>>, held: string[] = []): AdvisorState => ({ answers, held });
const C = ADVISOR_CONFIG;
const SHOPPING = 2;
const FUEL = 1;

/** A small catalogue where the first-card journey keeps asking its questions. */
const catalogue = (): CardModel[] => [
  card({ cat: [SHOPPING], isFree: true, newToCredit: true, network: 'RuPay' }),
  card({ cat: [SHOPPING], isFree: true, newToCredit: true }),
  card({ cat: [SHOPPING], isFree: true, newToCredit: true }),
  card({ cat: [SHOPPING], isFree: true, newToCredit: true }),
  card({ cat: [FUEL], isFree: true, newToCredit: true }),
  card({ cat: [SHOPPING], annualFee: 900 }),
  card({ cat: [SHOPPING], annualFee: 3000, network: 'RuPay' }),
];

const FULL_FIRST = {
  opener: 'first',
  history: 'no',
  need: 'shopping',
  upi: 'daily',
  eligBridge: 'yes',
  eligForm: encodeEligForm({ job: 'salaried', incomeMonthly: 40000, pincode: '110001' }),
};
const ORDER: QuestionId[] = ['opener', 'history', 'need', 'upi', 'eligBridge', 'eligForm'];
const prefixOf = (k: number): AdvisorState => {
  const answers: Partial<Record<QuestionId, string>> = {};
  ORDER.slice(0, k).forEach((id) => {
    answers[id] = (FULL_FIRST as Record<string, string>)[id];
  });
  return st(answers);
};

const build = (
  state: AdvisorState,
  cards: CardModel[],
  eligibility: AdvisorEligibility | null = null,
  eligibilityKnown = false,
) => buildTranscript({ state, config: C, cards, eligibility, eligibilityKnown });

const eligibleFor = (cards: CardModel[], i: number[]): AdvisorEligibility => ({
  eligibleAliases: i.map((x) => cards[x].filterMeta!.cardAlias!),
  incomeMonthly: 40000,
});

/** The comparable text of a message. */
const textOf = (m: ChatMessage): string => {
  switch (m.kind) {
    case 'agent-text':
    case 'agent-tip':
    case 'user-answer':
      return m.text;
    case 'agent-question':
      return `${m.why}|${m.ask}`;
    case 'agent-reveal':
      return m.header;
    default:
      return m.status;
  }
};
const isTail = (m: ChatMessage) => (m.kind === 'agent-question' && m.current) || m.id === 'closing';
const kinds = (ms: ChatMessage[]) => ms.map((m) => m.kind);

describe('buildTranscript', () => {
  it('before any answer: hello and the opener, no reveal', () => {
    const t = build(st({}), catalogue());
    expect(t.messages.map((m) => m.id)).toEqual(['hello', 'q:opener']);
    expect(t.messages[0]).toMatchObject({ kind: 'agent-text', text: "Hi, I'm Swipey. I'll help you pick a credit card. It takes a few taps." });
    expect(t.messages[1]).toMatchObject({ kind: 'agent-question', questionId: 'opener', current: true });
    expect(t.reveal).toBeNull();
    expect(t.step?.question.id).toBe('opener');
  });

  it('opener uses why / ask; later questions use the journey wording the user saw', () => {
    const t = build(st({ opener: 'first', history: 'no', need: 'shopping' }), catalogue());
    const q = (id: string) => t.messages.find((m) => m.id === id) as Extract<ChatMessage, { kind: 'agent-question' }>;
    expect(q('q:opener').ask).toBe('What brings you here today?');
    expect(q('q:need').ask).toBe('Where does most of your monthly spend go? Pick up to 3.');
    expect(q('q:need').why).toBe('A card pays back most where you already spend.');
  });

  it('answer texts: option label, Not sure, the form and unknown option id', () => {
    const cards = catalogue();
    const t = build(st({ opener: 'first', history: NOT_SURE, need: 'shopping', upi: 'unknown-id' }), cards);
    const a = (id: string) => (t.messages.find((m) => m.id === id) as Extract<ChatMessage, { kind: 'user-answer' }>).text;
    expect(a('a:opener')).toBe("It's my first credit card");
    expect(a('a:history')).toBe('Not sure');
    expect(a('a:need')).toBe('Online shopping');
    expect(a('a:upi')).toBe('unknown-id');
    const full = build(st(FULL_FIRST), cards);
    const form = full.messages.find((m) => m.id === 'a:eligForm') as Extract<ChatMessage, { kind: 'user-answer' }>;
    expect(form.text).toBe('Salaried · ₹40,000 · 110001');
  });

  it('ids are unique at every prefix of a full run', () => {
    const cards = catalogue();
    const elig = eligibleFor(cards, [0]);
    for (let k = 0; k <= ORDER.length; k++) {
      const ids = build(prefixOf(k), cards, elig).messages.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('full run of journey first: order of kinds; the bridge adds no reveal or note', () => {
    const cards = catalogue();
    const t = build(st(FULL_FIRST), cards, eligibleFor(cards, [0]));
    const ids = t.messages.map((m) => m.id);
    for (const id of ['r:eligBridge', 'n:eligBridge']) {
      expect(ids).not.toContain(id);
    }
    // hello, then (question, answer, reveal?) per answer, then the tail.
    expect(ids.slice(0, 3)).toEqual(['hello', 'q:opener', 'a:opener']);
    expect(ids.slice(3, 5)).toEqual(['k:opener', 'r:opener']);
    expect(ids.indexOf('a:eligBridge')).toBe(ids.indexOf('q:eligBridge') + 1);
    expect(ids.indexOf('q:eligForm')).toBe(ids.indexOf('a:eligBridge') + 2); // k:eligBridge between
    expect(ids.indexOf('a:eligForm')).toBe(ids.indexOf('q:eligForm') + 1);
    expect(ids[ids.indexOf('a:eligForm') + 1]).toBe('k:eligForm');
    expect(ids[ids.indexOf('a:eligForm') + 2]).toBe('r:eligForm');
    expect(kinds(t.messages).filter((k) => k === 'user-answer')).toHaveLength(6);
    expect(t.step).toBeNull();
    expect(t.messages[t.messages.length - 1].id).toBe('closing');
  });

  it('first answer always adds a reveal; exactly one reveal carries cards, the last one', () => {
    const cards = catalogue();
    for (let k = 1; k <= ORDER.length; k++) {
      const t = build(prefixOf(k), cards, eligibleFor(cards, [0]));
      const reveals = t.messages.filter((m) => m.kind === 'agent-reveal') as Array<Extract<ChatMessage, { kind: 'agent-reveal' }>>;
      expect(reveals.length).toBeGreaterThan(0);
      expect(reveals.filter((r) => r.reveal !== undefined)).toHaveLength(1);
      const last = reveals[reveals.length - 1];
      expect(last.reveal).toBe(t.reveal);
      expect(last.header).toBe(t.reveal!.header);
    }
  });

  it('stability: adding one answer keeps every earlier message except the tail', () => {
    const cards = catalogue();
    const elig = eligibleFor(cards, [0]);
    for (let k = 0; k < ORDER.length; k++) {
      const a = build(prefixOf(k), cards, elig);
      const b = build(prefixOf(k + 1), cards, elig);
      const byId = new Map(b.messages.map((m) => [m.id, m]));
      for (const m of a.messages.filter((x) => !isTail(x))) {
        const kept = byId.get(m.id);
        expect(kept).toBeDefined();
        expect(kept!.kind).toBe(m.kind);
        expect(textOf(kept!)).toBe(textOf(m));
      }
      for (const m of a.messages.filter(isTail)) {
        const kept = byId.get(m.id);
        if (kept && kept.kind === 'agent-question') expect(kept.current).toBe(false);
      }
    }
  });

  it('stability holds with the saved-eligibility mode too', () => {
    const cards = catalogue();
    const elig = eligibleFor(cards, [0, 1]);
    const states = [st({ opener: 'first' }), st({ opener: 'first', history: 'no' }), st({ opener: 'first', history: 'no', need: 'shopping' })];
    for (let i = 0; i < states.length - 1; i++) {
      const a = build(states[i], cards, elig, true);
      const b = build(states[i + 1], cards, elig, true);
      const byId = new Map(b.messages.map((m) => [m.id, m]));
      for (const m of a.messages.filter((x) => !isTail(x))) expect(textOf(byId.get(m.id)!)).toBe(textOf(m));
    }
  });

  it('an eligibility result arriving changes no earlier text; it adds only k:eligForm, r:eligForm and the tail', () => {
    const cards = catalogue();
    const before = build(st(FULL_FIRST), cards, null);
    const after = build(st(FULL_FIRST), cards, eligibleFor(cards, [0, 1]));
    const afterById = new Map(after.messages.map((m) => [m.id, m]));
    for (const m of before.messages.filter((x) => !isTail(x))) {
      expect(textOf(afterById.get(m.id)!)).toBe(textOf(m));
    }
    const beforeIds = new Set(before.messages.map((m) => m.id));
    const added = after.messages.filter((m) => !beforeIds.has(m.id) && m.id !== 'closing');
    expect(added.map((m) => m.id)).toEqual(['k:eligForm', 'r:eligForm']);
    expect(added[1].kind).toBe('agent-reveal');
    expect(before.reveal!.proof).not.toBe('likely');
    expect(after.reveal!.proof).toBe('likely');
    expect(after.messages[after.messages.length - 1]).toMatchObject({ id: 'closing' });
  });

  it('a relax note stays on the reveal and is not repeated after later answers', () => {
    // No free fuel card exists here, so "fuel + free only" sets the fee aside.
    const cards = [
      card({ cat: [FUEL], annualFee: 500 }),
      card({ cat: [FUEL], annualFee: 600 }),
      card({ cat: [SHOPPING], isFree: true }),
    ];
    const t = buildTranscript({
      state: st({ opener: 'specific', need: 'fuel', fee: 'free', eligBridge: 'yes', eligForm: FULL_FIRST.eligForm }),
      config: C,
      cards,
      eligibility: null,
      eligibilityKnown: false,
    });
    expect(t.reveal?.dropped.length).toBeGreaterThan(0);
    const notes = t.messages.filter((m) => m.kind === 'agent-text' && m.id.startsWith('n:'));
    expect(notes.every((m) => m.kind === 'agent-text' && m.text.startsWith('Same cards'))).toBe(true);
    expect(notes.length).toBeLessThanOrEqual(1);
  });

  it('closing line depends on proof', () => {
    const cards = catalogue();
    const likely = build(st(FULL_FIRST), cards, eligibleFor(cards, [0]));
    expect(likely.messages[likely.messages.length - 1]).toMatchObject({
      id: 'closing',
      text: 'Apply for one card at a time. Each application is recorded on your credit report.',
    });
    const none = build(st({ ...FULL_FIRST, eligBridge: 'no', eligForm: undefined }), cards, null);
    expect(none.messages[none.messages.length - 1]).toMatchObject({
      id: 'closing',
      text: 'That is my shortlist for now. Pick what to do next.',
    });
  });

  it('eligibilityKnown: first reveal is already likely and the eligibility questions never appear', () => {
    const cards = catalogue();
    const elig = eligibleFor(cards, [0, 1]);
    const t = build(st({ opener: 'first', history: 'no', need: 'shopping', upi: 'daily' }), cards, elig, true);
    const first = t.messages.find((m) => m.id === 'r:opener') as Extract<ChatMessage, { kind: 'agent-reveal' }>;
    expect(first).toBeDefined();
    expect(first.header.startsWith('Cards you are likely to get')).toBe(true);
    const ids = t.messages.map((m) => m.id);
    for (const id of ['q:eligBridge', 'q:eligForm']) expect(ids).not.toContain(id);
    expect(t.step).toBeNull();
    expect(t.reveal!.proof).toBe('likely');
    expect(t.messages[t.messages.length - 1].id).toBe('closing');
  });

  it('a held card is kept out of the reveal and the held list never changes older text', () => {
    const cards = catalogue();
    const a = build(st({ opener: 'first', history: 'no' }), cards);
    const b = build(st({ opener: 'first', history: 'no' }, [cards[0].id]), cards);
    expect(b.reveal!.all.map((c) => c.id)).not.toContain(cards[0].id);
    expect(a.reveal!.all.map((c) => c.id)).toContain(cards[0].id);
  });
});

const idsOf = (t: { messages: ChatMessage[] }) => t.messages.map((m) => m.id);
const textById = (t: { messages: ChatMessage[] }, id: string) => {
  const m = t.messages.find((x) => x.id === id);
  return m && 'text' in m ? m.text : undefined;
};

describe('acknowledgements', () => {
  it('adds k:<id> right after a:<id> and before the reveal', () => {
    const ids = idsOf(build(st({ opener: 'first' }), catalogue()));
    const a = ids.indexOf('a:opener');
    expect(ids[a + 1]).toBe('k:opener');
    expect(ids[a + 2]).toBe('r:opener');
    expect(build(st({ opener: 'first' }), catalogue()).messages[a + 1]).toMatchObject({ kind: 'agent-text' });
  });

  it('NOT_SURE gives the notSureAck text', () => {
    const t = build(st({ opener: 'first', history: NOT_SURE }), catalogue());
    expect(textById(t, 'k:history')).toBe(C.notSureAck);
  });

  it('says nothing when the filters were relaxed', () => {
    const cards = [
      card({ cat: [FUEL], annualFee: 500 }),
      card({ cat: [FUEL], annualFee: 600 }),
      card({ cat: [SHOPPING], isFree: true }),
    ];
    const t = build(st({ opener: 'specific', need: 'fuel', fee: 'free' }), cards);
    expect(t.reveal!.dropped.length).toBeGreaterThan(0);
    expect(idsOf(t)).not.toContain('k:fee');
  });

  it('a filter set aside by an earlier answer does not silence a later answer', () => {
    const cards = [
      card({ cat: [FUEL], annualFee: 500 }),
      card({ cat: [FUEL], annualFee: 600 }),
      card({ cat: [SHOPPING], isFree: true }),
    ];
    const t = build(st({ opener: 'specific', need: 'fuel', fee: 'free', eligBridge: 'no' }), cards);
    expect(t.reveal!.dropped.length).toBeGreaterThan(0);
    expect(idsOf(t)).toContain('a:eligBridge');
    expect(idsOf(t)).not.toContain('k:fee');
    expect(idsOf(t)).toContain('k:eligBridge');
  });

  it('the same-cards line n:<id> shows only when the option has no ack', () => {
    const cards = catalogue();
    // "No history" keeps the first-card filter, so the cards stay the same.
    const tiny = (ack?: string): AdvisorConfig => ({
      ...C,
      questions: {
        ...C.questions,
        history: {
          ...C.questions.history,
          options: C.questions.history.options.map((o) => (o.id === 'no' ? { ...o, ack } : o)),
        },
      },
    });
    const run = (cfg: AdvisorConfig) =>
      idsOf(buildTranscript({ state: st({ opener: 'first', history: 'no' }), config: cfg, cards, eligibility: null, eligibilityKnown: false }));
    expect(run(tiny())).toContain('n:history');
    expect(run(tiny())).not.toContain('k:history');
    expect(run(tiny('No history.'))).toContain('k:history');
    expect(run(tiny('No history.'))).not.toContain('n:history');
    // With the real config the option has an ack, so no n: line.
    const real = idsOf(build(st({ opener: 'first', history: 'no' }), cards));
    expect(real).toContain('k:history');
    expect(real).not.toContain('n:history');
  });

  it('upi ack function: RuPay on top and not', () => {
    const withRupay = build(st({ opener: 'first', history: 'no', need: 'shopping', upi: 'daily' }), catalogue());
    expect(textById(withRupay, 'k:upi')).toMatch(/^UPI daily\. Cards that link to UPI are now on top\.$/);
    const some = build(st({ opener: 'first', history: 'no', need: 'shopping', upi: 'sometimes' }), catalogue());
    expect(textById(some, 'k:upi')).toBe('UPI sometimes. Cards that link to UPI are now on top.');
    const noRupay = [card({ cat: [SHOPPING], isFree: true, newToCredit: true }), card({ cat: [SHOPPING], isFree: true, newToCredit: true })];
    const t = build(st({ opener: 'first', history: 'no', need: 'shopping', upi: 'daily' }), noRupay);
    expect(textById(t, 'k:upi')).toBe('None of these link to UPI, so the order stays.');
  });

  it('eligForm: none without a result, count lines with a likely result, none with a note or not likely', () => {
    const cards = catalogue();
    expect(idsOf(build(st(FULL_FIRST), cards, null))).not.toContain('k:eligForm');
    expect(textById(build(st(FULL_FIRST), cards, eligibleFor(cards, [0])), 'k:eligForm')).toBe('1 card fits your income and pincode.');
    const many = build(st(FULL_FIRST), cards, eligibleFor(cards, [0, 1, 2]));
    expect(textById(many, 'k:eligForm')).toBe(`${many.reveal!.total} cards fit your income and pincode.`);
    expect(many.reveal!.total).toBeGreaterThan(1);
    // Result that matches no card: the reveal has a note and is not likely.
    const none = build(st(FULL_FIRST), cards, { eligibleAliases: ['nope'], incomeMonthly: 40000 });
    expect(none.reveal!.proof).not.toBe('likely');
    expect(idsOf(none)).not.toContain('k:eligForm');
  });

  it('eligForm: the self-employed line without a likely result; the count line wins with one; no ack when not earning', () => {
    const cards = catalogue();
    const self = st({ ...FULL_FIRST, eligForm: encodeEligForm({ job: 'self', incomeMonthly: 120000, pincode: '400001' }) });
    expect(textById(build(self, cards, null), 'k:eligForm')).toBe(
      'Self-employed. Banks use a different income rule, and I check against that one.',
    );
    expect(textById(build(self, cards, eligibleFor(cards, [0])), 'k:eligForm')).toBe('1 card fits your income and pincode.');
    const none = st({ ...FULL_FIRST, eligForm: encodeEligForm({ job: 'none' }) });
    expect(idsOf(build(none, cards, eligibleFor(cards, [0])))).not.toContain('k:eligForm');
    expect(build(none, cards, eligibleFor(cards, [0])).reveal!.proof).not.toBe('likely');
  });

  it('multi answer: multiAck for 2 picks, the option ack for 1 pick', () => {
    const cards = [card({ cat: [SHOPPING] }), card({ cat: [FUEL] }), card({ cat: [SHOPPING, FUEL] })];
    const two = build(st({ opener: 'specific', need: 'shopping,fuel' }), cards);
    expect(textById(two, 'k:need')).toBe('Online shopping and fuel. Cards strong in more than one come first.');
    const one = build(st({ opener: 'specific', need: 'fuel' }), cards);
    expect(textById(one, 'k:need')).toBe('Fuel. These pay back the most at the pump.');
  });

  it('multiAck for 3 picks', () => {
    const ctx = { slots: { categoryTagIds: [SHOPPING, FUEL, 12] } } as never;
    expect(C.questions.need.multiAck?.(['Online shopping', 'Fuel', 'Travel'], ctx)).toBe(
      'Online shopping, fuel and travel. Cards strong in more than one come first.',
    );
  });

  it('multiAck: the ranking line only with 2+ categories; lower case unless an acronym', () => {
    const cards = [card({ cat: [FUEL], isFree: true, network: 'RuPay' }), card({ cat: [14], isFree: true }), card({ cat: [SHOPPING] })];
    expect(textById(build(st({ opener: 'specific', need: 'fuel,nofees' }), cards), 'k:need')).toBe('Fuel and no fees.');
    expect(textById(build(st({ opener: 'specific', need: 'fuel,upi' }), cards), 'k:need')).toBe('Fuel and UPI.');
    expect(textById(build(st({ opener: 'specific', need: 'bills,nofees' }), cards), 'k:need')).toBe('Bills and no fees.');
    const one = { slots: { categoryTagIds: [FUEL] } } as never;
    expect(C.questions.need.multiAck?.(['Online shopping', 'UPI', 'No fees'], one)).toBe('Online shopping, UPI and no fees.');
  });

  it('the skip rule holds for a multi answer whose categories were set aside', () => {
    const cards = [card({ cat: [SHOPPING] }), card({ cat: [SHOPPING] })];
    const t = build(st({ opener: 'specific', need: 'fuel,travel' }), cards);
    expect(t.reveal!.dropped).toContain('categoryTagIds');
    expect(idsOf(t)).toContain('a:need');
    expect(idsOf(t)).not.toContain('k:need');
  });
});

describe('tips', () => {
  const tipIds = (t: { messages: ChatMessage[] }) => idsOf(t).filter((id) => id.startsWith('t:'));

  it('payfull only in journey first, right after history', () => {
    const t = build(st({ opener: 'first', history: 'no' }), catalogue());
    const ids = idsOf(t);
    expect(ids).toContain('t:payfull');
    expect(ids.indexOf('t:payfull')).toBeGreaterThan(ids.indexOf('r:history') >= 0 ? ids.indexOf('r:history') : ids.indexOf('a:history'));
    expect(t.messages.find((m) => m.id === 't:payfull')).toMatchObject({ kind: 'agent-tip' });
    expect(tipIds(build(st({ opener: 'better', missing: 'travel' }), catalogue()))).not.toContain('t:payfull');
  });

  it('caps after need in journey specific with a category, once', () => {
    const t = build(st({ opener: 'specific', need: 'shopping' }), catalogue());
    expect(tipIds(t).filter((id) => id === 't:caps')).toHaveLength(1);
    expect(idsOf(t).indexOf('t:caps')).toBeGreaterThan(idsOf(t).indexOf('a:need'));
    expect(tipIds(build(st({ opener: 'specific', need: 'everything' }), catalogue()))).not.toContain('t:caps');
    expect(tipIds(build(st({ opener: 'first', history: 'no', need: 'shopping' }), catalogue()))).not.toContain('t:caps');
  });

  it('caps is not shown twice when missing and need could both show it', () => {
    const t = build(st({ opener: 'better', missing: 'shopping', need: 'shopping' }), catalogue());
    expect(tipIds(t).filter((id) => id === 't:caps')).toHaveLength(1);
    const ids = idsOf(t);
    expect(ids.indexOf('t:caps')).toBeGreaterThan(ids.indexOf('a:missing'));
  });

  it('ltf sits right before the fee question, current and answered', () => {
    const current = build(st({ opener: 'specific', need: 'shopping' }), catalogue());
    const ids = idsOf(current);
    expect(ids[ids.length - 2]).toBe('t:ltf');
    expect(ids[ids.length - 1]).toBe('q:fee');
    const answered = idsOf(build(st({ opener: 'specific', need: 'shopping', fee: 'any' }), catalogue()));
    expect(answered[answered.indexOf('q:fee') - 1]).toBe('t:ltf');
    expect(answered.filter((id) => id === 't:ltf')).toHaveLength(1);
  });

  it('softcheck before the bridge, and before the form on the explore approved path, never twice', () => {
    const bridge = idsOf(build(st({ opener: 'specific', need: 'shopping', fee: 'any' }), catalogue()));
    expect(bridge[bridge.length - 2]).toBe('t:softcheck');
    expect(bridge[bridge.length - 1]).toBe('q:eligBridge');
    const approved = idsOf(build(st({ opener: 'explore', matters: 'approved' }), catalogue()));
    expect(approved[approved.length - 2]).toBe('t:softcheck');
    expect(approved[approved.length - 1]).toBe('q:eligForm');
    const both = idsOf(build(st({ opener: 'specific', need: 'shopping', fee: 'any', eligBridge: 'yes' }), catalogue()));
    expect(both.filter((id) => id === 't:softcheck')).toHaveLength(1);
    expect(both[both.indexOf('q:eligBridge') - 1]).toBe('t:softcheck');
  });

  it('wait only with a result that is not likely', () => {
    const cards = catalogue();
    expect(tipIds(build(st(FULL_FIRST), cards, null))).not.toContain('t:wait');
    expect(tipIds(build(st(FULL_FIRST), cards, eligibleFor(cards, [0])))).not.toContain('t:wait');
    const none = build(st(FULL_FIRST), cards, { eligibleAliases: ['nope'], incomeMonthly: 40000 });
    expect(tipIds(none)).toContain('t:wait');
    const ids = idsOf(none);
    expect(ids.indexOf('t:wait')).toBeGreaterThan(ids.indexOf('a:eligForm'));
    expect(ids.indexOf('t:wait')).toBeGreaterThan(ids.indexOf('r:eligForm'));
  });

  it('ids stay unique at every prefix and history is stable with the new kinds', () => {
    const cards = catalogue();
    for (const elig of [null, eligibleFor(cards, [0]), { eligibleAliases: ['nope'], incomeMonthly: 40000 }]) {
      for (let k = 0; k < ORDER.length; k++) {
        const a = build(prefixOf(k), cards, elig);
        const b = build(prefixOf(k + 1), cards, elig);
        expect(new Set(idsOf(b)).size).toBe(idsOf(b).length);
        const byId = new Map(b.messages.map((m) => [m.id, m]));
        for (const m of a.messages.filter((x) => !isTail(x))) {
          expect(textOf(byId.get(m.id)!)).toBe(textOf(m));
        }
      }
    }
  });
});

describe('rewindAnswers', () => {
  const full = st(FULL_FIRST, ['h1']);

  it('removes the answer and every later one, keeps earlier ones and held', () => {
    const r = rewindAnswers(full, C, 'upi');
    expect(r.answers).toEqual({ opener: 'first', history: 'no', need: 'shopping' });
    expect(r.held).toEqual(['h1']);
  });

  it('rewinding the form removes only the form answer', () => {
    const r = rewindAnswers(full, C, 'eligForm');
    expect(r.answers).toEqual({ opener: 'first', history: 'no', need: 'shopping', upi: 'daily', eligBridge: 'yes' });
  });

  it('rewinding the opener clears everything including held', () => {
    expect(rewindAnswers(full, C, 'opener')).toEqual({ answers: {}, held: [] });
  });

  it('an unanswered question returns the state unchanged', () => {
    const s = st({ opener: 'first' });
    expect(rewindAnswers(s, C, 'history')).toBe(s);
  });

  it('drops answers of questions that are not active', () => {
    // upi is not active for journey specific with a category need (stale answer).
    const s = st({ opener: 'specific', need: 'shopping', upi: 'daily', fee: 'any', eligBridge: 'yes' });
    const r = rewindAnswers(s, C, 'eligBridge');
    expect(r.answers).toEqual({ opener: 'specific', need: 'shopping', fee: 'any' });
  });

  it('does not mutate the input', () => {
    const s = st(FULL_FIRST, ['h1']);
    const copy = JSON.parse(JSON.stringify(s));
    rewindAnswers(s, C, 'need');
    rewindAnswers(s, C, 'opener');
    expect(s).toEqual(copy);
  });

  it('the rewound transcript is a prefix of the old one (before the tail)', () => {
    const cards = catalogue();
    const old = build(full, cards, null);
    const rewound = build(rewindAnswers(full, C, 'upi'), cards, null);
    const oldIds = new Set(old.messages.map((m) => m.id));
    for (const m of rewound.messages.filter((x) => !isTail(x))) expect(oldIds.has(m.id)).toBe(true);
  });
});

describe('answeredList, lastAnswered, answersLost', () => {
  const count = (s: AdvisorState) => Object.values(s.answers).filter((v) => v !== undefined).length;

  it('lists the answers in asking order with the journey wording', () => {
    const list = answeredList(prefixOf(5), C);
    expect(list.map((x) => x.questionId)).toEqual(['opener', 'history', 'need', 'upi', 'eligBridge']);
    // Journey 'first' uses askFirst where a question has one.
    expect(list[4]).toEqual({
      questionId: 'eligBridge',
      ask: C.questions.eligBridge.askFirst,
      text: 'Yes, check',
    });
    expect(list[0].ask).toBe(C.questions.opener.ask);
  });

  it('uses the plain wording outside journey first, and the bubble text', () => {
    const s = st({ opener: 'specific', need: 'shopping', fee: 'free', eligBridge: 'no' });
    const list = answeredList(s, C);
    expect(list.map((x) => x.questionId)).toEqual(['opener', 'need', 'fee', 'eligBridge']);
    expect(list[3].ask).toBe(C.questions.eligBridge.ask);
    expect(list[3].text).toBe('Not now');
    expect(list[2].text).toBe('Free cards only');
  });

  it('shows "Not sure" and the form text as the answer text', () => {
    const list = answeredList(st({ ...FULL_FIRST, upi: NOT_SURE }), C);
    expect(list.find((x) => x.questionId === 'upi')?.text).toBe('Not sure');
    expect(list.find((x) => x.questionId === 'eligForm')).toEqual({
      questionId: 'eligForm',
      ask: C.questions.eligForm.ask,
      text: 'Salaried · ₹40,000 · 110001',
    });
  });

  it('answer text for a multi answer and for the three form shapes', () => {
    const multi = answeredList(st({ opener: 'specific', need: 'fuel,shopping' }), C);
    expect(multi.find((x) => x.questionId === 'need')?.text).toBe('Online shopping, Fuel');
    const text = (form: string) =>
      answeredList(st({ opener: 'specific', need: 'fuel', fee: 'any', eligBridge: 'yes', eligForm: form }), C).slice(-1)[0].text;
    expect(text(encodeEligForm({ job: 'salaried', incomeMonthly: 35000, pincode: '110001' }))).toBe('Salaried · ₹35,000 · 110001');
    expect(text(encodeEligForm({ job: 'self', incomeMonthly: 120000, pincode: '400001' }))).toBe('Self-employed · ₹1,20,000 · 400001');
    expect(text(encodeEligForm({ job: 'none' }))).toBe('Not earning yet');
  });

  it('does not list an answered question that is not active', () => {
    const s = st({ opener: 'specific', need: 'shopping', upi: 'daily', fee: 'any' });
    expect(answeredList(s, C).map((x) => x.questionId)).toEqual(['opener', 'need', 'fee']);
    expect(lastAnswered(s, C)).toBe('fee');
  });

  it('lastAnswered is the last answer in asking order, or null', () => {
    expect(lastAnswered(st({}), C)).toBeNull();
    expect(lastAnswered(prefixOf(1), C)).toBe('opener');
    expect(lastAnswered(prefixOf(6), C)).toBe('eligForm');
    expect(lastAnswered(st({ opener: 'explore', matters: 'travel' }), C)).toBe(
      answeredList(st({ opener: 'explore', matters: 'travel' }), C).slice(-1)[0].questionId,
    );
  });

  it('answersLost equals the real drop in answer count after rewindAnswers', () => {
    const states = [
      st(FULL_FIRST, ['h1']),
      prefixOf(4),
      st({ opener: 'specific', need: 'shopping', upi: 'daily', fee: 'any', eligBridge: 'yes' }),
      st({ opener: 'better', missing: 'travel' }),
    ];
    for (const s of states) {
      for (const id of Object.keys(C.questions) as QuestionId[]) {
        expect(answersLost(s, C, id)).toBe(count(s) - count(rewindAnswers(s, C, id)));
      }
    }
  });

  it('answersLost counts that answer and every later one; all for the opener; 0 when not answered', () => {
    const full = st(FULL_FIRST);
    expect(answersLost(full, C, 'eligForm')).toBe(1);
    expect(answersLost(full, C, 'eligBridge')).toBe(2);
    expect(answersLost(full, C, 'upi')).toBe(3);
    expect(answersLost(full, C, 'opener')).toBe(6);
    expect(answersLost(prefixOf(2), C, 'need')).toBe(0);
  });
});

describe('avatarStateFor', () => {
  const none: AvatarSignals = {
    catalogueError: false,
    eligibilityError: false,
    eligibilityFetching: false,
    messageArriving: false,
    justFoundLikely: false,
    waitingForAnswer: false,
  };
  const s = (o: Partial<AvatarSignals>) => avatarStateFor({ ...none, ...o });

  it('maps each signal', () => {
    expect(s({})).toBe('idle');
    expect(s({ waitingForAnswer: true })).toBe('listening');
    expect(s({ messageArriving: true })).toBe('speaking');
    expect(s({ justFoundLikely: true })).toBe('success');
    expect(s({ eligibilityFetching: true })).toBe('thinking');
    expect(s({ catalogueError: true })).toBe('error');
    expect(s({ eligibilityError: true })).toBe('error');
  });

  it('priority clashes: error beats all, thinking beats success, success beats speaking and listening', () => {
    expect(
      s({ catalogueError: true, eligibilityFetching: true, justFoundLikely: true, messageArriving: true, waitingForAnswer: true }),
    ).toBe('error');
    expect(s({ eligibilityFetching: true, justFoundLikely: true })).toBe('thinking');
    expect(s({ justFoundLikely: true, messageArriving: true, waitingForAnswer: true })).toBe('success');
    expect(s({ messageArriving: true, waitingForAnswer: true })).toBe('speaking');
  });
});
