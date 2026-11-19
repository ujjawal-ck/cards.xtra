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
import { decodeChoice, parseEligForm, type EligJob } from './answers';

const ELIGIBILITY_QUESTIONS: QuestionId[] = ['eligBridge', 'eligForm'];

// ── One answer to slots ────────────────────────────────────────────────────

export interface AppliedAnswer {
  /** The slots after this answer. The same object as the input when the answer sets nothing. */
  slots: AdvisorSlots;
  /** True when the answer changed the slots (a valid pick or a valid form). */
  used: boolean;
  /** The picked options of a choice question, in option order. Empty otherwise. */
  picks: AdvisorOption[];
}

const JOB_OF: Record<EligJob, NonNullable<AdvisorSlots['job']>> = {
  salaried: 'salaried',
  self: 'self-employed',
  none: 'not-earning',
};

const unique = (list: number[]) => list.filter((v, i) => list.indexOf(v) === i);

/**
 * The ONE place an answer becomes slots. Merge rules for the picks:
 *   - categories: added after the ones already set (unique). With
 *     `question.replacesCategory`, they take the place of that tag.
 *   - skipNeed: set only when a pick has it; true only when EVERY pick sets it true.
 *   - every other key: the later pick wins.
 */
export function applyAnswer(slots: AdvisorSlots, question: AdvisorQuestion, answer: string | undefined): AppliedAnswer {
  if (question.kind === 'eligibility') {
    const form = parseEligForm(answer);
    if (!form) return { slots, used: false, picks: [] };
    const next: AdvisorSlots = { ...slots, job: JOB_OF[form.job] };
    if (form.incomeMonthly !== undefined) next.incomeMonthly = form.incomeMonthly;
    if (form.pincode !== undefined) next.pincode = form.pincode;
    return { slots: next, used: true, picks: [] };
  }
  const picks = decodeChoice(question, answer);
  if (picks.length === 0) return { slots, used: false, picks };

  let next: AdvisorSlots = { ...slots };
  const cats: number[] = [];
  let anySkip = false;
  for (const pick of picks) {
    const { categoryTagId, skipNeed, ...rest } = pick.set;
    if (categoryTagId !== undefined) cats.push(categoryTagId);
    if (skipNeed !== undefined) anySkip = true;
    next = { ...next, ...rest };
  }
  if (anySkip) next.skipNeed = picks.every((p) => p.set.skipNeed === true);
  if (cats.length > 0) {
    const base = slots.categoryTagIds ?? [];
    const at = question.replacesCategory !== undefined ? base.indexOf(question.replacesCategory) : -1;
    next.categoryTagIds =
      at >= 0
        ? unique([...base.slice(0, at), ...cats, ...base.slice(at + 1)])
        : unique([...base, ...cats]);
  }
  return { slots: next, used: true, picks };
}

// ── The walk ───────────────────────────────────────────────────────────────

export interface WalkStep {
  question: AdvisorQuestion;
  answer: string | undefined;
  /** Slots filled by the questions before this one. */
  before: AdvisorSlots;
  /** `when` passes for `before` (always true for a question without `when`). */
  active: boolean;
  /** The options the answer picked, when the question is active. Empty otherwise. */
  picks: AdvisorOption[];
  /** True when the answer changed the slots (active, a valid pick or a valid form). */
  used: boolean;
}

/** The answers in asking order: the opener, then the journey. Each answer applies to the slots before it. */
export function walkAnswers(state: AdvisorState, config: AdvisorConfig): { slots: AdvisorSlots; steps: WalkStep[] } {
  let slots: AdvisorSlots = {};
  const steps: WalkStep[] = [];
  const visit = (question: AdvisorQuestion) => {
    const answer = state.answers[question.id];
    const before = slots;
    const active = !question.when || question.when(before);
    if (!active) {
      steps.push({ question, answer, before, active, picks: [], used: false });
      return;
    }
    const applied = applyAnswer(before, question, answer);
    steps.push({ question, answer, before, active, picks: applied.picks, used: applied.used });
    slots = applied.slots;
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
  return walkAnswers(state, config).slots;
}

const FEE_BUCKETS: Record<string, number[]> = {
  free: [0],
  upto1000: [0, 1],
  upto5000: [0, 1, 2, 3],
};

export function slotsToFilters(slots: AdvisorSlots): AppliedFilters {
  return {
    categoryTagIds: [...(slots.categoryTagIds ?? [])],
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
  const { slots, steps } = walkAnswers(state, config);
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

    // A category that is already set is not offered again. The tag this
    // question replaces stays ("Food delivery" keeps the food tag).
    const setCats = (slots.categoryTagIds ?? []).filter((t) => t !== q.replacesCategory);
    // Categories are OR-ed, so a count after the answer is never 0 once a
    // category is set. Test the option's category ALONE with the other filters.
    const filters = slotsToFilters(slots);
    const hasCards = (tag: number) => applyFilters(pool, { ...filters, categoryTagIds: [tag] }).length > 0;
    const current = applyFilters(pool, filters).length;
    const counted: StepOption[] = visible
      .filter((o) => o.set.categoryTagId === undefined || !setCats.includes(o.set.categoryTagId))
      .filter((o) => o.set.categoryTagId === undefined || hasCards(o.set.categoryTagId))
      .map((o) => ({
        ...o,
        count: applyFilters(pool, slotsToFilters(applyAnswer(slots, q, o.id).slots)).length,
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
/** Exported for the chat transcript: the only note it repeats as its own line. */
export const NOTE_SAME = 'Same cards. They still fit your answers.';

const DIMS: FilterDim[] = ['categoryTagIds', 'feeBucketIndices', 'networks', 'bankNames', 'traits'];

const isRuPay = (card: CardModel) => cardNetworks(card.filterMeta?.network).includes('rupay');
const isFree = (card: CardModel) => card.filterMeta?.isFree === true;
const byLowestFee = (list: CardModel[]) => sortCards([...list], 'annualFeeAsc');

/** How many of the picked categories a card has. */
const catHits = (card: CardModel, cats: number[]) =>
  cats.filter((t) => (card.filterMeta?.categoryIds ?? []).includes(t)).length;

/** Rank a list without changing it: fee sort, then (2+ categories) cards with
 *  more of them first, then RuPay first for UPI users. Each step keeps the order of ties. */
function rank(list: CardModel[], slots: AdvisorSlots): CardModel[] {
  let base = slots.sortByFee ? byLowestFee(list) : [...list];
  const cats = slots.categoryTagIds ?? [];
  if (cats.length >= 2) {
    base = base
      .map((card, i) => ({ card, i, hits: catHits(card, cats) }))
      .sort((a, b) => b.hits - a.hits || a.i - b.i)
      .map((x) => x.card);
  }
  if (slots.upi !== 'daily' && slots.upi !== 'sometimes') return base;
  return [...base.filter(isRuPay), ...base.filter((c) => !isRuPay(c))];
}

/** "fuel", "fuel and travel", "fuel, travel and shopping". null for no category. */
function categoryLabel(tagIds: number[]): string | null {
  const labels = tagIds
    .map((id) => CATEGORY_OPTIONS.find((o) => o.tagId === id)?.label.toLowerCase())
    .filter((l): l is string => !!l);
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function buildHeader(f: AppliedFilters, likely: boolean): string {
  const cat = categoryLabel(f.categoryTagIds);
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

type ReasonTemplate = 'firstTime' | 'upi' | 'category' | 'none';

/** True when a pick set a filter or a rank preference. The eligibility
 *  bridge and the eligibility form cannot change the list by themselves. */
function canChangeList(picks: AdvisorOption[]): boolean {
  return picks.some(
    ({ set }) =>
      set.categoryTagId !== undefined ||
      set.network !== undefined ||
      set.fee !== undefined ||
      set.hasHistory !== undefined ||
      set.upi !== undefined ||
      set.sortByFee !== undefined,
  );
}

const hasCategory = (slots: AdvisorSlots) => (slots.categoryTagIds ?? []).length > 0;

/** The template for the last answer that could change the list. So the reason
 *  does not flip when the user answers the bridge or the form.
 *  A fee answer has no template: the card row always shows the fee line.
 *  With several picks: first time, then UPI, then category. */
function reasonTemplate(steps: WalkStep[], slots: AdvisorSlots): ReasonTemplate {
  const picks = [...steps].reverse().find((s) => s.used && canChangeList(s.picks))?.picks;
  if (!picks) return hasCategory(slots) ? 'category' : 'none';
  if (picks.some((p) => p.set.hasHistory !== undefined)) return 'firstTime';
  if (picks.some((p) => p.set.network || p.set.upi === 'daily' || p.set.upi === 'sometimes')) return 'upi';
  if (picks.some((p) => p.set.categoryTagId !== undefined) || hasCategory(slots)) return 'category';
  return 'none';
}

/** True when the LAST answer set a filter or a rank preference. */
function lastAnswerCanChangeList(steps: WalkStep[]): boolean {
  return canChangeList([...steps].reverse().find((s) => s.used)?.picks ?? []);
}

const clean = (s: string | undefined | null) => (s ?? '').trim();

/** The benefit title of the first picked category (in slot order) that the card has a benefit for. */
function categoryBenefit(card: CardModel, tagIds: number[] | undefined): string {
  for (const tagId of tagIds ?? []) {
    const title = clean(card.tileBenefits?.find((b) => b.tagId === tagId)?.title);
    if (title) return title;
  }
  return '';
}

function fallbackReason(card: CardModel, slots: AdvisorSlots): string {
  const candidates = [
    categoryBenefit(card, slots.categoryTagIds),
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
    case 'category':
      line = categoryBenefit(card, slots.categoryTagIds);
      break;
    default:
      break;
  }
  return clean(line) || fallbackReason(card, slots);
}

const PROOF_RANK: Record<ProofLevel, number> = { none: 0, matches: 1, likely: 2 };

export function buildReveal(input: BuildRevealInput): AdvisorReveal {
  const { state, config, cards, eligibility, previousTop } = input;
  const { slots, steps } = walkAnswers(state, config);
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
  const make = (card: CardModel, label: RevealCard['label'], outsideFilters = false): RevealCard => {
    // A card shown from outside the user's filters never claims to match them.
    const proof = outsideFilters ? 'none' : proofOf();
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
    let contrastOutside = false;
    if (mode !== 'likely' && slots.job !== 'not-earning' && slots.feeSource !== 'user') {
      if (slots.fee === 'free') {
        contrast = applyFilters(pool, { ...filters, feeBucketIndices: [1] }).find(notShown);
        // Outside only while the free filter is still applied (not relaxed away).
        contrastOutside = filters.feeBucketIndices.length > 0;
      } else if (slots.fee === undefined) {
        const bothFree = top.length >= 2 && top.every((t) => isFree(t.card));
        contrast = bothFree ? undefined : list.find((c) => isFree(c) && notShown(c));
      }
    }
    if (contrast) {
      top.push(make(contrast, 'Worth a look', contrastOutside));
    } else {
      const third = list.find(notShown);
      if (third) top.push(make(third, 'Also great'));
    }
  }

  const topIds = top.map((t) => t.card.id);
  if (!note && dropped.length > 0) {
    note = fallbackCopy(requested, dropped).body;
  } else if (
    !note &&
    prev &&
    lastAnswerCanChangeList(steps) &&
    prev.length === topIds.length &&
    prev.every((id, i) => id === topIds[i])
  ) {
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
  for (const step of walkAnswers(state, config).steps) {
    if (!step.used) continue;
    const questionId = step.question.id;
    if (step.question.kind === 'eligibility') {
      const form = parseEligForm(step.answer);
      if (form?.pincode) pills.push({ questionId, label: `PIN ${form.pincode}` });
      continue;
    }
    for (const pick of step.picks) {
      const label = pick.pill ?? pick.label;
      if (label !== '') pills.push({ questionId, label });
    }
  }
  return pills;
}
