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

export function useWithdrawGate({
  onProceed,
  onBrowseDeals,
}: {
  onProceed: () => void;
  onBrowseDeals: () => void;
}) {
  const earningsQ = useEarnings();
  const paymentQ = usePaymentInfo();
  const earnings = earningsQ.data;
  const paymentInfo = paymentQ.data;
  const notConfirmedRef = useRef<CashbackNotConfirmedSheetRef>(null);
  const processingRef = useRef<PaymentProcessingSheetRef>(null);
  const [belowMinimum, setBelowMinimum] = useState<{ balance: string; minimum: string } | null>(null);

  const startWithdraw = async () => {
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
    // Withdrawable balance = confirmed cashback + rewards (combined). Rewards
    // have no pending split and are withdrawable as gift cards, so a user
    // with ₹0 confirmed cashback but a positive rewards balance can still
    // withdraw.
    const balance = e.combinedNum ?? 0;
    const hasBalance = balance > 0;
    // The payout API rejects requests under the threshold (Postman: 400 code
    // 5003 "below ₹250"); stop here instead of failing after UPI + OTP.
    const minimum = p?.paymentThreshold ?? 250;
    analytics.track(Events.WITHDRAW_START, {
      has_balance: hasBalance,
      confirmed_balance: e.combinedNum ?? 0,
      payment_in_process: !!p?.paymentInProcess,
    });
    if (p?.paymentInProcess) {
      // Only one payout may be in flight at a time.
      processingRef.current?.present();
    } else if (!hasBalance) {
      setBelowMinimum(null);
      notConfirmedRef.current?.present();
    } else if (balance < minimum) {
      setBelowMinimum({ balance: formatINR(balance), minimum: formatINR(minimum) });
      notConfirmedRef.current?.present();
    } else {
      onProceed();
    }
  };

  const gateSheets = (
    <>
      <CashbackNotConfirmedSheet
        ref={notConfirmedRef}
        pendingAmount={earnings?.pending ?? '₹0'}
        belowMinimum={belowMinimum ?? undefined}
      />
      <PaymentProcessingSheet
        ref={processingRef}
        amount={formatINR(paymentInfo?.paymentInProcessAmount ?? 0)}
        onBrowseDeals={onBrowseDeals}
      />
    </>
  );

  return { startWithdraw, gateSheets };
}
