/**
 * WithdrawGiftCard — Figma withdraw/.../withdraw-as-reward (3297:17039)
 * and withdraw-as-combined (3297:17101). One screen, two variants:
 *   variant='rewards'  → masthead "Withdrawing Available Rewards"
 *   variant='combined' → masthead "Withdrawing Total Amount (Cashback + Rewards)"
 *
 * Reached from the method-select Rewards / Cashback+Reward sections (those
 * buckets can only be withdrawn as gift cards). Pure composition:
 *   - <Header leading='back' title={withdrawTitle(variant)} />  (organism)
 *   - <Masthead variant='payment' />                      (organism)
 *   - MethodCard / MethodRow                              (shared, ./methodRow)
 *
 * Two payment methods — Amazon Pay Balance, Flipkart Gift Card. Picking
 * either completes the withdrawal → WithdrawSuccess.
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../../atoms';
import { Header, Masthead } from '../../organisms';
import { colors, spacing } from '../../tokens';
import type {
  WithdrawStackParamList,
  WithdrawGiftCardVariant,
} from '../../navigation/types';
import { formatRupees } from './amount';
import { withdrawTitle } from './labels';
import { MethodCard, type MethodRowItem } from './methodRow';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawGiftCard'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawGiftCard'>;

const SUBTITLE: Record<WithdrawGiftCardVariant, string> = {
  cashback: 'Cashback Available For Payment',
  rewards: 'Withdrawing Available Rewards',
  combined: 'Withdrawing Total Amount (Cashback + Rewards)',
};

export function WithdrawGiftCard() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { amount, variant } = params;

  // Bucket → payment_type: cashback → 'cashback', rewards → 'rewards',
  // combined → 'cashback_and_rewards'.
  const paymentType =
    variant === 'cashback'
      ? 'cashback'
      : variant === 'rewards'
        ? 'rewards'
        : 'cashback_and_rewards';

  const rows: MethodRowItem[] = [
    {
      icon: 'amazon',
      label: 'Amazon Pay Balance',
      onPress: () =>
        navigation.navigate('WithdrawAmazon', { amount, paymentType }),
    },
    {
      icon: 'flipkart',
      label: 'Flipkart Gift Card',
      onPress: () =>
        navigation.navigate('WithdrawFlipkart', { amount, paymentType }),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing[24],
            paddingBottom: spacing[32],
          }}
        >
          <Header
            leading="back"
            title={withdrawTitle(variant)}
            onLeadingPress={() => navigation.goBack()}
          />

          <Masthead
            variant="payment"
            amount={formatRupees(amount)}
            subtitle={SUBTITLE[variant]}
          />

          {/* "Choose Your Payment Method" + method card */}
          <View style={{ gap: 0 }}>
            <Text
              variant="body16Medium"
              color={colors.text.primary}
              style={{ paddingHorizontal: spacing[16] }}
            >
              Choose Your Payment Method
            </Text>
            <View
              style={{
                paddingHorizontal: spacing[16],
                paddingVertical: spacing[12],
              }}
            >
              <MethodCard rows={rows} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
