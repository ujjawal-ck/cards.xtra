/**
 * Card advisor chat transcript. Pure functions over the answers: no React, no
 * storage, no network. Contract: chatTypes.ts. The engine rules: types.ts.
 *
 * The transcript replays the answers in asking order. Every message is built
 * from the prefix state of its own answer, so a later answer, an eligibility
 * result or "I have this" never changes the text of an earlier message.
 */
import { NOTE_SAME, buildReveal, nextQuestion, slotsToFilters, walkAnswers, type WalkStep } from './engine';
import { decodeChoice, parseEligForm } from './answers';
import { formatINR } from '../money';
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
  type AdvisorTip,
  type QuestionId,
  type TipContext,
} from './types';

const HELLO = "Hi, I'm Swipey. I'll help you pick a credit card. It takes a few taps.";
const CLOSING_LIKELY = 'Apply for one card at a time. Each application is recorded on your credit report.';
const CLOSING_OTHER = 'That is my shortlist for now. Pick what to do next.';

// ── Build the transcript ───────────────────────────────────────────────────

const JOB_TEXT = { salaried: 'Salaried', self: 'Self-employed' } as const;

/** The answer bubble: option labels joined by ', ', or the form in one line. */
function answerText(question: AdvisorQuestion, answer: string): string {
  if (answer === NOT_SURE) return 'Not sure';
  if (question.kind === 'eligibility') {
    const form = parseEligForm(answer);
    if (!form) return answer;
    if (form.job === 'none') return 'Not earning yet';
    return [JOB_TEXT[form.job], formatINR(form.incomeMonthly ?? 0), form.pincode].join(' · ');
  }
  const picks = decodeChoice(question, answer);
  return picks.length > 0 ? picks.map((o) => o.label).join(', ') : answer;
}

const SELF_EMPLOYED_ACK = 'Self-employed. Banks use a different income rule, and I check against that one.';

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * True when this answer set or changed a filter that the engine then set aside.
 * Its acknowledgement would disagree with the reveal note, so it is not shown.
 * A filter set aside by an earlier answer does not silence later answers.
 */
function ownFilterDropped(before: AdvisorSlots, after: AdvisorSlots, reveal: AdvisorReveal): boolean {
  const was = slotsToFilters(before);
  const now = slotsToFilters(after);
  return reveal.dropped.some((dim) => was[dim].join() !== now[dim].join());
}
const topIds = (r: AdvisorReveal) => r.top.map((t) => t.card.id);

export function buildTranscript(input: BuildTranscriptInput): AdvisorTranscript {
  const { state, config, cards, eligibility, eligibilityKnown } = input;
  const walked = walkAnswers(state, config);
  const items = walked.steps.filter((w) => w.active && w.answer !== undefined);

  const messages: ChatMessage[] = [{ id: 'hello', kind: 'agent-text', text: HELLO }];
  const revealIndexes: Array<{ index: number; k: number }> = [];
  const shownTips = new Set<string>();

  /** Push the tips for one place. The first tip of an id that applies wins; an id shows once. */
  const pushTips = (place: { after: QuestionId } | { before: QuestionId }, ctx: TipContext) => {
    const tip = (config.tips as AdvisorTip[]).find((t) => {
      const here = 'after' in place ? t.after === place.after : t.before === place.before;
      return here && !shownTips.has(t.id) && (!t.when || t.when(ctx));
    });
    if (!tip) return;
    // Never two tips in a row. When two meet, the one that comes first in config.tips stays.
    const last = messages[messages.length - 1];
    if (last?.kind === 'agent-tip') {
      const lastId = last.id.slice(2);
      const rank = (id: string) => config.tips.findIndex((t) => t.id === id);
      if (rank(lastId) <= rank(tip.id)) return;
      shownTips.delete(lastId);
      messages.pop();
    }
    shownTips.add(tip.id);
    messages.push({ id: `t:${tip.id}`, kind: 'agent-tip', text: tip.text });
  };

  let prefix: AdvisorState = { answers: {}, held: state.held };
  let prevReveal: AdvisorReveal | null = null;
  let lastReveal: AdvisorReveal | null = null;
  let lastApplied = false;

  items.forEach((item, i) => {
    const k = i + 1;
    const { question } = item;
    const answer = item.answer as string;

    pushTips(
      { before: question.id },
      { slots: item.before, reveal: prevReveal, eligibilityApplied: lastApplied },
    );

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
    const { slots } = walkAnswers(prefix, config);
    const eligible =
      eligibilityKnown ||
      ((slots.job === 'salaried' || slots.job === 'self-employed') &&
        slots.incomeMonthly !== undefined &&
        slots.pincode !== undefined);
    const applied = eligible ? eligibility : null;
    const reveal = buildReveal({
      state: prefix,
      config,
      cards,
      eligibility: applied,
      previousTop: prevReveal ? topIds(prevReveal) : undefined,
    });
    const eligibilityApplied = applied !== null;

    const changed =
      prevReveal === null ||
      !sameIds(topIds(reveal), topIds(prevReveal)) ||
      reveal.header !== prevReveal.header ||
      reveal.proof !== prevReveal.proof;

    // One acknowledgement at most.
    let ackText: string | undefined;
    if (answer === NOT_SURE) {
      ackText = config.notSureAck;
    } else if (question.kind === 'eligibility') {
      // The count line wins over the self-employed line. Not earning: the reveal note explains.
      if (eligibilityApplied && reveal.proof === 'likely' && reveal.note === undefined) {
        ackText = reveal.total === 1
          ? '1 card fits your income and pincode.'
          : `${reveal.total} cards fit your income and pincode.`;
      } else if (parseEligForm(answer)?.job === 'self') {
        ackText = SELF_EMPLOYED_ACK;
      }
    } else if (!ownFilterDropped(item.before, slots, reveal)) {
      const ctx = { slots, reveal, changed };
      const { picks } = item;
      if (picks.length === 1) {
        const raw = picks[0].ack;
        ackText = typeof raw === 'function' ? raw(ctx) : raw;
      } else if (picks.length > 1) {
        ackText = question.multiAck?.(picks.map((o) => o.pill ?? o.label), ctx);
      }
    }
    if (ackText) messages.push({ id: `k:${question.id}`, kind: 'agent-text', text: ackText });

    if (changed) {
      revealIndexes.push({ index: messages.length, k });
      messages.push({ id: `r:${question.id}`, kind: 'agent-reveal', header: reveal.header });
    } else if (!ackText && reveal.note === NOTE_SAME) {
      // Only the "same cards" note becomes its own line. A relax note or an
      // eligibility note stays on the reveal, or it would repeat after every
      // later answer that changes nothing.
      messages.push({ id: `n:${question.id}`, kind: 'agent-text', text: reveal.note });
    }

    pushTips({ after: question.id }, { slots, reveal, eligibilityApplied });

    prevReveal = reveal;
    lastReveal = reveal;
    lastApplied = eligibilityApplied;
  });

  // Only the last reveal message carries the current cards.
  if (lastReveal && revealIndexes.length > 0) {
    const current: AdvisorReveal = lastReveal;
    const at = revealIndexes[revealIndexes.length - 1].index;
    messages[at] = { ...(messages[at] as Extract<ChatMessage, { kind: 'agent-reveal' }>), header: current.header, reveal: current };
  }

  const step = nextQuestion(state, config, cards, { eligibilityKnown });
  if (step) {
    pushTips(
      { before: step.question.id },
      { slots: walked.slots, reveal: lastReveal, eligibilityApplied: lastApplied },
    );
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
  const items = walkAnswers(state, config).steps;
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

// ── Answered questions ─────────────────────────────────────────────────────

const answeredItems = (state: AdvisorState, config: AdvisorConfig): WalkStep[] =>
  walkAnswers(state, config).steps.filter((w) => w.active && w.answer !== undefined);

const answerCount = (state: AdvisorState) =>
  Object.values(state.answers).filter((v) => v !== undefined).length;

/** The answered, active questions in asking order, with the question text as the user saw it and the answer text. */
export function answeredList(
  state: AdvisorState,
  config: AdvisorConfig,
): Array<{ questionId: QuestionId; ask: string; text: string }> {
  return answeredItems(state, config).map(({ question, answer, before }) => ({
    questionId: question.id,
    ask: before.journey === 'first' && question.askFirst ? question.askFirst : question.ask,
    text: answerText(question, answer as string),
  }));
}

/** The question id of the last answer in asking order, or null when nothing is answered. */
export function lastAnswered(state: AdvisorState, config: AdvisorConfig): QuestionId | null {
  const items = answeredItems(state, config);
  return items.length > 0 ? items[items.length - 1].question.id : null;
}

/** How many answers `rewindAnswers(state, config, questionId)` removes: that answer and every later one. 0 when it is not answered. */
export function answersLost(state: AdvisorState, config: AdvisorConfig, questionId: QuestionId): number {
  return answerCount(state) - answerCount(rewindAnswers(state, config, questionId));
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
