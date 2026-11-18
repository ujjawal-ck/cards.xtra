/**
 * useAdvisor: state, eligibility query and analytics for the card advisor screen.
 *
 * The state is only the answers. Slots, the next question and the reveal are derived from it
 * (the engine in src/lib/advisor). The eligibility call is the only network call besides the
 * catalogue (useCards). Saved eligibility inputs are read, never written.
 * Analytics never carries an income amount or a pincode.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCards } from '../../query/useCards';
import { fetchEligibility } from '../../api/eligibility';
import { loadSavedProfile } from '../../lib/savedProfile';
import { analytics, Events } from '../../analytics';
import { ADVISOR_CONFIG } from '../../lib/advisor/config';
import { deriveSlots, nextQuestion, buildReveal, answerPills } from '../../lib/advisor/engine';
import { EMPTY_ADVISOR_STATE, NOT_SURE } from '../../lib/advisor/types';
import type { AdvisorEligibility, AdvisorState, QuestionId } from '../../lib/advisor/types';

export type AdvisorSource = 'search' | 'search_no_results';

interface SavedInputs {
  pincode: string;
  incomeMonthly: number;
  selfEmployed: boolean;
}

const TEN_MINUTES = 10 * 60 * 1000;
const PINCODE = /^[1-9]\d{5}$/;

export function useAdvisor(source: AdvisorSource | undefined) {
  const cardsQ = useCards();
  const cards = useMemo(() => cardsQ.data ?? [], [cardsQ.data]);

  const [state, setState] = useState<AdvisorState>(EMPTY_ADVISOR_STATE);
  const [prevTop, setPrevTop] = useState<string[]>([]);
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

  const step = useMemo(
    () => nextQuestion(state, ADVISOR_CONFIG, cards, { eligibilityKnown }),
    [state, cards, eligibilityKnown],
  );

  const reveal = useMemo(
    () =>
      state.answers.opener
        ? buildReveal({ state, config: ADVISOR_CONFIG, cards, eligibility, previousTop: prevTop })
        : null,
    [state, cards, eligibility, prevTop],
  );

  const pills = useMemo(() => answerPills(state, ADVISOR_CONFIG), [state]);

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
  const answer = useCallback(
    (id: QuestionId, value: string) => {
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
      setPrevTop(reveal ? reveal.top.map((t) => t.card.id) : []);
      setState((s) => ({ ...s, answers: { ...s.answers, [id]: value } }));
    },
    [reveal],
  );

  const reopen = useCallback((id: QuestionId) => {
    if (id === 'opener') {
      setState(EMPTY_ADVISOR_STATE);
      setPrevTop([]);
      return;
    }
    setState((s) => {
      const answers = { ...s.answers };
      delete answers[id];
      return { ...s, answers };
    });
  }, []);

  const markHeld = useCallback((cardId: string) => {
    setState((s) => (s.held.includes(cardId) ? s : { ...s, held: [...s.held, cardId] }));
  }, []);

  const changeSavedDetails = useCallback(() => setUseSaved(false), []);

  const restart = useCallback(() => {
    setState(EMPTY_ADVISOR_STATE);
    setPrevTop([]);
  }, []);

  const retryEligibility = useCallback(() => {
    eligibilityQ.refetch();
  }, [eligibilityQ]);

  return {
    state,
    step,
    reveal,
    pills,
    usingSaved: eligibilityKnown,
    isCheckingEligibility: !!inputs && eligibilityQ.isLoading,
    eligibilityError: !!inputs && eligibilityQ.isError,
    isLoading: cardsQ.isLoading,
    isError: cardsQ.isError,
    hasCards: cards.length > 0,
    refetch: cardsQ.refetch,
    answer,
    reopen,
    markHeld,
    changeSavedDetails,
    restart,
    retryEligibility,
  };
}
