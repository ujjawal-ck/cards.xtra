/**
 * Card advisor: how an answer is stored as text.
 *
 * `AdvisorState.answers` holds one string for each question. This file is the
 * only place that builds or reads that string. The engine turns a decoded
 * answer into slots (applyAnswer in engine.ts).
 *
 *   single choice   the option id                      "fuel"
 *   multi choice    option ids joined by ','           "shopping,fuel"
 *                   (in the order of question.options)
 *   not sure        NOT_SURE
 *   eligibility     job | income | pincode             "salaried|35000|110001"
 *                   not earning: no income, no pincode  "none||"
 */
import { NOT_SURE, type AdvisorOption, type AdvisorQuestion } from './types';

const MULTI_SEP = ',';
const FORM_SEP = '|';
const PINCODE_RE = /^[1-9]\d{5}$/;
const INCOME_RE = /^[1-9]\d{0,8}$/;

/**
 * The options an answer picked, in the order of `question.options`.
 * Empty for no answer, NOT_SURE, an unknown id, or a question that is not a choice.
 * A single-select question gives at most one option. A multi-select question
 * gives at most `multi.max`. An exclusive option counts only when it is alone.
 */
export function decodeChoice(question: AdvisorQuestion, answer: string | undefined): AdvisorOption[] {
  if (question.kind !== 'choice' || answer === undefined || answer === NOT_SURE) return [];
  const ids = answer.split(MULTI_SEP);
  const picked = question.options.filter((o) => ids.includes(o.id));
  if (!question.multi) return picked.slice(0, 1);
  const combinable = picked.length > 1 ? picked.filter((o) => !o.exclusive) : picked;
  return combinable.slice(0, question.multi.max);
}

/** The answer text for the picked option ids of a choice question. '' when nothing valid is picked. */
export function encodeMulti(question: AdvisorQuestion, optionIds: string[]): string {
  return decodeChoice(question, optionIds.join(MULTI_SEP))
    .map((o) => o.id)
    .join(MULTI_SEP);
}

export type EligJob = 'salaried' | 'self' | 'none';

export interface EligFormValue {
  job: EligJob;
  /** Rupees for one month. Absent when `job` is 'none'. */
  incomeMonthly?: number;
  /** Six digits. Absent when `job` is 'none'. */
  pincode?: string;
}

/** True when the form can be sent: 'none' needs nothing more; the others need an income above 0 and a pincode. */
export function isEligFormValid(value: EligFormValue): boolean {
  if (value.job === 'none') return true;
  return (
    value.incomeMonthly !== undefined &&
    INCOME_RE.test(String(value.incomeMonthly)) &&
    value.pincode !== undefined &&
    PINCODE_RE.test(value.pincode)
  );
}

/** The answer text for the form. Call only with a valid value (isEligFormValid). */
export function encodeEligForm(value: EligFormValue): string {
  if (value.job === 'none') return ['none', '', ''].join(FORM_SEP);
  return [value.job, String(value.incomeMonthly ?? ''), value.pincode ?? ''].join(FORM_SEP);
}

/** The form value of an answer text, or null when the text is not a valid form answer. */
export function parseEligForm(answer: string | undefined): EligFormValue | null {
  if (answer === undefined) return null;
  const [job, income = '', pincode = ''] = answer.split(FORM_SEP);
  if (job === 'none') return { job };
  if (job !== 'salaried' && job !== 'self') return null;
  if (!INCOME_RE.test(income) || !PINCODE_RE.test(pincode)) return null;
  return { job, incomeMonthly: Number(income), pincode };
}
