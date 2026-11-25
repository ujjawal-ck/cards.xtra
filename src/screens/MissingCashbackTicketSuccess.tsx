/**
 * MissingCashbackTicketSuccess — screen (Figma 4129:27840,
 * "help/missing-cashback/group-b/ticket-detail" success state).
 *
 * Shown after a ticket is raised (C1-"Other" / C2 invoice flows). Faithful to
 * the Figma: back-only header, bold title "Please Allow Us 8 to 10 Business
 * Days to Respond.", subtitle "Thanks for raising the ticket.", a "Learn More"
 * accent link, and a full-width "Continue" button that returns to the claims
 * list.
 *
 * Imports: Header (back-only), Text, Button (atoms).
 */
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button, Icon } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, elevation } from '../tokens';
import type { RootStackParamList } from '../navigation/types';
import { useExitToClaims } from './useExitToClaims';

const ICON_SIZE = 72;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackTicketSuccess'>;

export function MissingCashbackTicketSuccess() {
  const navigation = useNavigation<Nav>();
  const exitToClaims = useExitToClaims();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Header leading="back" onLeadingPress={exitToClaims} />

          {/* Copy block */}
          <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[8], gap: spacing[8] }}>
            <View
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                borderRadius: ICON_SIZE / 2,
                backgroundColor: colors.feedback.success.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check-circle-outline" size={36} color={colors.feedback.success.default} />
            </View>
            <Text variant="body16Bold" color={colors.text.primary}>
              Please Allow Us 8 to 10 Business Days to Respond.
            </Text>
            <Text variant="body14Regular" color={colors.text.primary}>
              Thanks for raising the ticket.
            </Text>
            <Button
              label="Learn More"
              variant="link"
              tone="second"
              size={44}
              icon="trailing"
              iconName="chevron-right"
              onPress={() => navigation.navigate('MissingCashbackHelp')}
            />
          </View>

          <View style={{ flex: 1 }} />

          {/* Footer CTA → back to the live claims list */}
          <View
            style={[
              {
                backgroundColor: colors.surface.default,
                paddingTop: spacing[8],
                paddingBottom: spacing[16],
                paddingHorizontal: spacing[16],
              },
              elevation.light.up,
            ]}
          >
            <Button
              label="Continue"
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              onPress={exitToClaims}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
