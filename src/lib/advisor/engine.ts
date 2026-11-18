/**
 * Card advisor engine. Pure functions over the answers: no React, no storage,
 * no network. Contract and rules: types.ts.
 *
 * Every function reads the answers through one walk (opener, then the journey
 * in order). A question is active when its `when` passes for the slots filled
 * BEFORE it. Most `when` rules turn false once the question itself is
 * answered, so they must never be tested against the final slots.
 */
import type { CardModel } from '../../molecules';
import {
  CATEGORY_OPTIONS,
  EMPTY_FILTERS,
  applyFilters,
  cardNetworks,
  hasActiveFilters,
  sortCards,
  type AppliedFilters,
} from '../../data/filterOptions';
import { closestCards, fallbackCopy, type FilterDim } from '../filterFallback';
import { classifyCardEligibility } from '../../api/eligibility';
import {
  NOT_SURE,
  type AdvisorConfig,
  type AdvisorOption,
  type AdvisorQuestion,
  type AdvisorReveal,
  type AdvisorSlots,
  type AdvisorState,
  type AdvisorStep,
  type AnswerPill,
  type BuildRevealInput,
  type NextQuestionOptions,
  type ProofLevel,
  type QuestionId,
  type RevealCard,
  type StepOption,
} from './types';

const PINCODE_RE = /^[1-9]\d{5}$/;
const ELIGIBILITY_QUESTIONS: QuestionId[] = ['eligBridge', 'job', 'income', 'pincode'];

// ── The walk ───────────────────────────────────────────────────────────────

interface WalkStep {
  question: AdvisorQuestion;
  answer: string | undefined;
  /** Slots filled by the questions before this one. */
  before: AdvisorSlots;
  /** `when` passes for `before` (always true for a question without `when`). */
  active: boolean;
  /** The option the answer picked, when it picked one and the question is active. */
  option?: AdvisorOption;
  /** True when the answer changed the slots (active, defined, not NOT_SURE, valid). */
  used: boolean;
}

interface Walk {
  slots: AdvisorSlots;
  steps: WalkStep[];
}

function walk(state: AdvisorState, config: AdvisorConfig): Walk {
  let slots: AdvisorSlots = {};
  const steps: WalkStep[] = [];
  const visit = (question: AdvisorQuestion) => {
    const answer = state.answers[question.id];
    const before = slots;
    const active = !question.when || question.when(before);
    const step: WalkStep = { question, answer, before, active, used: false };
    steps.push(step);
    if (!active || answer === undefined || answer === NOT_SURE) return;
    if (question.kind === 'pincode') {
      if (PINCODE_RE.test(answer)) {
        slots = { ...slots, pincode: answer };
        step.used = true;
      }
      return;
    }
    const option = question.options.find((o) => o.id === answer);
    if (!option) return;
    step.option = option;
    step.used = true;
    slots = { ...slots, ...option.set };
  };
  visit(config.questions.opener);
  const journey = slots.journey;
  if (journey) {
    for (const id of config.journeys[journey]) visit(config.questions[id]);
  }
  return { slots, steps };
}

// ── Slots and filters ──────────────────────────────────────────────────────

export function deriveSlots(state: AdvisorState, config: AdvisorConfig): AdvisorSlots {
  return walk(state, config).slots;
}

const FEE_BUCKETS: Record<string, number[]> = {
  free: [0],
  upto1000: [0, 1],
  upto5000: [0, 1, 2, 3],
};

export function slotsToFilters(slots: AdvisorSlots): AppliedFilters {
  return {
    categoryTagIds: slots.categoryTagId !== undefined ? [slots.categoryTagId] : [],
    bankNames: [],
    networks: slots.network ? ['RuPay'] : [],
    feeBucketIndices: slots.fee ? [...(FEE_BUCKETS[slots.fee] ?? [])] : [],
    traits: slots.journey === 'first' && slots.hasHistory !== true ? ['firstCard'] : [],
  };
}

const withoutHeld = (cards: CardModel[], held: string[]) =>
  cards.filter((c) => !held.includes(c.id));

// ── Next question ──────────────────────────────────────────────────────────

function toStep(
  question: AdvisorQuestion,
  slots: AdvisorSlots,
  options: StepOption[],
  state: AdvisorState,
): AdvisorStep {
  const first = slots.journey === 'first';
  const answered = Object.values(state.answers).filter((v) => v !== undefined).length;
  return {
    question,
    ask: first && question.askFirst ? question.askFirst : question.ask,
    why: first && question.whyFirst ? question.whyFirst : question.why,
    options,
    stepNumber: answered + 1,
  };
}

export function nextQuestion(
  state: AdvisorState,
  config: AdvisorConfig,
  cards: CardModel[],
  opts: NextQuestionOptions,
): AdvisorStep | null {
  const { slots, steps } = walk(state, config);
  const opener = config.questions.opener;
  if (state.answers.opener === undefined || !slots.journey) {
    return toStep(opener, slots, [...opener.options], state);
  }
  const pool = withoutHeld(cards, state.held);
  for (const step of steps) {
    const q = step.question;
    if (q.id === 'opener') continue;
    if (step.answer !== undefined || !step.active) continue;
    if (opts.eligibilityKnown && ELIGIBILITY_QUESTIONS.includes(q.id)) continue;
    const visible = q.options.filter((o) => !o.hideWhen || !o.hideWhen(slots));
    if (!q.filters) return toStep(q, slots, visible, state);

    const current = applyFilters(pool, slotsToFilters(slots)).length;
    const counted: StepOption[] = visible
      .map((o) => ({
        ...o,
        count: applyFilters(pool, slotsToFilters({ ...slots, ...o.set })).length,
      }))
      .filter((o) => o.count > 0);
    const changes = counted.some((o) => Object.keys(o.set).length > 0 && o.count !== current);
    if (counted.length === 0 || !changes) continue;
    return toStep(q, slots, counted, state);
  }
  return null;
}

// ── Reveal ─────────────────────────────────────────────────────────────────

const NOTE_NOT_EARNING = 'Banks usually ask for income proof. These have the lowest fees.';
const NOTE_ELIG_CATEGORY = 'None of those fit your income and pincode. These do.';
const NOTE_ELIG_ANY = 'No card for this need fits your income and pincode. These are the ones that do.';
const NOTE_ELIG_NONE =
  'We could not find a card that fits this income and pincode. You can change your answers. These have the lowest fees.';
const NOTE_SAME = 'Same cards. That answer did not change the best three.';

const DIMS: FilterDim[] = ['categoryTagIds', 'feeBucketIndices', 'networks', 'bankNames', 'traits'];

const isRuPay = (card: CardModel) => cardNetworks(card.filterMeta?.network).includes('rupay');
const isFree = (card: CardModel) => card.filterMeta?.isFree === true;
const byLowestFee = (list: CardModel[]) => sortCards([...list], 'annualFeeAsc');

/** Rank a list without changing it: fee sort, then RuPay first for UPI users. */
function rank(list: CardModel[], slots: AdvisorSlots): CardModel[] {
  const base = slots.sortByFee ? byLowestFee(list) : [...list];
  if (slots.upi !== 'daily' && slots.upi !== 'sometimes') return base;
  return [...base.filter(isRuPay), ...base.filter((c) => !isRuPay(c))];
}

function categoryLabel(tagId: number | undefined): string | null {
  if (tagId === undefined) return null;
  return CATEGORY_OPTIONS.find((o) => o.tagId === tagId)?.label.toLowerCase() ?? null;
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function buildHeader(f: AppliedFilters, likely: boolean): string {
  const cat = categoryLabel(f.categoryTagIds[0]);
  const forCat = cat ? ` for ${cat}` : '';
  if (likely) return `Cards you are likely to get${forCat}`;
  if (!hasActiveFilters(f)) return 'Popular cards';

  const fee = [...f.feeBucketIndices].sort((a, b) => a - b).join(',');
  const range = fee === '0,1' ? 'up to ₹1,000 a year' : fee === '0,1,2,3' ? 'up to ₹5,000 a year' : null;
  const noun = f.traits.includes('firstCard') ? 'first cards' : 'cards';
  const upi = f.networks.some((n) => n.toLowerCase() === 'rupay') ? ' that work on UPI' : '';

  if (range) {
    // "Travel cards up to ₹1,000 a year" reads better than "Up to ₹1,000 a year cards for travel".
    const lead = cat ? `${cat} ${noun}` : noun;
    return capitalize(`${lead} ${range}${upi}`);
  }
  const free = fee === '0' ? 'free ' : '';
  return capitalize(`${free}${noun}${forCat}${upi}`);
}

type ReasonTemplate = 'firstTime' | 'upi' | 'fee' | 'category' | 'none';

/** The template for the last answer that changed the slots. */
function reasonTemplate(steps: WalkStep[], slots: AdvisorSlots): ReasonTemplate {
  const last = [...steps].reverse().find((s) => s.used);
  const set = last?.option?.set;
  if (!last || !set) return 'none';
  if (set.hasHistory !== undefined) return 'firstTime';
  if (set.network || set.upi === 'daily' || set.upi === 'sometimes') return 'upi';
  // `sortByFee` ("Lower fees") ranks by fee, so the fee is the honest reason.
  if (set.fee || set.sortByFee) return 'fee';
  if (set.categoryTagId !== undefined || slots.categoryTagId !== undefined) return 'category';
  return 'none';
}

const clean = (s: string | undefined | null) => (s ?? '').trim();

function categoryBenefit(card: CardModel, tagId: number | undefined): string {
  if (tagId === undefined) return '';
  return clean(card.tileBenefits?.find((b) => b.tagId === tagId)?.title);
}

function fallbackReason(card: CardModel, slots: AdvisorSlots): string {
  const candidates = [
    categoryBenefit(card, slots.categoryTagId),
    clean(card.tileBenefits?.[0]?.title),
    clean((card.tags ?? []).map(clean).filter(Boolean).join(' · ')),
    clean(card.cashback),
  ];
  return candidates.find((c) => c.length > 0) ?? 'A popular card';
}

function reasonFor(card: CardModel, proof: ProofLevel, template: ReasonTemplate, slots: AdvisorSlots): string {
  if (proof === 'likely') return 'Fits your income and pincode';
  let line = '';
  switch (template) {
    case 'firstTime':
      line = card.filterMeta?.newToCredit ? 'Open to first-time applicants' : '';
      break;
    case 'upi':
      line = isRuPay(card) ? 'Can be linked to UPI' : '';
      break;
    case 'fee':
      if (isFree(card)) line = 'No joining fee and no annual fee';
      else if (clean(card.annualFee)) line = `Annual fee ${clean(card.annualFee)}`;
      break;
    case 'category':
      line = categoryBenefit(card, slots.categoryTagId);
      break;
    default:
      break;
  }
  return clean(line) || fallbackReason(card, slots);
}

const PROOF_RANK: Record<ProofLevel, number> = { none: 0, matches: 1, likely: 2 };

export function buildReveal(input: BuildRevealInput): AdvisorReveal {
  const { state, config, cards, eligibility, previousTop } = input;
  const { slots, steps } = walk(state, config);
  const requested = slotsToFilters(slots);
  const pool = withoutHeld(cards, state.held);
  const closest = closestCards(pool, requested);
  const ranked = rank(closest.cards, slots);

  let list = ranked;
  let filters = closest.applied;
  let dropped = [...closest.dropped];
  let mode: 'filters' | 'likely' | 'none' = 'filters';
  let note: string | undefined;

  if (slots.job === 'not-earning') {
    list = byLowestFee(ranked);
    note = NOTE_NOT_EARNING;
  } else if (eligibility) {
    const ok = (c: CardModel) =>
      classifyCardEligibility(c, eligibility.eligibleAliases, eligibility.incomeMonthly) === 'eligible';
    const exact = ranked.filter(ok);
    const catFilters: AppliedFilters = { ...EMPTY_FILTERS, categoryTagIds: [...closest.applied.categoryTagIds] };
    const inCategory =
      exact.length === 0 && catFilters.categoryTagIds.length > 0
        ? rank(applyFilters(pool, catFilters), slots).filter(ok)
        : [];
    const anywhere = exact.length === 0 && inCategory.length === 0 ? rank(pool, slots).filter(ok) : [];
    const activeExcept = (keep: FilterDim[]) => DIMS.filter((d) => requested[d].length > 0 && !keep.includes(d));

    if (exact.length > 0) {
      list = exact;
      mode = 'likely';
    } else if (inCategory.length > 0) {
      list = inCategory;
      mode = 'likely';
      filters = catFilters;
      dropped = activeExcept(['categoryTagIds']);
      note = NOTE_ELIG_CATEGORY;
    } else if (anywhere.length > 0) {
      list = anywhere;
      mode = 'likely';
      filters = { ...EMPTY_FILTERS };
      dropped = activeExcept([]);
      note = NOTE_ELIG_ANY;
    } else {
      list = byLowestFee(ranked);
      mode = 'none';
      note = NOTE_ELIG_NONE;
    }
  }

  const proofOf = (): ProofLevel => {
    if (mode === 'likely') return 'likely';
    if (mode === 'none') return 'none';
    return hasActiveFilters(filters) ? 'matches' : 'none';
  };
  const template = reasonTemplate(steps, slots);
  const prev = previousTop && previousTop.length > 0 ? previousTop : null;
  const make = (card: CardModel, label: RevealCard['label']): RevealCard => {
    const proof = proofOf();
    return {
      card,
      label,
      proof,
      reason: reasonFor(card, proof, template, slots),
      isNew: prev !== null && !prev.includes(card.id),
    };
  };

  const top: RevealCard[] = [];
  const shown = () => top.map((t) => t.card.id);
  const notShown = (c: CardModel) => !shown().includes(c.id);

  if (list.length > 0) {
    const first = list[0];
    top.push(make(first, 'Best match'));
    const bank = first.filterMeta?.bankName;
    const second = list.find((c, i) => i > 0 && c.filterMeta?.bankName !== bank) ?? list[1];
    if (second) top.push(make(second, 'Also great'));

    let contrast: CardModel | undefined;
    if (mode !== 'likely' && slots.job !== 'not-earning' && slots.feeSource !== 'user') {
      if (slots.fee === 'free') {
        contrast = applyFilters(pool, { ...filters, feeBucketIndices: [1] }).find(notShown);
      } else if (slots.fee === undefined) {
        const bothFree = top.length >= 2 && top.every((t) => isFree(t.card));
        contrast = bothFree ? undefined : list.find((c) => isFree(c) && notShown(c));
      }
    }
    if (contrast) {
      top.push(make(contrast, 'Worth a look'));
    } else {
      const third = list.find(notShown);
      if (third) top.push(make(third, 'Also great'));
    }
  }

  const topIds = top.map((t) => t.card.id);
  if (!note && dropped.length > 0) {
    note = fallbackCopy(requested, dropped).body;
  } else if (!note && prev && prev.length === topIds.length && prev.every((id, i) => id === topIds[i])) {
    note = NOTE_SAME;
  }

  const proof = top.reduce<ProofLevel>((best, t) => (PROOF_RANK[t.proof] > PROOF_RANK[best] ? t.proof : best), 'none');

  return {
    header: buildHeader(filters, mode === 'likely'),
    note,
    top,
    all: list,
    total: list.length,
    filters,
    dropped,
    proof,
  };
}

// ── Answer pills ───────────────────────────────────────────────────────────

export function answerPills(state: AdvisorState, config: AdvisorConfig): AnswerPill[] {
  const pills: AnswerPill[] = [];
  for (const step of walk(state, config).steps) {
    if (!step.used) continue;
    const questionId = step.question.id;
    if (step.question.kind === 'pincode') {
      pills.push({ questionId, label: `PIN ${step.answer}` });
      continue;
    }
    const label = step.option ? step.option.pill ?? step.option.label : '';
    if (label !== '') pills.push({ questionId, label });
  }
  return pills;
}
