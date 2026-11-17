/**
 * DS-ADD(ds-figma-1, 2026-11-17): small tag with a wallet icon and an amount ("₹1,200").
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1051:2368761 (wallet-tag). Metrics from Figma values (2026-11-17):
 * radius 4, 1 px border, padding 4 / 6, gap 6, fill color/background/elevated (#F2F7FD); icon holder 18; amount Outfit 12 (Currency/xs).
 * Rollback: delete this file and its DS-ADD export line in src/atoms/index.ts.
 *
 * WalletTag — atom. New part: Tag could carry the icon and tone, but not the 18 px icon holder, the 4 / 6 padding or the amount style.
 * Colours by role: fill colors.background.lavender, border colors.border.subtle2, amount colors.tones.brand.text
 * (Figma amount is an orange-brown gradient #CD8253 to #964325; flat here). Type: body12SemiBold (weight not shown in the panel).
 * Not applied: Figma inner padding of 1 (not on the spacing scale).
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, spacing, radius, borderWidth } from '../tokens';

export interface WalletTagProps {
  /** Already formatted amount, e.g. formatINR(1200). */
  amount: string;
  style?: StyleProp<ViewStyle>;
}

const ICON_HOLDER = spacing[16] + spacing[2]; // Figma 18

export function WalletTag({ amount, style }: WalletTagProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Wallet ${amount}`}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[6],
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[6],
          borderRadius: radius.xs,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle2,
          backgroundColor: colors.background.lavender,
        },
        style,
      ]}
    >
      <View style={{ width: ICON_HOLDER, height: ICON_HOLDER, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="wallet-filled" size={ICON_HOLDER} color={colors.tones.brand.text} />
      </View>
      <Text variant="body12SemiBold" color={colors.tones.brand.text}>
        {amount}
      </Text>
    </View>
  );
}
