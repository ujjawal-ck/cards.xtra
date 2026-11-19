/**
 * Card advisor: the contract between the config, the engine and the screen.
 *
 * The advisor asks one tap-to-answer question at a time and shows three cards
 * after the first answer. It runs on the catalogue the app already holds
 * (useCards) and on the eligibility call. It makes no other network call.
 *
 * Rules that hold everywhere:
 *   - The state is the answers. Slots, filters, the next question and the cards
 *     are all derived from the answers, so a changed answer needs no clean-up.
 *   - Hard filters (fee, category, network, first card, eligibility) remove
 *     cards. Soft answers (UPI habit) only move cards up.
 *   - "Likely to qualify" comes only from the eligibility API result.
 */
import type { CardModel } from '../../molecules';
import type { AppliedFilters } from '../../data/filterOptions';
import type { FilterDim } from '../filterFallback';

export type JourneyId = 'first' | 'better' | 'specific' | 'explore';

export type QuestionId =
  | 'opener'
  | 'history'
  | 'missing'
  | 'matters'
  | 'need'
  | 'foodType'
  | 'upi'
  | 'fee'
  | 'eligBridge'
  | 'eligForm';

/** The answer stored when the user taps "Not sure". It sets nothing. */
export const NOT_SURE = 'not-sure';

export type FeeComfort = 'free' | 'upto1000' | 'upto5000' | 'any';

/** What the answers add up to. Every field is optional: unset means not known. */
export interface AdvisorSlots {
  journey?: JourneyId;
  /** Journey 'first' only. true removes the first-card filter. */
  hasHistory?: boolean;
  /** Hard filter: BankKaro tag ids (CATEGORY_OPTIONS in data/filterOptions), unique.
   *  A card passes when it has ANY of them. A card with more of them ranks higher. */
  categoryTagIds?: number[];
  /** Ask the need question even when a category is already set (the user picked
   *  "daily spends" together with a category). */
  askNeed?: boolean;
  /** Hard filter: set only when the user's stated need is UPI payments. */
  network?: 'RuPay';
  /** Hard filter. */
  fee?: FeeComfort;
  /** 'default' when a journey set the fee, 'user' when the user answered or picked it. */
  feeSource?: 'default' | 'user';
  /** Soft: 'daily' and 'sometimes' move RuPay cards up. It never removes a card. */
  upi?: 'daily' | 'sometimes' | 'rarely';
  /** Rank by the lowest annual fee first (journey 'better', "lower fees"). */
  sortByFee?: boolean;
  /** The need question is not asked. */
  skipNeed?: boolean;
  /** The answer to the eligibility bridge. */
  wantsEligibility?: boolean;
  job?: 'salaried' | 'self-employed' | 'not-earning';
  /** Monthly in-hand income in rupees, as the user typed it in the eligibility form. */
  incomeMonthly?: number;
  /** Six digits. */
  pincode?: string;
}

/** What one option adds to the slots. An option names ONE category
 *  (`categoryTagId`); the engine merges the picked options into
 *  `slots.categoryTagIds` (see applyAnswer in engine.ts). */
export type AdvisorOptionSet = Partial<Omit<AdvisorSlots, 'categoryTagIds'>> & { categoryTagId?: number };

export interface AdvisorOption {
  id: string;
  label: string;
  /** Short text for the answer pill. Falls back to `label`. An empty string
   *  means the answer shows no pill. */
  pill?: string;
  set: AdvisorOptionSet;
  /** Multi-select questions only: this option cannot be combined. A tap on it
   *  answers the question with this option alone. */
  exclusive?: boolean;
  /** Hide the option when this returns true for the slots filled so far. */
  hideWhen?: (slots: AdvisorSlots) => boolean;
  /** One short line the advisor says right after this answer. It uses the
   *  answer and says what changed. No praise. A function may return undefined
   *  (say nothing). */
  ack?: string | ((ctx: AckContext) => string | undefined);
}

/** What an acknowledgement can look at. */
export interface AckContext {
  /** The slots after this answer. */
  slots: AdvisorSlots;
  /** The cards after this answer. */
  reveal: AdvisorReveal;
  /** True when this answer changed the top cards, the header or the proof level. */
  changed: boolean;
}

/** A quick tip: one useful fact, shown once, at one place in the journey. */
export interface AdvisorTip {
  /** Two tips can share an id (two places for the same fact): the first one that applies shows. */
  id: string;
  /** One or two short sentences. No bank name, no rate, no promise of approval. */
  text: string;
  /** Show right after the answer to this question (after its acknowledgement and its cards). */
  after?: QuestionId;
  /** Show right before this question is asked. */
  before?: QuestionId;
  /** Show only when this returns true. Absent means always. */
  when?: (ctx: TipContext) => boolean;
}

export interface TipContext {
  /** For `after`: the slots including that answer. For `before`: the slots before the question. */
  slots: AdvisorSlots;
  /** The cards at that point, or null before the first answer. */
  reveal: AdvisorReveal | null;
  /** True when an eligibility result was applied to `reveal`. */
  eligibilityApplied: boolean;
}

export interface AdvisorQuestion {
  id: QuestionId;
  /** 'eligibility' shows one form: how the user earns, the monthly income and
   *  the pincode. Its answer is the text built by encodeEligForm (answers.ts). */
  kind: 'choice' | 'eligibility';
  /** Present on a multi-select question: the user picks 1 to `max` options, then
   *  taps "Done". The answer is built by encodeMulti (answers.ts). */
  multi?: { max: number };
  /** The picked categories of this question REPLACE this tag in
   *  `slots.categoryTagIds`, at its position (the food type question replaces
   *  the food tag). Absent: the picked categories are added. */
  replacesCategory?: number;
  /** The acknowledgement when two or more options are picked. `labels` are the
   *  pill (or label) of each pick, in option order. One pick uses that option's `ack`. */
  multiAck?: (labels: string[], ctx: AckContext) => string | undefined;
  /** The question, under 15 words. */
  ask: string;
  /** One expert line shown above the question, under 20 words. */
  why: string;
  /** Wording for journey 'first' (the starter), when it differs. */
  askFirst?: string;
  whyFirst?: string;
  options: AdvisorOption[];
  /** Adds a "Not sure" option that sets nothing. */
  notSure: boolean;
  /** True when the options set hard filters. The engine then counts cards per
   *  option, hides an option that leaves no card, and skips the question when
   *  no option would change the list. */
  filters: boolean;
  /** Ask only when this returns true for the slots filled so far. */
  when?: (slots: AdvisorSlots) => boolean;
}

export interface AdvisorConfig {
  version: number;
  /** Questions after the opener, in asking order, for each journey. */
  journeys: Record<JourneyId, QuestionId[]>;
  questions: Record<QuestionId, AdvisorQuestion>;
  /** The line said after a "Not sure" answer. */
  notSureAck: string;
  /** Quick tips, in no special order. Each id shows at most once in a chat. */
  tips: AdvisorTip[];
}

/** The whole session state. */
export interface AdvisorState {
  /** Question id to its answer text: an option id, option ids joined by ','
   *  (multi-select), NOT_SURE, or the eligibility form text. See answers.ts. */
  answers: Partial<Record<QuestionId, string>>;
  /** CardModel.id of each card the user marked "I have this". */
  held: string[];
}

export const EMPTY_ADVISOR_STATE: AdvisorState = { answers: {}, held: [] };

/** A finished eligibility check. Absent while not asked, loading or failed. */
export interface AdvisorEligibility {
  eligibleAliases: string[];
  /** The monthly income the check used. */
  incomeMonthly: number;
}

export interface StepOption extends AdvisorOption {
  /** Cards left if this option is picked. Present only on `filters` questions. */
  count?: number;
}

/** The question to show now. */
export interface AdvisorStep {
  question: AdvisorQuestion;
  /** Resolved for the journey (askFirst / whyFirst applied). */
  ask: string;
  why: string;
  /** Options to show. Options that leave no card are already removed. The
   *  "Not sure" option is NOT in this list: the screen adds it when
   *  `question.notSure` is true. */
  options: StepOption[];
  /** 1-based position among the questions asked so far. */
  stepNumber: number;
}

export type ProofLevel = 'none' | 'matches' | 'likely';

export type RevealLabel = 'Best match' | 'Also great' | 'Worth a look';

export interface RevealCard {
  card: CardModel;
  label: RevealLabel;
  proof: ProofLevel;
  /** One line tied to the last answer. Never empty. */
  reason: string;
  /** True when the card was not in the previous reveal. */
  isNew: boolean;
}

export interface AdvisorReveal {
  /** The answers in plain words, e.g. "Free cards for online shopping". */
  header: string;
  /** One honest line when something did not match as asked. */
  note?: string;
  /** Up to three cards. */
  top: RevealCard[];
  /** Every matching card in rank order. `top[0]` and `top[1]` come from it. */
  all: CardModel[];
  /** all.length */
  total: number;
  /** The filters that gave `all`, after any relaxing. */
  filters: AppliedFilters;
  /** Filter dimensions set aside because nothing matched all of them. */
  dropped: FilterDim[];
  /** The highest proof level in `top`. */
  proof: ProofLevel;
}

export interface AnswerPill {
  questionId: QuestionId;
  label: string;
}

export interface NextQuestionOptions {
  /** True when an eligibility result (or saved inputs) already exists. The
   *  bridge and the eligibility form are then not asked. */
  eligibilityKnown: boolean;
}

export interface BuildRevealInput {
  state: AdvisorState;
  config: AdvisorConfig;
  /** The full loaded catalogue, in API order (useCards). */
  cards: CardModel[];
  eligibility?: AdvisorEligibility | null;
  /** CardModel.id of the cards in the reveal shown before this one. */
  previousTop?: string[];
}

/**
 * The engine (src/lib/advisor/engine.ts) exports exactly these functions:
 *
 *   applyAnswer(slots, question, answer): AppliedAnswer   (the ONE place an answer becomes slots)
 *   walkAnswers(state, config): { slots: AdvisorSlots; steps: WalkStep[] }
 *   deriveSlots(state, config): AdvisorSlots
 *   slotsToFilters(slots): AppliedFilters
 *   nextQuestion(state, config, cards, opts: NextQuestionOptions): AdvisorStep | null
 *   buildReveal(input: BuildRevealInput): AdvisorReveal
 *   answerPills(state, config): AnswerPill[]
 *
 * and src/lib/advisor/config.ts exports `ADVISOR_CONFIG: AdvisorConfig`.
 */
