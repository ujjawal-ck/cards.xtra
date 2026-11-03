/**
 * missingCashbackResultParams — map a SubmitOutcome to MissingCashbackResult
 * nav params. Shared by every screen that submits/updates a claim (amount,
 * category, new-user) so the terminal copy is consistent.
 */
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SubmitOutcome } from '../api/missingCashbackMapper';
import type { RootStackParamList, McClaimDraft } from '../navigation/types';

type ResultParams = RootStackParamList['MissingCashbackResult'];
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function resultParamsFromOutcome(outcome: SubmitOutcome): ResultParams {
  if (outcome.kind === 'tracked') {
    return {
      variant: 'tracked',
      title: 'Cashback Tracked',
      message: outcome.message,
      cashbackId: outcome.cashbackId,
    };
  }
  // 'collect' shouldn't reach a result screen, but fall through to queued.
  if (outcome.kind === 'success' && /auto-tracking/i.test(outcome.message)) {
    return { variant: 'tracking', title: 'Under Auto-Tracking', message: outcome.message };
  }
  const message = outcome.kind === 'success' ? outcome.message : 'Your missing cashback claim has been added to the queue.';
  return { variant: 'queued', title: 'Claim Submitted', message };
}

/**
 * Route to the right next screen after a queue submit, per the outcome:
 *   collect B1 → New/Existing user · C1 → category select · C2 → invoice upload
 *   tracked / success → the result screen
 * `draft` must already carry the queueId from the submit response.
 */
export function goToSubmitOutcome(navigation: RootNav, outcome: SubmitOutcome, draft: McClaimDraft): void {
  if (outcome.kind === 'collect') {
    if (outcome.group === 'B1') navigation.navigate('MissingCashbackNewUserCheck', { draft });
    else if (outcome.group === 'C1') navigation.navigate('MissingCashbackCategorySelect', { draft });
    else navigation.navigate('MissingCashbackInvoiceUpload', { draft });
    return;
  }
  navigation.navigate('MissingCashbackResult', resultParamsFromOutcome(outcome));
}
