/** Shared chrome for the Patterns stories. Not a story file. Tokens only. */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../../src/atoms/Text';
import { colors, spacing, radius, borderWidth } from '../../src/tokens';

/** A phone-width column on the app background. */
export function Phone({ children, height, gap = spacing[16], padded = true }: { children: React.ReactNode; height?: number; gap?: number; padded?: boolean }) {
  return (
    <View style={{ width: 390, height, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.surface.default, borderRadius: radius.xl, borderWidth: borderWidth.thin, borderColor: colors.border.subtle3, padding: padded ? spacing[16] : 0, gap }}>
      {children}
    </View>
  );
}

export function Board({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '100%', padding: spacing[16], gap: spacing[24], alignItems: 'flex-start' }}>{children}</View>;
}

export function Labelled({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[8], alignItems: 'flex-start' }}>
      <Text variant="body12SemiBold" color={colors.text.primary}>{label}</Text>
      {note ? <Text variant="body12Regular" color={colors.text.secondary}>{note}</Text> : null}
      {children}
    </View>
  );
}

export function Row({ children, gap = spacing[16] }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>{children}</View>;
}

/** The noop used for every onPress in these examples. */
export const noop = () => {};
