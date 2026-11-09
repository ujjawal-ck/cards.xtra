/**
 * MissingCashbackOops — no-visits state (Figma 3632:194517).
 *
 * Reached from the "Did You Shop? → Yes" branch when the user has not visited
 * any retailer via Cards.xtra in the last 30 days. Layout on a background.muted
 * page:
 *   1. Cobalt "Missing Cashback?" hero (MissingCashbackMasthead).
 *   2. "Oops" + explanatory copy + a "Learn More" link that opens the
 *      WhatWentWrongInfoSheet.
 */
import React, { useRef } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetModal as BottomSheetModalRef } from '@gorhom/bottom-sheet';

import { Text, Button } from '../atoms';
import { MissingCashbackMasthead, WhatWentWrongInfoSheet } from '../organisms';
import { colors, spacing } from '../tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackOops'>;

const SUPPORT_EMAIL = 'contact@cardsxtra.com';

export function MissingCashbackOops() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const infoRef = useRef<BottomSheetModalRef>(null);

  const EmailLink = () => (
    <Text
      variant="body14Regular"
      color={colors.text.link}
      onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
    >
      {SUPPORT_EMAIL}
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.muted }}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing[24],
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        <MissingCashbackMasthead onBack={() => navigation.goBack()} />

        <View style={{ paddingHorizontal: spacing[16], gap: spacing[16] }}>
          <Text variant="heading20Bold" color={colors.text.primary}>
            Oops
          </Text>
          <Text variant="body16Regular" color={colors.text.primary}>
            Looks like you have not visited any website via Cards.xtra in last
            30 days
          </Text>
          <Text variant="body14Regular" color={colors.text.primary}>
            For any assistance, please write to us at <EmailLink />
          </Text>

          {/* "Learn More →" — opens the What Went Wrong explainer sheet. */}
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              label="Learn More"
              variant="link"
              tone="second"
              size={44}
              icon="trailing"
              iconName="chevron-right"
              onPress={() => infoRef.current?.present()}
            />
          </View>
        </View>
      </ScrollView>

      <WhatWentWrongInfoSheet ref={infoRef} supportEmail={SUPPORT_EMAIL} />
    </View>
  );
}
