import { routeParams } from '../../../storybook/harness';
import { FAKE } from '../../../storybook/fixtures';
import type { WithdrawDraft } from '../../../src/navigation/types';

/** Amount of the confirmed cashback in `earningsFixture.typical`. */
export const AMOUNT = 1240;
export const OTP_GUID = 'sb0otp0guid0000000000000000000001';

export const draftFor = (method: WithdrawDraft['method']): WithdrawDraft => ({
  method,
  paymentType: 'cashback',
  amount: AMOUNT,
  paymentMethodId: method === 'upi' ? 20 : method === 'amazon' ? 12 : 13,
  ...(method === 'upi' ? { upiId: 'user@upi' } : method === 'amazon' ? { mobile: '9800000010' } : { email: FAKE.email }),
});

/** Route params of the Verify OTP step (as the details screen would send them). */
export const verifyParams = (method: WithdrawDraft['method'] = 'upi') =>
  routeParams('WithdrawVerifyOTP', { draft: draftFor(method), otpGuid: OTP_GUID, maskedMobile: FAKE.phone });

/** A wrong or right 6 digit code. Any digits do: the fixture decides the outcome. */
export const CODE = '482913';
