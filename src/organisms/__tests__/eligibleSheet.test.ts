/**
 * EligibleSheet reward block (audit PM-01): no sample text. No headline → no
 * reward block; the subtext shows only when a caller passes it.
 * Tests the pure rule the component renders from (the jest setup has no RN renderer).
 */
jest.mock('react-native-reanimated', () => ({ Easing: { inOut: () => () => 0, quad: () => 0 } }));
jest.mock('react-native-confetti-cannon', () => () => null);
jest.mock('../EligibilityMasthead', () => ({ EligibilityMasthead: () => null }));
jest.mock('../FooterButtons', () => ({ FooterButtons: () => null }));
jest.mock('../../atoms', () => ({ Text: () => null }));

import { eligibleRewardBlock } from '../EligibleSheet';

describe('eligibleRewardBlock', () => {
  it('hides the block when there is no headline (Home passes undefined for a card with no reward)', () => {
    expect(eligibleRewardBlock()).toBeNull();
    expect(eligibleRewardBlock(undefined, 'On Card Activation')).toBeNull();
    expect(eligibleRewardBlock('   ')).toBeNull();
  });

  it('shows the headline alone when no subtext is passed', () => {
    expect(eligibleRewardBlock('Flat ₹X Rewards')).toEqual({ headline: 'Flat ₹X Rewards' });
  });

  it('shows the subtext only when the caller passes it', () => {
    expect(eligibleRewardBlock('Flat ₹X Rewards', 'On Card Activation')).toEqual({
      headline: 'Flat ₹X Rewards',
      subtext: 'On Card Activation',
    });
  });

  it('hideReward wins (the multi-card Home flow)', () => {
    expect(eligibleRewardBlock('Flat ₹X Rewards', 'x', true)).toBeNull();
  });
});
