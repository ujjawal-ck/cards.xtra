/**
 * Card advisor config: the questions, their options and the order each
 * journey asks them in. The engine (engine.ts) reads only this object, so a
 * wording or order change needs no engine change. Contract: types.ts.
 */
import { cardNetworks } from '../../data/filterOptions';
import type { AckContext, AdvisorConfig } from './types';

// BankKaro category tag ids (CATEGORY_OPTIONS in data/filterOptions).
const TAG = {
  fuel: 1,
  shopping: 2,
  foodOrdering: 5,
  dining: 6,
  grocery: 7,
  travel: 12,
  bills: 14,
} as const;

const none = (list: number[] | undefined) => (list ?? []).length === 0;

/** A label after the first starts in lower case, unless it is an acronym ("UPI"). */
const lowerFirst = (label: string) =>
  label.length > 1 && label[1] === label[1].toUpperCase() && label[1] !== label[1].toLowerCase()
    ? label
    : label.charAt(0).toLowerCase() + label.slice(1);

/** "{A} and {B}." or "{A}, {B} and {C}.". The ranking line shows only with 2 or more categories. */
const strongInMore = (labels: string[], ctx: AckContext) => {
  const [first, ...rest] = labels;
  const tail = rest.map(lowerFirst);
  const list = tail.length === 0 ? first : `${[first, ...tail.slice(0, -1)].join(', ')} and ${tail[tail.length - 1]}`;
  const many = (ctx.slots.categoryTagIds ?? []).length >= 2;
  return many ? `${list}. Cards strong in more than one come first.` : `${list}.`;
};

export const ADVISOR_CONFIG: AdvisorConfig = {
  version: 2,
  notSureAck: "No problem. I'll skip that.",
  tips: [
    {
      id: 'payfull',
      after: 'history',
      text: 'Your first card builds your credit score. Paying the full bill on time matters most.',
      when: ({ slots }) => slots.journey === 'first',
    },
    {
      id: 'caps',
      after: 'need',
      text: 'Most cards cap cashback each month. Check the cap, not only the percent.',
      when: ({ slots }) => slots.journey !== 'first' && !none(slots.categoryTagIds),
    },
    {
      id: 'caps',
      after: 'missing',
      text: 'Most cards cap cashback each month. Check the cap, not only the percent.',
      when: ({ slots }) => !none(slots.categoryTagIds),
    },
    {
      id: 'ltf',
      before: 'fee',
      text: 'Lifetime free means no joining fee and no annual fee. First year free is not the same.',
    },
    {
      id: 'softcheck',
      before: 'eligBridge',
      text: 'This check uses only how you earn, your income and your pincode. It does not touch your credit report.',
    },
    {
      id: 'softcheck',
      before: 'eligForm',
      text: 'This check uses only how you earn, your income and your pincode. It does not touch your credit report.',
    },
    {
      id: 'wait',
      after: 'eligForm',
      text: 'If a bank says no, wait before you apply again. Many applications close together can lower your score.',
      when: ({ reveal, eligibilityApplied }) => eligibilityApplied && reveal?.proof !== 'likely',
    },
  ],
  journeys: {
    first: ['history', 'need', 'foodType', 'upi', 'eligBridge', 'eligForm'],
    better: ['missing', 'need', 'foodType', 'fee', 'eligBridge', 'eligForm'],
    specific: ['need', 'foodType', 'upi', 'fee', 'eligBridge', 'eligForm'],
    explore: ['matters', 'need', 'foodType', 'eligBridge', 'eligForm'],
  },
  questions: {
    opener: {
      id: 'opener',
      kind: 'choice',
      notSure: false,
      filters: false,
      why: "I'll show cards after your first answer, then sharpen them.",
      ask: 'What brings you here today?',
      options: [
        {
          id: 'first',
          label: "It's my first credit card",
          pill: 'First card',
          set: { journey: 'first', fee: 'free', feeSource: 'default' },
          ack: "First card. I'll start with free cards that are easy to get. Free here means no joining fee and no annual fee.",
        },
        { id: 'better', label: 'I have a card and want a better one', pill: 'Want a better card', set: { journey: 'better' }, ack: 'A better card. Here are popular picks to start.' },
        { id: 'specific', label: 'I need a card for something specific', pill: 'Something specific', set: { journey: 'specific' }, ack: 'Something specific. Here are popular cards while you tell me more.' },
        { id: 'explore', label: 'Just exploring', set: { journey: 'explore' }, ack: 'Just exploring. Here are popular cards, no pressure.' },
      ],
    },
    history: {
      id: 'history',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: 'Banks look at your credit history before approving a card.',
      ask: 'Have you ever used pay-later, bought on EMI, or taken a loan?',
      options: [
        { id: 'yes', label: 'Yes', pill: 'Has credit history', set: { hasHistory: true }, ack: 'With some history you have more options than most first-timers.' },
        { id: 'no', label: 'No', pill: 'No credit history', set: { hasHistory: false }, ack: 'No history is fine. Every card here takes first-time applicants.' },
      ],
    },
    missing: {
      id: 'missing',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: "The best next card covers what your current one doesn't.",
      ask: 'What do you wish your card did better? Pick up to 3.',
      multi: { max: 3 },
      multiAck: strongInMore,
      options: [
        { id: 'daily', label: 'More back on daily spends', pill: 'Daily spends', set: { askNeed: true }, ack: "Daily spends. Let's find where most of it goes." },
        { id: 'travel', label: 'Travel perks', set: { categoryTagId: TAG.travel }, ack: 'Travel perks. These are strong on travel.' },
        { id: 'lowerFees', label: 'Lower fees', set: { sortByFee: true, skipNeed: true }, ack: 'Lower fees. Cheapest cards first.' },
        { id: 'shopping', label: 'More on online shopping', pill: 'Online shopping', set: { categoryTagId: TAG.shopping }, ack: 'Online shopping. These pay back the most there.' },
        { id: 'better', label: 'Just show me better ones', pill: 'Better cards', set: { skipNeed: true }, exclusive: true, ack: 'Showing the most popular cards.' },
      ],
    },
    matters: {
      id: 'matters',
      kind: 'choice',
      notSure: false,
      filters: false,
      why: 'No pressure. One answer can narrow these down.',
      ask: 'What matters most to you?',
      options: [
        { id: 'saving', label: 'Saving on my spends', set: {}, ack: "Saving on spends. Let's find where most of it goes." },
        { id: 'travel', label: 'Travel perks', set: { categoryTagId: TAG.travel }, ack: 'Travel perks. These are strong on travel.' },
        { id: 'nofees', label: 'No fees', set: { fee: 'free', feeSource: 'user', skipNeed: true }, ack: 'No fees. Every card here has no joining fee and no annual fee.' },
        {
          id: 'approved',
          label: 'Getting approved easily',
          pill: 'Easy approval',
          set: { wantsEligibility: true, skipNeed: true },
          ack: 'Easy approval. One short form and I can check.',
        },
        { id: 'browse', label: "I'm just browsing", pill: 'Browsing', set: { skipNeed: true }, ack: 'Browse away. Tap a card to see its details.' },
      ],
    },
    need: {
      id: 'need',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Most cards are strong in one or two areas.',
      ask: 'What do you want the card for? Pick up to 3.',
      whyFirst: 'A card pays back most where you already spend.',
      askFirst: 'Where does most of your monthly spend go? Pick up to 3.',
      multi: { max: 3 },
      multiAck: strongInMore,
      options: [
        { id: 'shopping', label: 'Online shopping', set: { categoryTagId: TAG.shopping }, ack: 'Online shopping. These pay back the most there.' },
        { id: 'food', label: 'Food and groceries', pill: 'Food', set: { categoryTagId: TAG.foodOrdering }, ack: 'Food and groceries. One more question narrows it.' },
        { id: 'fuel', label: 'Fuel', set: { categoryTagId: TAG.fuel }, ack: 'Fuel. These pay back the most at the pump.' },
        { id: 'bills', label: 'Bills and recharges', pill: 'Bills', set: { categoryTagId: TAG.bills }, ack: 'Bills and recharges. These pay back the most there.' },
        { id: 'travel', label: 'Travel', set: { categoryTagId: TAG.travel }, ack: 'Travel. These are strong on travel.' },
        { id: 'upi', label: 'UPI payments', pill: 'UPI', set: { network: 'RuPay' }, ack: 'UPI payments. Only RuPay credit cards link to UPI, so these are all RuPay.' },
        {
          id: 'nofees',
          label: 'No fees at all',
          pill: 'No fees',
          set: { fee: 'free', feeSource: 'user' },
          hideWhen: (s) => s.fee === 'free',
          ack: 'No fees. Every card here has no joining fee and no annual fee.',
        },
        { id: 'everything', label: 'A bit of everything', pill: 'Everything', set: {}, exclusive: true, ack: "A bit of everything. I'll keep the popular picks." },
      ],
      when: (s) => (none(s.categoryTagIds) || s.askNeed === true) && s.network === undefined && !s.skipNeed,
    },
    foodType: {
      id: 'foodType',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Cards treat these three differently.',
      ask: 'Which of these do you spend on? Pick one or more.',
      multi: { max: 3 },
      replacesCategory: TAG.foodOrdering,
      multiAck: strongInMore,
      options: [
        { id: 'delivery', label: 'Food delivery', set: { categoryTagId: TAG.foodOrdering }, ack: 'Food delivery. These pay back the most on delivery apps.' },
        { id: 'dining', label: 'Eating out', set: { categoryTagId: TAG.dining }, ack: 'Eating out. These pay back the most at restaurants.' },
        { id: 'grocery', label: 'Groceries and quick commerce', pill: 'Groceries', set: { categoryTagId: TAG.grocery }, ack: 'Groceries. These pay back the most on grocery and quick commerce.' },
      ],
      when: (s) => s.categoryTagIds?.includes(TAG.foodOrdering) === true,
    },
    upi: {
      id: 'upi',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: 'RuPay credit cards can be linked to UPI, so small daily spends earn rewards too.',
      ask: 'Do you pay by UPI at shops often?',
      options: [
        { id: 'daily', label: 'Yes, daily', pill: 'UPI daily', set: { upi: 'daily' },
          ack: ({ reveal }) =>
            reveal.top.some((t) => cardNetworks(t.card.filterMeta?.network).includes('rupay'))
              ? 'UPI daily. Cards that link to UPI are now on top.'
              : 'None of these link to UPI, so the order stays.',
        },
        { id: 'sometimes', label: 'Sometimes', pill: 'UPI sometimes', set: { upi: 'sometimes' },
          ack: ({ reveal }) =>
            reveal.top.some((t) => cardNetworks(t.card.filterMeta?.network).includes('rupay'))
              ? 'UPI sometimes. Cards that link to UPI are now on top.'
              : 'None of these link to UPI, so the order stays.',
        },
        { id: 'rarely', label: 'Rarely', pill: 'UPI rarely', set: { upi: 'rarely' }, ack: "Rarely. I'll leave UPI out of it." },
      ],
      when: (s) => s.network === undefined && (s.journey === 'first' || s.categoryTagIds?.includes(TAG.bills) === true),
    },
    fee: {
      id: 'fee',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Paid cards usually give more back. Many waive the fee if you spend enough.',
      ask: 'How do you feel about an annual fee?',
      options: [
        { id: 'free', label: 'Free cards only', pill: 'Free only', set: { fee: 'free', feeSource: 'user' }, ack: 'Free cards only. No joining fee and no annual fee.' },
        { id: 'upto1000', label: 'Up to ₹1,000 a year', set: { fee: 'upto1000', feeSource: 'user' }, ack: 'Up to ₹1,000 a year. Free cards stay in.' },
        { id: 'upto5000', label: 'Up to ₹5,000 a year', set: { fee: 'upto5000', feeSource: 'user' }, ack: 'Up to ₹5,000 a year. Free cards stay in.' },
        { id: 'any', label: 'Any fee, if the card earns it back', pill: 'Any fee', set: { fee: 'any', feeSource: 'user' }, ack: "Any fee. I'll show the full range." },
      ],
      when: (s) => s.fee === undefined,
    },
    eligBridge: {
      id: 'eligBridge',
      kind: 'choice',
      notSure: false,
      filters: false,
      why: "I check your income and pincode against each card's rules. The bank still makes the final decision.",
      ask: 'Want me to keep only the cards you qualify for?',
      askFirst: "Want me to check which of these you're likely to get?",
      options: [
        { id: 'yes', label: 'Yes, check', pill: '', set: { wantsEligibility: true }, ack: 'One short form: how you earn, your income and your pincode.' },
        { id: 'no', label: 'Not now', pill: '', set: { wantsEligibility: false }, ack: "No problem. You can check from any card's page later." },
      ],
      when: (s) => s.wantsEligibility === undefined,
    },
    eligForm: {
      id: 'eligForm',
      kind: 'eligibility',
      notSure: false,
      filters: false,
      why: 'Banks set income rules by how you earn, and deliver to some pincodes only.',
      ask: 'Tell me how you earn, your monthly income and your pincode.',
      options: [],
      when: (s) => s.wantsEligibility === true,
    },
  },
};
