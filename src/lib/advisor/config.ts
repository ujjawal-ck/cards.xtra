/**
 * Card advisor config: the questions, their options and the order each
 * journey asks them in. The engine (engine.ts) reads only this object, so a
 * wording or order change needs no engine change. Contract: types.ts.
 */
import type { AdvisorConfig, AdvisorSlots } from './types';

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

const earns = (s: AdvisorSlots) => s.job === 'salaried' || s.job === 'self-employed';

export const ADVISOR_CONFIG: AdvisorConfig = {
  version: 1,
  journeys: {
    first: ['history', 'need', 'foodType', 'upi', 'eligBridge', 'job', 'income', 'pincode'],
    better: ['missing', 'need', 'foodType', 'fee', 'eligBridge', 'job', 'income', 'pincode'],
    specific: ['need', 'foodType', 'upi', 'fee', 'eligBridge', 'job', 'income', 'pincode'],
    explore: ['matters', 'need', 'foodType', 'eligBridge', 'job', 'income', 'pincode'],
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
        },
        { id: 'better', label: 'I have a card and want a better one', pill: 'Want a better card', set: { journey: 'better' } },
        { id: 'specific', label: 'I need a card for something specific', pill: 'Something specific', set: { journey: 'specific' } },
        { id: 'explore', label: 'Just exploring', set: { journey: 'explore' } },
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
        { id: 'yes', label: 'Yes', pill: 'Has credit history', set: { hasHistory: true } },
        { id: 'no', label: 'No', pill: 'No credit history', set: { hasHistory: false } },
      ],
    },
    missing: {
      id: 'missing',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: "The best next card covers what your current one doesn't.",
      ask: 'What do you wish your card did better?',
      options: [
        { id: 'daily', label: 'More back on daily spends', pill: 'Daily spends', set: {} },
        { id: 'travel', label: 'Travel perks', set: { categoryTagId: TAG.travel } },
        { id: 'lowerFees', label: 'Lower fees', set: { sortByFee: true, skipNeed: true } },
        { id: 'shopping', label: 'More on online shopping', pill: 'Online shopping', set: { categoryTagId: TAG.shopping } },
        { id: 'better', label: 'Just show me better ones', pill: 'Better cards', set: { skipNeed: true } },
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
        { id: 'saving', label: 'Saving on my spends', set: {} },
        { id: 'travel', label: 'Travel perks', set: { categoryTagId: TAG.travel } },
        { id: 'nofees', label: 'No fees', set: { fee: 'free', feeSource: 'user', skipNeed: true } },
        {
          id: 'approved',
          label: 'Getting approved easily',
          pill: 'Easy approval',
          set: { wantsEligibility: true, skipNeed: true },
        },
        { id: 'browse', label: "I'm just browsing", pill: 'Browsing', set: { skipNeed: true } },
      ],
    },
    need: {
      id: 'need',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Most cards are strong in one or two areas.',
      ask: 'What do you want the card for?',
      whyFirst: 'A card pays back most where you already spend.',
      askFirst: 'Where does most of your monthly spend go?',
      options: [
        { id: 'shopping', label: 'Online shopping', set: { categoryTagId: TAG.shopping } },
        { id: 'food', label: 'Food and groceries', pill: 'Food', set: { categoryTagId: TAG.foodOrdering } },
        { id: 'fuel', label: 'Fuel', set: { categoryTagId: TAG.fuel } },
        { id: 'bills', label: 'Bills and recharges', pill: 'Bills', set: { categoryTagId: TAG.bills } },
        { id: 'travel', label: 'Travel', set: { categoryTagId: TAG.travel } },
        { id: 'upi', label: 'UPI payments', pill: 'UPI', set: { network: 'RuPay' } },
        {
          id: 'nofees',
          label: 'No fees at all',
          pill: 'No fees',
          set: { fee: 'free', feeSource: 'user' },
          hideWhen: (s) => s.fee === 'free',
        },
        { id: 'everything', label: 'A bit of everything', pill: 'Everything', set: {} },
      ],
      when: (s) => s.categoryTagId === undefined && s.network === undefined && !s.skipNeed,
    },
    foodType: {
      id: 'foodType',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Cards treat these three differently.',
      ask: 'Which is biggest for you?',
      options: [
        { id: 'delivery', label: 'Food delivery', set: { categoryTagId: TAG.foodOrdering } },
        { id: 'dining', label: 'Eating out', set: { categoryTagId: TAG.dining } },
        { id: 'grocery', label: 'Groceries and quick commerce', pill: 'Groceries', set: { categoryTagId: TAG.grocery } },
      ],
      when: (s) => s.categoryTagId === TAG.foodOrdering,
    },
    upi: {
      id: 'upi',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: 'RuPay credit cards can be linked to UPI, so small daily spends earn rewards too.',
      ask: 'Do you pay by UPI at shops often?',
      options: [
        { id: 'daily', label: 'Yes, daily', pill: 'UPI daily', set: { upi: 'daily' } },
        { id: 'sometimes', label: 'Sometimes', pill: 'UPI sometimes', set: { upi: 'sometimes' } },
        { id: 'rarely', label: 'Rarely', pill: 'UPI rarely', set: { upi: 'rarely' } },
      ],
      when: (s) => s.network === undefined && (s.journey === 'first' || s.categoryTagId === TAG.bills),
    },
    fee: {
      id: 'fee',
      kind: 'choice',
      notSure: true,
      filters: true,
      why: 'Paid cards usually give more back. Many waive the fee if you spend enough.',
      ask: 'How do you feel about an annual fee?',
      options: [
        { id: 'free', label: 'Free cards only', pill: 'Free only', set: { fee: 'free', feeSource: 'user' } },
        { id: 'upto1000', label: 'Up to ₹1,000 a year', set: { fee: 'upto1000', feeSource: 'user' } },
        { id: 'upto5000', label: 'Up to ₹5,000 a year', set: { fee: 'upto5000', feeSource: 'user' } },
        { id: 'any', label: 'Any fee, if the card earns it back', pill: 'Any fee', set: { fee: 'any', feeSource: 'user' } },
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
        { id: 'yes', label: 'Yes, check', pill: '', set: { wantsEligibility: true } },
        { id: 'no', label: 'Not now', pill: '', set: { wantsEligibility: false } },
      ],
      when: (s) => s.wantsEligibility === undefined,
    },
    job: {
      id: 'job',
      kind: 'choice',
      notSure: false,
      filters: false,
      why: 'Banks set different income rules by how you earn.',
      ask: 'How do you earn?',
      options: [
        { id: 'salaried', label: 'Salaried', set: { job: 'salaried' } },
        { id: 'self', label: 'Self-employed or business', pill: 'Self-employed', set: { job: 'self-employed' } },
        { id: 'none', label: 'Student or not earning yet', pill: 'Not earning yet', set: { job: 'not-earning' } },
      ],
      when: (s) => s.wantsEligibility === true,
    },
    income: {
      id: 'income',
      kind: 'choice',
      notSure: true,
      filters: false,
      why: 'Each card has a minimum income set by the bank.',
      ask: 'What is your monthly in-hand income?',
      // Each option stores the BOTTOM of its band on purpose: a false
      // "likely to qualify" is the worst outcome.
      options: [
        { id: 'u20', label: 'Under ₹20,000', set: { incomeMonthly: 15000 } },
        { id: '20to40', label: '₹20,000 to ₹40,000', set: { incomeMonthly: 20000 } },
        { id: '40to75', label: '₹40,000 to ₹75,000', set: { incomeMonthly: 40000 } },
        { id: '75to150', label: '₹75,000 to ₹1.5 lakh', set: { incomeMonthly: 75000 } },
        { id: '150plus', label: 'Above ₹1.5 lakh', set: { incomeMonthly: 150000 } },
      ],
      when: (s) => s.wantsEligibility === true && earns(s),
    },
    pincode: {
      id: 'pincode',
      kind: 'pincode',
      notSure: false,
      filters: false,
      why: 'Banks deliver to some pincodes and not others.',
      ask: 'Which pincode should the card come to?',
      options: [],
      when: (s) => s.wantsEligibility === true && earns(s) && s.incomeMonthly !== undefined,
    },
  },
};
