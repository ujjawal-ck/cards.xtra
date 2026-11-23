/**
 * payoutPending — the "Couldn't confirm your withdrawal" stop, shared by the
 * withdraw forms and the OTP screen (review R-06).
 *
 * After a payout with an unknown outcome, every new payout is blocked for a
 * cool-down (query/mutations/withdraw.ts). The forms check it before they
 * send a payment OTP, so the user gets no SMS and no OTP screen for a payout
 * that would be refused.
 */
import { Alert } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/types';
import { isPayoutOutcomePending } from '../../query/mutations/withdraw';

/** Any screen of the withdraw stack. */
type WithdrawNavigation = Pick<NavigationProp<ParamListBase>, 'getParent'>;

/** The alert for a payout whose outcome is unknown. */
export function showPayoutUnconfirmed(navigation: WithdrawNavigation): void {
  Alert.alert(
    "Couldn't confirm your withdrawal",
    // Payment History still shows sample payouts, so don't send people
    // there. Earnings re-reads the live balance, and tapping Withdraw again
    // shows "payment in process" if this request did go through.
    'Your request may already have gone through. Check Earnings in a few minutes before trying again: a payout in progress shows up when you tap Withdraw.',
    [
      {
        text: 'Go to Earnings',
        // popTo, not navigate: navigate pushed a second MainTabs on top.
        onPress: () =>
          navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.popTo('MainTabs', { screen: 'Earnings' }),
      },
      { text: 'OK', style: 'cancel' },
    ],
  );
}

/** Await before sending a payment OTP. True means an earlier payout's outcome
 *  is still unknown: the alert is shown, and nothing must be sent. */
export async function blockIfPayoutPending(navigation: WithdrawNavigation): Promise<boolean> {
  if (!(await isPayoutOutcomePending())) return false;
  showPayoutUnconfirmed(navigation);
  return true;
}
