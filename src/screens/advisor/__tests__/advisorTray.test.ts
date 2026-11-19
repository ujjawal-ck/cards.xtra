/** Pure helpers of the advisor reply tray. */
import { toDigits, eligFormValue, answerEventParams } from '../advisorSession';
import { encodeEligForm } from '../../../lib/advisor/answers';
import type { AdvisorQuestion } from '../../../lib/advisor/types';

// Small stand-ins, so the test does not depend on the question catalogue.
const q = (id: AdvisorQuestion['id'], kind: AdvisorQuestion['kind'], multi?: { max: number }) =>
  ({ id, kind, multi, ask: '', options: [] }) as unknown as AdvisorQuestion;
const ELIG = q('eligForm', 'eligibility');
const NEED = q('need', 'choice', { max: 3 });
const OPENER = q('opener', 'choice');

describe('toDigits', () => {
  it('keeps ASCII digits', () => expect(toDigits('110001', 6)).toBe('110001'));
  it('converts Devanagari digits', () => expect(toDigits('११०००१', 6)).toBe('110001'));
  it('drops other characters from mixed text', () => expect(toDigits('₹1,2a३', 9)).toBe('123'));
  it('cuts at the max length', () => expect(toDigits('1234567', 6)).toBe('123456'));
});

describe('eligFormValue', () => {
  it('is null with no job', () => expect(eligFormValue({ job: null, income: '', pincode: '' })).toBeNull());
  it('is null with a short pincode', () =>
    expect(eligFormValue({ job: 'salaried', income: '35000', pincode: '11000' })).toBeNull());
  it('is null with a pincode that starts with 0', () =>
    expect(eligFormValue({ job: 'self', income: '35000', pincode: '010001' })).toBeNull());
  it('is valid for none without income', () =>
    expect(eligFormValue({ job: 'none', income: '', pincode: '' })).toEqual({ job: 'none' }));
  it('is valid when complete', () =>
    expect(eligFormValue({ job: 'salaried', income: '35000', pincode: '110001' })).toEqual({
      job: 'salaried',
      incomeMonthly: 35000,
      pincode: '110001',
    }));
});

describe('answerEventParams', () => {
  it('sends nothing about the form', () => {
    const answer = encodeEligForm({ job: 'salaried', incomeMonthly: 35000, pincode: '110001' });
    const json = JSON.stringify(answerEventParams(ELIG, answer));
    expect(json).not.toContain('35000');
    expect(json).not.toContain('110001');
    expect(json).not.toContain('salaried');
    expect(answerEventParams(ELIG, answer).option).toBe('entered');
  });
  it('sends the option and the pick count for a multi question', () => {
    expect(answerEventParams(NEED, 'shopping,fuel')).toEqual({
      question_id: 'need',
      option: 'shopping,fuel',
      not_sure: false,
      picks: 2,
    });
  });
  it('sends no picks for a single question', () => {
    expect(answerEventParams(OPENER, 'first')).toEqual({
      question_id: 'opener',
      option: 'first',
      not_sure: false,
    });
  });
});
