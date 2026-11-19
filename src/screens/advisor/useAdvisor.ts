/**
 * useAdvisor: state, eligibility query and analytics for the card advisor chat.
 *
 * The state is only the answers. The transcript (messages), the next question and the reveal are
 * derived from it (src/lib/advisor). The eligibility call is the only network call besides the
 * catalogue (useCards). Saved eligibility inputs are read, never written.
 * Analytics never carries an income amount or a pincode.
 *
 * The hook also drives the mascot: it derives the avatar state from real screen events.
 * `messageArriving` is true from the moment a new advisor message id appears until the screen
 * calls `markArrivalDone(id)` (the entrance ended, the row unmounted, or no entrance runs).
 *
 * The chat lives in memory for the app session (advisorSession.ts): leaving and coming back keeps
 * the answers, and a remount does not fire the analytics of the restored chat again.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCards } from '../../query/useCards';
import { fetchEligibility } from '../../api/eligibility';
import { loadSavedProfile } from '../../lib/savedProfile';
import { analytics, Events } from '../../analytics';
import { ADVISOR_CONFIG } from '../../lib/advisor/config';
import { deriveSlots } from '../../lib/advisor/engine';
import {
  answeredList,
  answersLost,
  avatarStateFor,
  buildTranscript,
  lastAnswered,
  rewindAnswers,
} from '../../lib/advisor/transcript';
import { NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorEligibility, AdvisorState, QuestionId } from '../../lib/advisor/types';
import type { ChatMessage } from '../../lib/advisor/chatTypes';
import { getAdvisorSession, type SavedInputs } from './advisorSession';

export type AdvisorSource = 'search' | 'search_no_results';

const TEN_MINUTES = 10 * 60 * 1000;
const PINCODE = /^[1-9]\d{5}$/;
/** How long the mascot celebrates when cards turn "likely to qualify" (ms). */
const LIKELY_CELEBRATION_MS = 2000;
/** The id of the eligibility status message. One id for both states. */
const STATUS_ID = 'elig-status';

const answerCount = (state: AdvisorState) => Object.values(state.answers).filter((v) => v !== undefined).length;

/** The id of the newest message that is not the user's own. */
function lastAdvisorId(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].kind !== 'user-answer') return messages[i].id;
  }
  return null;
}

export function useAdvisor(source: AdvisorSource | undefined) {
  const cardsQ = useCards();
  const cards = useMemo(() => cardsQ.data ?? [], [cardsQ.data]);

  // The chat starts from the app session and writes every change back to it.
  const [state, setState] = useState<AdvisorState>(() => getAdvisorSession().state);
  const [saved, setSaved] = useState<SavedInputs | null>(() => getAdvisorSession().saved);
  const [useSaved, setUseSaved] = useState(() => getAdvisorSession().useSaved === true);
  const [introDone, setIntroDone] = useState(() => getAdvisorSession().introDone);
  /** True until the restored chat is first on screen: its messages are then marked as seen. */
  const restorePending = useRef(answerCount(getAdvisorSession().state) > 0);

  useEffect(() => {
    getAdvisorSession().state = state;
  }, [state]);

  // Saved eligibility inputs: read once in the app session. Coming back keeps the result, so a
  // "Change" tap is not undone.
  useEffect(() => {
    if (getAdvisorSession().useSaved !== null) return;
    let alive = true;
    loadSavedProfile().then((profile) => {
      if (!alive) return;
      const session = getAdvisorSession();
      const e = profile.eligibility;
      const income = Number(e?.income);
      if (e && PINCODE.test(e.pincode) && Number.isFinite(income) && income > 0) {
        const inputs = { pincode: e.pincode, incomeMonthly: income, selfEmployed: e.incomeType === 'self-employed' };
        session.saved = inputs;
        session.useSaved = true;
        setSaved(inputs);
        setUseSaved(true);
      } else {
        session.useSaved = false;
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const slots = useMemo(() => deriveSlots(state, ADVISOR_CONFIG), [state]);

  // Eligibility inputs: the answers first, then the saved details.
  const inputs = useMemo<SavedInputs | null>(() => {
    if ((slots.job === 'salaried' || slots.job === 'self-employed') && slots.incomeMonthly && slots.pincode) {
      return {
        pincode: slots.pincode,
        incomeMonthly: slots.incomeMonthly,
        selfEmployed: slots.job === 'self-employed',
      };
    }
    return useSaved && saved ? saved : null;
  }, [slots.job, slots.incomeMonthly, slots.pincode, useSaved, saved]);

  const eligibilityQ = useQuery({
    queryKey: ['bk', 'advisor-eligibility', inputs?.pincode, inputs?.incomeMonthly, inputs?.selfEmployed],
    queryFn: () => fetchEligibility(inputs as SavedInputs),
    enabled: !!inputs,
    staleTime: TEN_MINUTES,
    retry: 1,
  });

  const eligibility = useMemo<AdvisorEligibility | null>(() => {
    if (!inputs || !eligibilityQ.data) return null;
    return { eligibleAliases: eligibilityQ.data.eligibleAliases, incomeMonthly: inputs.incomeMonthly };
  }, [inputs, eligibilityQ.data]);

  const eligibilityKnown = useSaved && !!saved;

  // "Checking" uses isFetching, not isLoading: a retry after an error keeps the query in the
  // error status (isLoading stays false), but the user must still see that a check runs.
  const isCheckingEligibility = !!inputs && eligibilityQ.isFetching && !eligibilityQ.data;
  const eligibilityError = !!inputs && eligibilityQ.isError && !eligibilityQ.isFetching;

  const transcript = useMemo(
    () => buildTranscript({ state, config: ADVISOR_CONFIG, cards, eligibility, eligibilityKnown }),
    [state, cards, eligibility, eligibilityKnown],
  );
  const { step, reveal } = transcript;
  /** The catalogue is loaded, so the transcript on screen is the real one. Analytics waits for it. */
  const ready = cards.length > 0;

  // The eligibility status goes just before the tail (the current question or the closing line),
  // so the question that waits for an answer stays last, next to the reply tray.
  const messages = useMemo<ChatMessage[]>(() => {
    const base = transcript.messages;
    const status: 'checking' | 'check-failed' | null = isCheckingEligibility
      ? 'checking'
      : eligibilityError
        ? 'check-failed'
        : null;
    if (!status) return base;
    const statusMessage: ChatMessage = { id: STATUS_ID, kind: 'agent-status', status };
    const tail = base[base.length - 1];
    const tailIsPrompt =
      !!tail &&
      ((tail.kind === 'agent-question' && tail.current) || (tail.kind === 'agent-text' && tail.id === 'closing'));
    if (!tailIsPrompt) return [...base, statusMessage];
    return [...base.slice(0, -1), statusMessage, tail];
  }, [transcript.messages, isCheckingEligibility, eligibilityError]);

  // ---- Avatar: a new advisor message is arriving ----
  // Only ids never seen before count. The catalogue must be loaded: before that the screen shows
  // skeletons, so no message is on screen.
  const newestAdvisorId = cards.length > 0 ? lastAdvisorId(messages) : null;
  const seenAdvisorIds = useRef<Set<string>>(new Set());
  const [arrivingId, setArrivingId] = useState<string | null>(null);
  // Forget ids that left the transcript (a rewind, "Start over"): when one comes back, it arrives again.
  useEffect(() => {
    const present = new Set(messages.map((m) => m.id));
    seenAdvisorIds.current.forEach((id) => {
      if (!present.has(id)) seenAdvisorIds.current.delete(id);
    });
  }, [messages]);
  useEffect(() => {
    if (!newestAdvisorId) return;
    if (restorePending.current) {
      // A restored chat: every message is already on screen. No arrival.
      restorePending.current = false;
      messages.forEach((m) => seenAdvisorIds.current.add(m.id));
      return;
    }
    if (seenAdvisorIds.current.has(newestAdvisorId)) {
      // A rewind or a status change can make an older id the newest again. No entrance runs
      // for it, so clear any arrival still pending: the flag can never stick on.
      setArrivingId(null);
      return;
    }
    seenAdvisorIds.current.add(newestAdvisorId);
    setArrivingId(newestAdvisorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestAdvisorId]);

  // ---- Analytics: a quick tip was shown ----
  // Once per tip id per chat. A tip that leaves the transcript (a rewind) is forgotten, so it
  // counts again if it comes back, like seenAdvisorIds above. Kept in the app session.
  const seenTipIds = useRef<Set<string>>(new Set(getAdvisorSession().seenTipIds));
  useEffect(() => {
    if (!ready) return;
    const present = new Set<string>();
    for (const m of messages) {
      if (m.kind !== 'agent-tip') continue;
      present.add(m.id);
      if (seenTipIds.current.has(m.id)) continue;
      seenTipIds.current.add(m.id);
      analytics.track(Events.ADVISOR_TIP_VIEW, { tip_id: m.id.replace(/^t:/, '') });
    }
    seenTipIds.current.forEach((id) => {
      if (!present.has(id)) seenTipIds.current.delete(id);
    });
    getAdvisorSession().seenTipIds = [...seenTipIds.current];
  }, [messages, ready]);

  /** The screen calls this when the entrance of message `id` has ended (or will not run). */
  const markArrivalDone = useCallback((id: string) => {
    setArrivingId((current) => (current === id ? null : current));
  }, []);

  // ---- Avatar: cards just turned "likely to qualify" ----
  const [justFoundLikely, setJustFoundLikely] = useState(false);
  const proof = reveal?.proof;
  const prevProof = useRef(proof);
  useEffect(() => {
    const before = prevProof.current;
    prevProof.current = proof;
    if (proof !== 'likely' || before === 'likely') return;
    setJustFoundLikely(true);
    const timer = setTimeout(() => setJustFoundLikely(false), LIKELY_CELEBRATION_MS);
    return () => {
      clearTimeout(timer);
      setJustFoundLikely(false);
    };
  }, [proof]);

  const avatarState = avatarStateFor({
    catalogueError: cardsQ.isError,
    eligibilityError,
    eligibilityFetching: isCheckingEligibility,
    messageArriving: arrivingId !== null,
    justFoundLikely,
    waitingForAnswer: !!step,
  });

  // ---- Analytics ----
  // Each event compares with the app session, so a remount does not fire it again.
  const questionId = step?.question.id;
  useEffect(() => {
    if (!ready) return;
    const session = getAdvisorSession();
    const id = questionId ?? null;
    if (id === session.lastQuestionViewed) return;
    session.lastQuestionViewed = id;
    if (!step) return;
    analytics.track(Events.ADVISOR_QUESTION_VIEW, {
      question_id: step.question.id,
      step: step.stepNumber,
      journey: slots.journey ?? 'none',
    });
    if (step.question.id === 'eligBridge') {
      analytics.track(Events.ADVISOR_ELIGIBILITY_BRIDGE, { outcome: 'shown' });
    }
    // Fire when the shown question changes, not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, ready]);

  const opener = state.answers.opener;
  useEffect(() => {
    const session = getAdvisorSession();
    if (!opener) {
      session.started = false;
      return;
    }
    if (!introDone) {
      session.introDone = true;
      setIntroDone(true);
    }
    if (session.started) return;
    session.started = true;
    analytics.track(Events.ADVISOR_START, {
      source: source ?? 'none',
      journey: slots.journey ?? 'none',
      config_version: ADVISOR_CONFIG.version,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener]);

  const revealKey = reveal ? `${reveal.top.map((t) => t.card.id).join(',')}|${reveal.proof}` : '';
  useEffect(() => {
    if (!ready) return;
    const session = getAdvisorSession();
    // No cards (a start over): forget the key, so the same cards count again when they come back.
    if (!reveal) {
      session.lastRevealKey = '';
      return;
    }
    if (revealKey === session.lastRevealKey) return;
    session.lastRevealKey = revealKey;
    session.revealCount += 1;
    analytics.track(Events.ADVISOR_REVEAL, {
      reveal_number: session.revealCount,
      proof: reveal.proof,
      card_count: reveal.total,
      relaxed: reveal.dropped.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, ready]);

  const lastErrorAt = useRef(0);
  useEffect(() => {
    if (eligibilityQ.isError && eligibilityQ.errorUpdatedAt !== lastErrorAt.current) {
      lastErrorAt.current = eligibilityQ.errorUpdatedAt;
      analytics.track(Events.ADVISOR_ELIGIBILITY_ERROR);
    }
  }, [eligibilityQ.isError, eligibilityQ.errorUpdatedAt]);

  // ---- Actions ----
  const answer = useCallback((id: QuestionId, value: string) => {
    const question = ADVISOR_CONFIG.questions[id];
    analytics.track(Events.ADVISOR_ANSWER, {
      question_id: id,
      option: question?.kind === 'pincode' ? 'entered' : value,
      not_sure: value === NOT_SURE,
    });
    if (id === 'eligBridge') {
      const wants = question.options.find((o) => o.id === value)?.set.wantsEligibility === true;
      analytics.track(Events.ADVISOR_ELIGIBILITY_BRIDGE, { outcome: wants ? 'accepted' : 'declined' });
    }
    setState((s) => ({ ...s, answers: { ...s.answers, [id]: value } }));
  }, []);

  /** Change an earlier answer: that answer and every later one go. */
  const rewind = useCallback(
    (id: QuestionId, via: 'bubble' | 'sheet') => {
      const lost = answersLost(state, ADVISOR_CONFIG, id);
      if (lost === 0) return;
      analytics.track(Events.ADVISOR_REWIND, { via, answers_lost: lost });
      setState(rewindAnswers(state, ADVISOR_CONFIG, id));
    },
    [state],
  );

  /** Remove only the last answer in asking order. */
  const back = useCallback(() => {
    const id = lastAnswered(state, ADVISOR_CONFIG);
    if (!id) return;
    analytics.track(Events.ADVISOR_REWIND, { via: 'back', answers_lost: answersLost(state, ADVISOR_CONFIG, id) });
    setState(rewindAnswers(state, ADVISOR_CONFIG, id));
  }, [state]);

  const markHeld = useCallback((cardId: string) => {
    setState((s) => (s.held.includes(cardId) ? s : { ...s, held: [...s.held, cardId] }));
  }, []);

  /** Bring back the card hidden last by "I have this". */
  const undoHeld = useCallback(() => {
    if (state.held.length === 0) return;
    // No card id: a card the user owns never goes to analytics.
    analytics.track(Events.ADVISOR_CARD_ACTION, { action: 'undo_have_this' });
    setState({ ...state, held: state.held.slice(0, -1) });
  }, [state]);

  const changeSavedDetails = useCallback(() => {
    getAdvisorSession().useSaved = false;
    setUseSaved(false);
  }, []);

  /** Clear the answers and the held cards. The intro mascot and the saved-details choice stay. */
  const restart = useCallback(() => {
    analytics.track(Events.ADVISOR_REWIND, { via: 'start_over', answers_lost: answerCount(state) });
    setState({ answers: {}, held: [] });
  }, [state]);

  const answered = useMemo(() => answeredList(state, ADVISOR_CONFIG), [state]);

  const retryEligibility = useCallback(() => {
    eligibilityQ.refetch();
  }, [eligibilityQ]);

  return {
    state,
    messages,
    step,
    reveal,
    avatarState,
    /** The newest advisor message whose entrance has not ended, or null. */
    arrivingId,
    markArrivalDone,
    usingSaved: eligibilityKnown,
    /** The user has answered at least once in this app session. The large intro mascot is gone for good. */
    introDone,
    /** The answered questions, for "Change an answer". */
    answered,
    /** false when the user said "Not now" to the eligibility check. */
    wantsEligibility: slots.wantsEligibility,
    isCheckingEligibility,
    eligibilityError,
    isLoading: cardsQ.isLoading,
    isError: cardsQ.isError,
    hasCards: cards.length > 0,
    refetch: cardsQ.refetch,
    answer,
    rewind,
    back,
    markHeld,
    undoHeld,
    changeSavedDetails,
    restart,
    retryEligibility,
  };
}
