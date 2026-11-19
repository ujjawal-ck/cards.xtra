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
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCards } from '../../query/useCards';
import { fetchEligibility } from '../../api/eligibility';
import { loadSavedProfile } from '../../lib/savedProfile';
import { analytics, Events } from '../../analytics';
import { ADVISOR_CONFIG } from '../../lib/advisor/config';
import { deriveSlots } from '../../lib/advisor/engine';
import { buildTranscript, rewindAnswers, avatarStateFor } from '../../lib/advisor/transcript';
import { EMPTY_ADVISOR_STATE, NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorEligibility, AdvisorState, QuestionId } from '../../lib/advisor/types';
import type { ChatMessage } from '../../lib/advisor/chatTypes';

export type AdvisorSource = 'search' | 'search_no_results';

interface SavedInputs {
  pincode: string;
  incomeMonthly: number;
  selfEmployed: boolean;
}

const TEN_MINUTES = 10 * 60 * 1000;
const PINCODE = /^[1-9]\d{5}$/;
/** How long the mascot celebrates when cards turn "likely to qualify" (ms). */
const LIKELY_CELEBRATION_MS = 2000;
/** The id of the eligibility status message. One id for both states. */
const STATUS_ID = 'elig-status';

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

  const [state, setState] = useState<AdvisorState>(EMPTY_ADVISOR_STATE);
  const [saved, setSaved] = useState<SavedInputs | null>(null);
  const [useSaved, setUseSaved] = useState(false);

  // Saved eligibility inputs: read once on mount.
  useEffect(() => {
    let alive = true;
    loadSavedProfile().then((profile) => {
      const e = profile.eligibility;
      if (!alive || !e) return;
      const income = Number(e.income);
      if (PINCODE.test(e.pincode) && Number.isFinite(income) && income > 0) {
        setSaved({ pincode: e.pincode, incomeMonthly: income, selfEmployed: e.incomeType === 'self-employed' });
        setUseSaved(true);
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
    if (seenAdvisorIds.current.has(newestAdvisorId)) {
      // A rewind or a status change can make an older id the newest again. No entrance runs
      // for it, so clear any arrival still pending: the flag can never stick on.
      setArrivingId(null);
      return;
    }
    seenAdvisorIds.current.add(newestAdvisorId);
    setArrivingId(newestAdvisorId);
  }, [newestAdvisorId]);

  // ---- Analytics: a quick tip was shown ----
  // Once per tip id per chat. A tip that leaves the transcript (a rewind) is forgotten, so it
  // counts again if it comes back, like seenAdvisorIds above.
  const seenTipIds = useRef<Set<string>>(new Set());
  useEffect(() => {
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
  }, [messages]);

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
  const questionId = step?.question.id;
  useEffect(() => {
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
  }, [questionId]);

  const started = useRef(false);
  const opener = state.answers.opener;
  useEffect(() => {
    if (!opener) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    analytics.track(Events.ADVISOR_START, {
      source: source ?? 'none',
      journey: slots.journey ?? 'none',
      config_version: ADVISOR_CONFIG.version,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opener]);

  const revealCount = useRef(0);
  const revealKey = reveal ? `${reveal.top.map((t) => t.card.id).join(',')}|${reveal.proof}` : '';
  useEffect(() => {
    if (!reveal) return;
    revealCount.current += 1;
    analytics.track(Events.ADVISOR_REVEAL, {
      reveal_number: revealCount.current,
      proof: reveal.proof,
      card_count: reveal.total,
      relaxed: reveal.dropped.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

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

  /** Change an earlier answer: that answer and every later one go. No analytics event fires here:
   *  no event exists for it, and ADVISOR_ANSWER would count a tap that is not an answer. */
  const rewind = useCallback((id: QuestionId) => {
    setState((s) => rewindAnswers(s, ADVISOR_CONFIG, id));
  }, []);

  const markHeld = useCallback((cardId: string) => {
    setState((s) => (s.held.includes(cardId) ? s : { ...s, held: [...s.held, cardId] }));
  }, []);

  const changeSavedDetails = useCallback(() => setUseSaved(false), []);

  const restart = useCallback(() => {
    setState(EMPTY_ADVISOR_STATE);
  }, []);

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
    isCheckingEligibility,
    eligibilityError,
    isLoading: cardsQ.isLoading,
    isError: cardsQ.isError,
    hasCards: cards.length > 0,
    refetch: cardsQ.refetch,
    answer,
    rewind,
    markHeld,
    changeSavedDetails,
    restart,
    retryEligibility,
  };
}
