/**
 * useWithdrawGate — the single entry check for the withdraw flow.
 *
 * Every "Withdraw" entry point (Earnings' Withdraw button, Profile's
 * "Withdraw Cashback" row) must run the same checks before opening
 * WithdrawStack. Profile used to navigate straight in, skipping them, so a
 * ₹0 account could open the payout methods.
 *
 *   • a previous payout still settling → PaymentProcessingSheet
 *   • nothing withdrawable (₹0)        → CashbackNotConfirmedSheet
 *   • otherwise                        → onProceed()
 *
 * Returns `startWithdraw` (call from the CTA) and `gateSheets` (render once
 * anywhere in the screen tree).
 */
import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  CashbackNotConfirmedSheet,
  PaymentProcessingSheet,
} from '../../organisms';
import type {
  CashbackNotConfirmedSheetRef,
  PaymentProcessingSheetRef,
} from '../../organisms';
import { analytics, Events } from '../../analytics';
import { useEarnings } from '../../query/useEarnings';
import { usePaymentInfo } from '../../query/usePaymentInfo';
import { formatINR } from '../../lib/money';
import type { WithdrawEntryBucket } from '../../navigation/types';

export function useWithdrawGate({
  onProceed,
  onBrowseDeals,
}: {
  onProceed: (bucket?: WithdrawEntryBucket) => void;
  onBrowseDeals: () => void;
}) {
  const earningsQ = useEarnings();
  const paymentQ = usePaymentInfo();
  const earnings = earningsQ.data;
  const paymentInfo = paymentQ.data;
  const notConfirmedRef = useRef<CashbackNotConfirmedSheetRef>(null);
  const processingRef = useRef<PaymentProcessingSheetRef>(null);
  const [belowMinimum, setBelowMinimum] = useState<{ balance: string; minimum: string } | null>(null);
  const [tappedType, setTappedType] = useState<WithdrawEntryBucket>('cashback');

  // `bucket` = the type the user tapped (Earnings page). No bucket (Profile)
  // checks the combined balance. Anything else (e.g. a press event) = none.
  const startWithdraw = async (arg?: unknown) => {
    const bucket: WithdrawEntryBucket | undefined =
      arg === 'cashback' || arg === 'rewards' ? arg : undefined;
    // Not loaded yet (tapped right after opening) or failed to load: fetch
    // first. Treating "unknown" as ₹0 told people with a real balance that
    // their cashback wasn't confirmed.
    let e = earnings;
    let p = paymentInfo;
    if (!e || !p) {
      try {
        const [er, pr] = await Promise.all([
          e ? Promise.resolve({ data: e }) : earningsQ.refetch(),
          p ? Promise.resolve({ data: p }) : paymentQ.refetch(),
        ]);
        e = er.data;
        p = pr.data;
      } catch {
        // handled below
      }
    }
    if (!e || !p) {
      Alert.alert(
        'Couldn’t load your balance',
        'Check your connection and try again.'
      );
      return;
    }
    // Withdrawable balance of the tapped type; with no type, confirmed
    // cashback + confirmed rewards (combined).
    const balance =
      bucket === 'cashback'
        ? e.confirmedNum ?? 0
        : bucket === 'rewards'
        ? e.rewardsNum ?? 0
        : e.combinedNum ?? 0;
    const hasBalance = balance > 0;
    // The payout API rejects requests under the threshold (Postman: 400 code
    // 5003 "below ₹250"); stop here instead of failing after UPI + OTP.
    // Per the CK doc (04_payment.md, payment_threshold) the threshold applies
    // to cashback + rewards COMBINED, not to each type on its own.
    const minimum = p?.paymentThreshold ?? 250;
    const combined = e.combinedNum ?? 0;
    setTappedType(bucket ?? 'cashback');
    analytics.track(Events.WITHDRAW_START, {
      has_balance: hasBalance,
      earning_type: bucket ?? 'combined',
      confirmed_balance: balance,
      payment_in_process: !!p?.paymentInProcess,
    });
    if (p?.paymentInProcess) {
      // Only one payout may be in flight at a time.
      processingRef.current?.present();
    } else if (!hasBalance) {
      setBelowMinimum(null);
      notConfirmedRef.current?.present();
    } else if (combined < minimum) {
      setBelowMinimum({ balance: formatINR(combined), minimum: formatINR(minimum) });
      notConfirmedRef.current?.present();
    } else {
      onProceed(bucket);
    }
  };

  const gateSheets = (
    <>
      <CashbackNotConfirmedSheet
        ref={notConfirmedRef}
        pendingAmount={
          (tappedType === 'rewards' ? earnings?.pendingRewards : earnings?.pendingCashback) ??
          earnings?.pending ??
          '₹0'
        }
        belowMinimum={belowMinimum ?? undefined}
        earningType={tappedType}
      />
      <PaymentProcessingSheet
        ref={processingRef}
        amount={
          (paymentInfo?.paymentInProcessAmount ?? 0) > 0
            ? formatINR(paymentInfo?.paymentInProcessAmount ?? 0)
            : undefined
        }
        onBrowseDeals={onBrowseDeals}
      />
    </>
  );

  return { startWithdraw, gateSheets };
}
