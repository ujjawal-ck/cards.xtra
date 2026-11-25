/**
 * Story chrome shared by the Carousels, Media, Charts, Loading, Empty and error and
 * Motion story files. Tokens only. Not a story file (no .stories suffix).
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../../../src/atoms';
import { colors, spacing } from '../../../src/tokens';

export const PHONE_W = 390;

/** Indian grouping: 1000000 -> "₹10,00,000". */
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** A 390 wide column that stands in for a phone screen. */
export function Phone({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return <View style={{ width: PHONE_W, backgroundColor: bg ?? colors.background.default }}>{children}</View>;
}

/** A small caption above a rendered example. */
export function Block({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[8] }}>
      <View style={{ paddingHorizontal: spacing[16], gap: spacing[2] }}>
        <Text variant="body12SemiBold" color={colors.text.secondary}>{label}</Text>
        {note ? <Text variant="body12Regular" color={colors.text.tertiary}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A vertical run of Blocks. */
export function Stack({ children, width = PHONE_W }: { children: React.ReactNode; width?: number }) {
  return <View style={{ width, gap: spacing[24], paddingVertical: spacing[16] }}>{children}</View>;
}

/** Wraps one story in the phone column (use as a decorator). */
export const phoneDecorator = (Story: React.ComponentType) => (
  <Phone><Story /></Phone>
);
