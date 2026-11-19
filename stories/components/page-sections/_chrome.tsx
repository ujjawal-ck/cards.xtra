/** Story chrome for the Page sections family: a labelled slot and a vertical stack. Tokens only. */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

export function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[8] }}>
      <Text variant="body12SemiBold" color={colors.text.secondary}>{label}</Text>
      {children}
    </View>
  );
}

export function Stack({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: spacing[24], padding: spacing[16], backgroundColor: colors.background.default }}>{children}</View>;
}
