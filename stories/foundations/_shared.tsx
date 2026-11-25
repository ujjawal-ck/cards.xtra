/**
 * Shared specimen chrome for the Foundations pages. Not a story file.
 * Only tokens: Text atom, colors.*, spacing, radius, borderWidth.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '../../src/atoms/Text';
import { colors, spacing, radius, borderWidth } from '../../src/tokens';

export function Page({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '100%', padding: spacing[16], gap: spacing[32] }}>{children}</View>;
}

export function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[12] }}>
      <View style={{ gap: spacing[4] }}>
        <Text variant="heading20SemiBold">{title}</Text>
        {note ? <Text variant="body14Regular" color={colors.text.secondary}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function Wrap({ children, gap = spacing[16] }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>{children}</View>;
}

export function Caption({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text variant="body12Regular" color={color ?? colors.text.secondary}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text variant="body12SemiBold" color={colors.text.primary}>{children}</Text>;
}

/** A card-like frame for one specimen. */
export function Frame({ children, width, style }: { children: React.ReactNode; width?: number; style?: object }) {
  return (
    <View
      style={[
        {
          width,
          padding: spacing[12],
          gap: spacing[8],
          borderRadius: radius.lg,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.default,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const isTranslucent = (v: string) => /^rgba\(/.test(v) && !/,\s*1\)$/.test(v);

/** A colour swatch. Translucent values sit over a dark and a light half so they stay visible. */
export function Swatch({ name, value, lines = [], width = 164, warn }: { name: string; value: string; lines?: string[]; width?: number; warn?: boolean }) {
  return (
    <View style={{ width, gap: spacing[4] }}>
      <View style={{ height: 56, borderRadius: radius.md, borderWidth: borderWidth.thin, borderColor: colors.border.default, overflow: 'hidden', flexDirection: 'row' }}>
        {isTranslucent(value) ? (
          <>
            <View style={{ flex: 1, backgroundColor: colors.surface.inverse }} />
            <View style={{ flex: 1, backgroundColor: colors.surface.default }} />
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: value }} />
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: value }} />
        )}
      </View>
      <Text variant="body12SemiBold" color={colors.text.primary}>{name}</Text>
      <Caption>{value}</Caption>
      {lines.map((l) => (
        <Caption key={l} color={warn ? colors.feedback.warning.text : undefined}>{l}</Caption>
      ))}
    </View>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing[8], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.background.muted }}>
      <Text variant="body12Medium" color={colors.text.secondary}>{children}</Text>
    </View>
  );
}
