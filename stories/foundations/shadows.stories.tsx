import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '../../src/atoms/Text';
import { elevation, colors, spacing, radius } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Label } from './_shared';

const meta: Meta = {
  title: 'Foundations/Shadows',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/elevation.ts', docs: { description: { component: 'Elevation tokens: three families, each with the same levels.' } } },
};
export default meta;
type Story = StoryObj;

type Family = keyof typeof elevation;
const families = Object.keys(elevation) as Family[];

function Card({ family, level }: { family: Family; level: string }) {
  const sh = (elevation[family] as Record<string, any>)[level];
  return (
    <View style={{ gap: spacing[8], width: 168 }}>
      <View style={[{ height: 96, borderRadius: radius.xl, backgroundColor: colors.surface.default, alignItems: 'center', justifyContent: 'center' }, sh]}>
        <Text variant="body14SemiBold">{family}.{level}</Text>
      </View>
      <Caption>y {sh.shadowOffset.height} · blur {sh.shadowRadius} · {Math.round(sh.shadowOpacity * 100)}% · {sh.shadowColor} · android {sh.elevation}</Caption>
    </View>
  );
}

const make = (family: Family): Story => ({
  parameters: { source: 'src/tokens/elevation.ts:29', docs: { description: { story: family === 'light' ? 'Default shadow, black at low opacity. `glow` is a soft halo; `up` casts upward for sticky footers.' : family === 'neutral' ? 'Same geometry, higher opacity, for surfaces on a busy ground.' : 'Saffron-tinted glow. The tint is a raw hex in the token file: a design system gap.' } } },
  render: () => (
    <Page>
      <View style={{ backgroundColor: colors.background.muted, borderRadius: radius.xl, padding: spacing[24] }}>
        <Group title={`elevation.${family}`} note="Spread the token into a style: style={[styles.card, elevation.light.md]}.">
          <Wrap gap={spacing[24]}>{Object.keys(elevation[family]).map((l) => <Card key={l} family={family} level={l} />)}</Wrap>
        </Group>
      </View>
    </Page>
  ),
});

export const Light = make('light');
export const Neutral = make('neutral');
export const Brand = make('brand');

export const Platforms: Story = {
  parameters: { source: 'src/tokens/elevation.ts:1', docs: { description: { story: 'iOS reads shadowColor, offset, opacity and radius. Android reads `elevation` (one number). Each token carries both. Figma spread is dropped. This page renders the web approximation of the iOS values.' } } },
  render: () => (
    <Page>
      <Label>{families.length} families · {Object.keys(elevation.light).length} levels in light, {Object.keys(elevation.neutral).length} in neutral and brand</Label>
    </Page>
  ),
};
