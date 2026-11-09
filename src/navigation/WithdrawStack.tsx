/**
 * WithdrawStack — nested native stack for the whole withdraw flow.
 *
 *   WithdrawMethodSelect ─┬─ (UPI)  → WithdrawEnterUPI → WithdrawVerifyOTP ─┐
 *                         └─ (gift) → WithdrawGiftCard ─────────────────────┴→ WithdrawSuccess
 *
 * headerShown is off — each screen renders its own Header/Page. The
 * method-select reads live earnings and threads the chosen bucket's
 * numeric amount forward through params (single source of truth).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { WithdrawStackParamList } from './types';
import { WithdrawScreen } from '../screens/WithdrawScreen';
import { WithdrawEnterUPI } from '../screens/withdraw/WithdrawEnterUPI';
import { WithdrawAmazon } from '../screens/withdraw/WithdrawAmazon';
import { WithdrawFlipkart } from '../screens/withdraw/WithdrawFlipkart';
import { WithdrawVerifyOTP } from '../screens/withdraw/WithdrawVerifyOTP';
import { WithdrawGiftCard } from '../screens/withdraw/WithdrawGiftCard';
import { WithdrawSuccess } from '../screens/withdraw/WithdrawSuccess';
import { WithdrawTerms } from '../screens/withdraw/WithdrawTerms';

const Stack = createNativeStackNavigator<WithdrawStackParamList>();

export function WithdrawStack() {
  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="WithdrawMethodSelect"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="WithdrawMethodSelect" component={WithdrawScreen} />
      <Stack.Screen name="WithdrawEnterUPI" component={WithdrawEnterUPI} />
      <Stack.Screen name="WithdrawAmazon" component={WithdrawAmazon} />
      <Stack.Screen name="WithdrawFlipkart" component={WithdrawFlipkart} />
      <Stack.Screen name="WithdrawVerifyOTP" component={WithdrawVerifyOTP} />
      <Stack.Screen name="WithdrawGiftCard" component={WithdrawGiftCard} />
      <Stack.Screen
        name="WithdrawSuccess"
        component={WithdrawSuccess}
        // No swipe-back into the finished payout flow.
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="WithdrawTerms" component={WithdrawTerms} />
    </Stack.Navigator>
  );
}
