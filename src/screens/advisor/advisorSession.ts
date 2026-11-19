/**
 * advisorSession: the card advisor chat kept in memory for the app session.
 *
 * Leaving the advisor (the header back arrow, a card page, the full list) and coming back keeps
 * the answers. Nothing here goes to disk. The store is one live object: useAdvisor reads it on
 * mount and writes every change back. Call resetAdvisorSession() on logout.
 */
import { NOT_SURE, type AdvisorQuestion, type AdvisorState } from '../../lib/advisor/types';
import { isEligFormValid, type EligFormValue, type EligJob } from '../../lib/advisor/answers';
import { toAsciiDigits } from '../../lib/amountInput';

/** The saved eligibility details, as the advisor uses them. */
export interface SavedInputs {
  pincode: string;
  incomeMonthly: number;
  selfEmployed: boolean;
}

export interface AdvisorSession {
  state: AdvisorState;
  /** null until the saved eligibility details were read once. */
  useSaved: boolean | null;
  /** The saved eligibility details read with `useSaved`, kept so a remount does not wait for the read.
   *  In memory only. */
  saved: SavedInputs | null;
  /** What the user typed in the eligibility form, kept for the app session so the form comes back
   *  filled. "Start over" and resetAdvisorSession clear it. In memory only. */
  formDraft: { job: EligJob | null; income: string; pincode: string } | null;
  /** The large intro mascot was shown and the user has answered once. */
  introDone: boolean;
  /** Analytics memory, so a remount does not fire events again. */
  started: boolean; // advisor_start fired for the current opener answer
  revealCount: number;
  lastRevealKey: string;
  seenTipIds: string[];
  lastQuestionViewed: string | null;
}

function empty(): AdvisorSession {
  return {
    state: { answers: {}, held: [] },
    useSaved: null,
    saved: null,
    formDraft: null,
    introDone: false,
    started: false,
    revealCount: 0,
    lastRevealKey: '',
    seenTipIds: [],
    lastQuestionViewed: null,
  };
}

const session: AdvisorSession = empty();

/** The live object. */
export function getAdvisorSession(): AdvisorSession {
  return session;
}

/** Back to empty, in place (a held reference stays valid). The lead calls it on logout. */
export function resetAdvisorSession(): void {
  Object.assign(session, empty());
}

// ---- Pure helpers of the reply tray and the form (no UI imports: easy to test) ----

/** Keep only digits, at most `maxLength`. A Hindi keyboard can send Devanagari digits (०-९):
 *  they become 0-9 first, so the checks and the API get plain digits. */
export function toDigits(text: string, maxLength: number): string {
  return toAsciiDigits(text).replace(/\D/g, '').slice(0, maxLength);
}

export interface EligFormState {
  job: EligJob | null;
  /** Digits only, no leading zero. */
  income: string;
  pincode: string;
}

/** The form to start from: the session draft, else the saved details (when the user tapped
 *  "Change"), else empty. */
export function initialEligForm(saved: SavedInputs | null): EligFormState {
  const draft = getAdvisorSession().formDraft;
  if (draft) return draft;
  if (saved) return { job: saved.selfEmployed ? 'self' : 'salaried', income: String(saved.incomeMonthly), pincode: saved.pincode };
  return { job: null, income: '', pincode: '' };
}

/** The value to send, or null when the form is not ready. */
export function eligFormValue(form: EligFormState): EligFormValue | null {
  if (!form.job) return null;
  const value: EligFormValue =
    form.job === 'none'
      ? { job: 'none' }
      : { job: form.job, incomeMonthly: form.income ? Number(form.income) : undefined, pincode: form.pincode };
  return isEligFormValid(value) ? value : null;
}

/** The ADVISOR_ANSWER params. The eligibility form is never sent: no job, income or pincode. */
export function answerEventParams(question: AdvisorQuestion, value: string) {
  if (question.kind === 'eligibility') return { question_id: question.id, option: 'entered', not_sure: false };
  return {
    question_id: question.id,
    option: value,
    not_sure: value === NOT_SURE,
    ...(question.multi && value !== NOT_SURE ? { picks: value.split(',').length } : {}),
  };
}
