/**
 * mapBkCardToCardModel → CardModel.crossSell (engine input for the Home
 * cross-sell rail). Raw rows are trimmed from the BankKaro catalogue shape.
 */
import { mapBkCardToCardModel } from '../cardMapper';
import type { BkCard } from '../cardMapper';

const raw = (over: Partial<BkCard> = {}): BkCard => ({
  id: 7,
  name: 'SBI Cashback Credit Card',
  card_alias: 'sbi-cashback-credit-card',
  bank_id: 3,
  joining_fee_text: '999',
  annual_fee_text: '2500',
  commission: '1400',
  bk_commission: '1800',
  income_salaried: 'N/A',
  crif: '750',
  invite_only: false,
  priority: 3,
  tags: [
    { id: 1, name: 'Shopping' },
    { id: 2, name: 'Dining' },
    { id: 3, name: 'Fuel' },
    { id: 4, name: 'Travel' },
  ],
  ...over,
});

describe('CardModel.crossSell', () => {
  it('fills every field, with GST-inclusive fees (as the tile shows) and all tag names', () => {
    const c = mapBkCardToCardModel(raw(), {}, { amount: 1400, unit: 'inr' });
    expect(c.crossSell).toEqual({
      id: '7',
      alias: 'sbi-cashback-credit-card',
      name: 'SBI Cashback Credit Card',
      bank: 'SBI', // static fallback name for bank_id 3
      rewardType: 'cashback', // alias is in the cashback snapshot
      tags: ['Shopping', 'Dining', 'Fuel', 'Travel'], // all 4, the tile shows 3
      joiningFee: 1179, // 999 + 18% GST, same as the tile
      annualFee: 2950, // 2500 + 18% GST
      inviteOnly: false,
      reward: 1400,
      internalReward: 1400, // internal (never shown): the CashKaro rate, else the commission
      earn: 1800,
      incomeLpa: 0, // "N/A"
      incomeSelfEmpLpa: 0, // absent
      crif: 750,
      priority: 3,
    });
    // Existing fields are untouched.
    expect(c.tags).toEqual(['Shopping', 'Dining', 'Fuel']);
    expect(c.cashback).toBe('Flat ₹1,400 Rewards');
    expect(c.detail?.fee.annual.amount).toBe('₹2,950'); // rail amount === tile amount
  });

  it('reads the self-employed income bar', () => {
    const c = mapBkCardToCardModel(raw({ income_salaried: '3', income_self_emp: '6' }), {}, null);
    expect(c.crossSell?.incomeLpa).toBe(3);
    expect(c.crossSell?.incomeSelfEmpLpa).toBe(6);
  });

  it('uses the live bank directory name when present', () => {
    const c = mapBkCardToCardModel(raw(), { 3: { name: 'State Bank of India' } }, null);
    expect(c.crossSell?.bank).toBe('State Bank of India');
  });

  it('reward is 0 when the CashKaro rate is a percent', () => {
    const c = mapBkCardToCardModel(raw(), {}, { amount: 5, unit: 'percent' });
    expect(c.crossSell?.reward).toBe(0);
    expect(c.cashbackValue).toBe('5%');
  });

  it('reward is 0 without a CashKaro rate: the BankKaro commission is never the reward', () => {
    const c = mapBkCardToCardModel(raw(), {}, null);
    expect(c.crossSell?.reward).toBe(0);
    expect(c.crossSell?.internalReward).toBe(1400); // gates and ranking only, as before
    expect(c.cashbackValue).toBe('');
    expect(c.cashback).toBe('Rewards');
    expect(mapBkCardToCardModel(raw({ commission: 'N/A', bk_commission: '' }), {}, null).crossSell?.reward).toBe(0);
  });

  it('reward is the CashKaro rupee rate when there is one', () => {
    expect(mapBkCardToCardModel(raw(), {}, { amount: 1200, unit: 'inr' }).crossSell?.reward).toBe(1200);
  });

  it('parses messy numbers to 0 and keeps a real priority of 0', () => {
    const c = mapBkCardToCardModel(
      raw({ income_salaried: '6', crif: '', bk_commission: null as unknown as string, priority: 0 }),
      {},
      null,
    );
    expect(c.crossSell).toMatchObject({ incomeLpa: 6, crif: 0, earn: 0, priority: 0 });
    const noPriority = mapBkCardToCardModel(raw({ priority: undefined }), {}, null);
    expect(noPriority.crossSell?.priority).toBeGreaterThan(100000);
  });

  it('treats both explicit "Free" fees as lifetime free (0 / 0)', () => {
    const c = mapBkCardToCardModel(raw({ joining_fee_text: '0', annual_fee_text: 'Nil' }), {}, null);
    expect(c.crossSell).toMatchObject({ joiningFee: 0, annualFee: 0 });
  });

  it('is undefined when the card cannot be compared safely', () => {
    expect(mapBkCardToCardModel(raw({ card_alias: undefined }), {}, null).crossSell).toBeUndefined();
    expect(mapBkCardToCardModel(raw({ annual_fee_text: 'Contact bank' }), {}, null).crossSell).toBeUndefined();
    // Unknown fee on both sides must not read as lifetime free.
    expect(
      mapBkCardToCardModel(raw({ joining_fee_text: 'N/A', annual_fee_text: 'N/A' }), {}, null).crossSell,
    ).toBeUndefined();
  });

  it('a card outside the cashback snapshot is "rewards"; unknown bank gets a unique bank key', () => {
    const c = mapBkCardToCardModel(raw({ card_alias: 'some-other-card', bank_id: undefined }), {}, null);
    expect(c.crossSell?.rewardType).toBe('rewards');
    expect(c.crossSell?.bank).toBe('7');
  });
});
