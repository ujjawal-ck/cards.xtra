/**
 * GuestPrompt — the signed-out card for account screens (Earnings, Profile).
 *
 * Login is optional: people can use Home, card discovery and Offers as a
 * guest. Screens whose data belongs to a CashKaro account show this card
 * instead of empty figures: what logging in unlocks, one saffron "Log in"
 * action (opens the phone + OTP sheet), and a reassurance line that the same
 * OTP creates an account for new numbers.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

import { Text, Button, Icon } from '../atoms';
import type { IconName } from '../atoms';
import { colors, spacing, radius, iconSize, elevation } from '../tokens';

// Icon badge — component-spec size, not on the shared scales.
const BADGE = 48;

export interface GuestPromptProps {
  title: string;
  body: string;
  icon?: IconName;
  actionLabel?: string;
  onLogin: () => void;
  style?: StyleProp<ViewStyle>;
}

export function GuestPrompt({
  title,
  body,
  icon = 'wallet-outline',
  actionLabel = 'Log in',
  onLogin,
  style,
}: GuestPromptProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          padding: spacing[20],
          gap: spacing[16],
        },
        elevation.light.xs,
        style,
      ]}
    >
      <View
        style={{
          width: BADGE,
          height: BADGE,
          borderRadius: radius.full,
          backgroundColor: colors.background.emphasis,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={iconSize[24]} color={colors.action.primary.default} />
      </View>
      <View style={{ gap: spacing[4] }}>
        <Text variant="heading18SemiBold" color={colors.text.primary}>
          {title}
        </Text>
        <Text variant="body14Regular" color={colors.text.secondary}>
          {body}
        </Text>
      </View>
      <View style={{ gap: spacing[8] }}>
        <Button
          label={actionLabel}
          variant="solid"
          tone="main"
          size={44}
          fullWidth
          onPress={onLogin}
        />
        <Text variant="body12Regular" color={colors.text.tertiary} align="center">
          New to CashKaro? The same OTP creates your account.
        </Text>
      </View>
    </View>
  );
}
