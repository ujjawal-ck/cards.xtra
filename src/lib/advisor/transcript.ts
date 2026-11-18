/**
 * Card advisor chat transcript. Pure functions over the answers: no React, no
 * storage, no network. Contract: chatTypes.ts. The engine rules: types.ts.
 *
 * The transcript replays the answers in asking order. Every message is built
 * from the prefix state of its own answer, so a later answer, an eligibility
 * result or "I have this" never changes the text of an earlier message.
 */
import { NOTE_SAME, buildReveal, nextQuestion } from './engine';
import type {
  AdvisorTranscript,
  AdvisorAvatarState,
  AvatarSignals,
  BuildTranscriptInput,
  ChatMessage,
} from './chatTypes';
import {
  NOT_SURE,
  type AdvisorConfig,
  type AdvisorQuestion,
  type AdvisorReveal,
  type AdvisorSlots,
  type AdvisorState,
  type QuestionId,
} from './types';

const PINCODE_RE = /^[1-9]\d{5}$/;

const HELLO = "Hi, I'm Swipey. I'll help you pick a credit card. A few taps, no forms.";
const CLOSING_LIKELY = 'Apply for one card at a time. Each application is recorded on your credit report.';
const CLOSING_OTHER = 'Take your time. Tap one of your answers to change it.';

// ── The walk (same rule as engine.ts) ──────────────────────────────────────

interface WalkItem {
  question: AdvisorQuestion;
  answer: string | undefined;
  /** Slots filled by the questions before this one. */
  before: AdvisorSlots;
  active: boolean;
}

function walkItems(state: AdvisorState, config: AdvisorConfig): { items: WalkItem[]; slots: AdvisorSlots } {
  let slots: AdvisorSlots = {};
  const items: WalkItem[] = [];
  const visit = (question: AdvisorQuestion) => {
    const answer = state.answers[question.id];
    const before = slots;
    const active = !question.when || question.when(before);
    items.push({ question, answer, before, active });
    if (!active || answer === undefined || answer === NOT_SURE) return;
    if (question.kind === 'pincode') {
      if (PINCODE_RE.test(answer)) slots = { ...slots, pincode: answer };
      return;
    }
    const option = question.options.find((o) => o.id === answer);
    if (option) slots = { ...slots, ...option.set };
  };
  visit(config.questions.opener);
  const journey = slots.journey;
  if (journey) {
    for (const id of config.journeys[journey]) visit(config.questions[id]);
  }
  return { items, slots };
}

// ── Build the transcript ───────────────────────────────────────────────────

function answerText(question: AdvisorQuestion, answer: string): string {
  if (answer === NOT_SURE) return 'Not sure';
  if (question.kind === 'pincode') return `PIN ${answer}`;
  return question.options.find((o) => o.id === answer)?.label ?? answer;
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);
const topIds = (r: AdvisorReveal) => r.top.map((t) => t.card.id);

export function buildTranscript(input: BuildTranscriptInput): AdvisorTranscript {
  const { state, config, cards, eligibility, eligibilityKnown } = input;
  const items = walkItems(state, config).items.filter((w) => w.active && w.answer !== undefined);

  const messages: ChatMessage[] = [{ id: 'hello', kind: 'agent-text', text: HELLO }];
  const revealIndexes: Array<{ index: number; k: number }> = [];

  let prefix: AdvisorState = { answers: {}, held: state.held };
  let prevReveal: AdvisorReveal | null = null;
  let lastReveal: AdvisorReveal | null = null;

  items.forEach((item, i) => {
    const k = i + 1;
    const { question } = item;
    const answer = item.answer as string;

    // The question as the user saw it (state before this answer).
    const seen = nextQuestion(prefix, config, cards, { eligibilityKnown });
    const first = item.before.journey === 'first';
    const why = seen && seen.question.id === question.id
      ? seen.why
      : first && question.whyFirst ? question.whyFirst : question.why;
    const ask = seen && seen.question.id === question.id
      ? seen.ask
      : first && question.askFirst ? question.askFirst : question.ask;
    messages.push({ id: `q:${question.id}`, kind: 'agent-question', questionId: question.id, why, ask, current: false });
    messages.push({ id: `a:${question.id}`, kind: 'user-answer', questionId: question.id, text: answerText(question, answer) });

    prefix = { answers: { ...prefix.answers, [question.id]: answer }, held: state.held };
    const { slots } = walkItems(prefix, config);
    const eligible =
      eligibilityKnown ||
      ((slots.job === 'salaried' || slots.job === 'self-employed') &&
        slots.incomeMonthly !== undefined &&
        slots.pincode !== undefined);
    const reveal = buildReveal({
      state: prefix,
      config,
      cards,
      eligibility: eligible ? eligibility : null,
      previousTop: prevReveal ? topIds(prevReveal) : undefined,
    });

    const isNew =
      prevReveal === null ||
      !sameIds(topIds(reveal), topIds(prevReveal)) ||
      reveal.header !== prevReveal.header ||
      reveal.proof !== prevReveal.proof;
    if (isNew) {
      revealIndexes.push({ index: messages.length, k });
      messages.push({ id: `r:${question.id}`, kind: 'agent-reveal', header: reveal.header });
    } else if (reveal.note === NOTE_SAME) {
      // Only the "same cards" note becomes its own line. A relax note or an
      // eligibility note stays on the reveal, or it would repeat after every
      // later answer that changes nothing.
      messages.push({ id: `n:${question.id}`, kind: 'agent-text', text: reveal.note });
    }
    prevReveal = reveal;
    lastReveal = reveal;
  });

  // Only the last reveal message carries the current cards.
  if (lastReveal && revealIndexes.length > 0) {
    const current: AdvisorReveal = lastReveal;
    const at = revealIndexes[revealIndexes.length - 1].index;
    messages[at] = { ...(messages[at] as Extract<ChatMessage, { kind: 'agent-reveal' }>), header: current.header, reveal: current };
  }

  const step = nextQuestion(state, config, cards, { eligibilityKnown });
  if (step) {
    messages.push({
      id: `q:${step.question.id}`,
      kind: 'agent-question',
      questionId: step.question.id,
      why: step.why,
      ask: step.ask,
      current: true,
    });
  } else {
    const likely = (lastReveal as AdvisorReveal | null)?.proof === 'likely';
    messages.push({ id: 'closing', kind: 'agent-text', text: likely ? CLOSING_LIKELY : CLOSING_OTHER });
  }

  return { messages, step, reveal: lastReveal };
}

// ── Rewind ─────────────────────────────────────────────────────────────────

/**
 * The state without the answer to `questionId` and every answer after it in
 * asking order. Answers to questions that are not active are dropped too.
 * `held` is kept, except for the opener (a full restart). Never mutates.
 */
export function rewindAnswers(state: AdvisorState, config: AdvisorConfig, questionId: QuestionId): AdvisorState {
  if (state.answers[questionId] === undefined) return state;
  if (questionId === 'opener') return { answers: {}, held: [] };
  const { items } = walkItems(state, config);
  const at = items.findIndex((w) => w.question.id === questionId);
  const answers: AdvisorState['answers'] = {};
  if (at > 0) {
    for (const w of items.slice(0, at)) {
      if (w.active && w.answer !== undefined) answers[w.question.id] = w.answer;
    }
  } else {
    // Not in this journey: drop only this answer, keep the rest.
    for (const [id, value] of Object.entries(state.answers) as Array<[QuestionId, string | undefined]>) {
      if (id !== questionId && value !== undefined) answers[id] = value;
    }
  }
  return { answers, held: [...state.held] };
}

// ── Avatar ─────────────────────────────────────────────────────────────────

/** Priority, first match wins. */
export function avatarStateFor(signals: AvatarSignals): AdvisorAvatarState {
  if (signals.catalogueError || signals.eligibilityError) return 'error';
  if (signals.eligibilityFetching) return 'thinking';
  if (signals.justFoundLikely) return 'success';
  if (signals.messageArriving) return 'speaking';
  if (signals.waitingForAnswer) return 'listening';
  return 'idle';
}
