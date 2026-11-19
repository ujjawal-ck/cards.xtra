/** Card advisor answer text: decode, encode and the eligibility form. */
jest.mock('../../../api/bankkaro', () => ({ checkEligibility: jest.fn() }));

import { ADVISOR_CONFIG } from '../config';
import { decodeChoice, encodeEligForm, encodeMulti, isEligFormValid, parseEligForm, type EligFormValue } from '../answers';
import { NOT_SURE } from '../types';

const Q = ADVISOR_CONFIG.questions;
const idsOf = (list: Array<{ id: string }>) => list.map((o) => o.id);

describe('decodeChoice', () => {
  it('single choice: one option id', () => {
    expect(idsOf(decodeChoice(Q.fee, 'free'))).toEqual(['free']);
    // A single question never gives two picks.
    expect(idsOf(decodeChoice(Q.fee, 'free,any'))).toEqual(['free']);
  });

  it('multi choice: the picks in option order', () => {
    expect(idsOf(decodeChoice(Q.need, 'fuel,shopping'))).toEqual(['shopping', 'fuel']);
    expect(idsOf(decodeChoice(Q.need, 'shopping,fuel'))).toEqual(['shopping', 'fuel']);
  });

  it('caps at multi.max, in option order', () => {
    expect(idsOf(decodeChoice(Q.need, 'travel,bills,fuel,food,shopping'))).toEqual(['shopping', 'food', 'fuel']);
  });

  it('an exclusive option counts alone, and is dropped next to others', () => {
    expect(idsOf(decodeChoice(Q.need, 'everything'))).toEqual(['everything']);
    expect(idsOf(decodeChoice(Q.need, 'everything,fuel'))).toEqual(['fuel']);
    expect(idsOf(decodeChoice(Q.missing, 'better'))).toEqual(['better']);
    expect(idsOf(decodeChoice(Q.missing, 'better,travel'))).toEqual(['travel']);
  });

  it('ignores unknown ids; nothing for undefined and NOT_SURE', () => {
    expect(idsOf(decodeChoice(Q.need, 'fuel,nope'))).toEqual(['fuel']);
    expect(decodeChoice(Q.need, 'nope')).toEqual([]);
    expect(decodeChoice(Q.need, undefined)).toEqual([]);
    expect(decodeChoice(Q.need, NOT_SURE)).toEqual([]);
  });

  it('a question that is not a choice gives nothing', () => {
    expect(decodeChoice(Q.eligForm, 'salaried|35000|110001')).toEqual([]);
  });
});

describe('encodeMulti', () => {
  it('builds the canonical text and round-trips through decodeChoice', () => {
    const text = encodeMulti(Q.need, ['fuel', 'shopping']);
    expect(text).toBe('shopping,fuel');
    expect(idsOf(decodeChoice(Q.need, text))).toEqual(['shopping', 'fuel']);
  });

  it('drops an exclusive id next to others, caps, and gives "" for nothing valid', () => {
    expect(encodeMulti(Q.need, ['everything', 'fuel'])).toBe('fuel');
    expect(encodeMulti(Q.need, ['travel', 'bills', 'fuel', 'shopping'])).toBe('shopping,fuel,bills');
    expect(encodeMulti(Q.need, ['nope'])).toBe('');
  });
});

describe('eligibility form', () => {
  const values: EligFormValue[] = [
    { job: 'salaried', incomeMonthly: 35000, pincode: '110001' },
    { job: 'self', incomeMonthly: 120000, pincode: '400001' },
    { job: 'none' },
  ];

  it('round-trips encode and parse', () => {
    for (const v of values) {
      expect(isEligFormValid(v)).toBe(true);
      expect(parseEligForm(encodeEligForm(v))).toEqual(v);
    }
    expect(encodeEligForm({ job: 'salaried', incomeMonthly: 35000, pincode: '110001' })).toBe('salaried|35000|110001');
    expect(encodeEligForm({ job: 'none' })).toBe('none||');
  });

  it('rejects invalid text', () => {
    for (const bad of [
      'salaried|35000|012345', // pincode starts with 0
      'salaried|35000|11001', // five digits
      'salaried|0|110001', // income 0
      'salaried|35k|110001', // letters
      'boss|35000|110001', // unknown job
      'salaried|35000', // missing pincode
      'salaried', // missing parts
      '',
      undefined,
    ]) {
      expect(parseEligForm(bad)).toBeNull();
    }
  });

  it('isEligFormValid: none needs nothing; the others need an income above 0 and a pincode', () => {
    expect(isEligFormValid({ job: 'none' })).toBe(true);
    expect(isEligFormValid({ job: 'salaried', incomeMonthly: 0, pincode: '110001' })).toBe(false);
    expect(isEligFormValid({ job: 'salaried', incomeMonthly: 35000 })).toBe(false);
    expect(isEligFormValid({ job: 'self', pincode: '110001' })).toBe(false);
    expect(isEligFormValid({ job: 'salaried', incomeMonthly: 35000, pincode: '012345' })).toBe(false);
    expect(isEligFormValid({ job: 'salaried', incomeMonthly: 35000.5, pincode: '110001' })).toBe(false);
  });
});
