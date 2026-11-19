import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '../../src/atoms/Text';
import { spacing, radius, borderWidth, opacity, alpha, colors } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Label, Frame } from './_shared';

const meta: Meta = {
  title: 'Foundations/Values',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/spacing.ts', docs: { description: { component: 'Spacing, radius, border width and opacity, as measured boxes.' } } },
};
export default meta;
type Story = StoryObj;

export const Spacing: Story = {
  parameters: { source: 'src/tokens/spacing.ts:6', docs: { description: { story: 'The spacing scale in px. Use it for padding, margin and gap: `spacing[16]`. Each bar is as wide as the value.' } } },
  render: () => (
    <Page>
      <View style={{ gap: spacing[8] }}>
        {Object.entries(spacing).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}>
            <View style={{ width: 96 }}><Label>spacing[{k}]</Label></View>
            <View style={{ width: 40 }}><Caption>{v}px</Caption></View>
            <View style={{ width: v, height: spacing[16], backgroundColor: colors.action.accent.default, borderRadius: radius.xs }} />
          </View>
        ))}
      </View>
    </Page>
  ),
};

export const Radius: Story = {
  parameters: { source: 'src/tokens/spacing.ts:13', docs: { description: { story: 'Corner radius. `full` is 10000, a pill or a circle.' } } },
  render: () => (
    <Page>
      <Wrap>
        {Object.entries(radius).map(([k, v]) => (
          <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
            <View style={{ width: 72, height: 72, borderRadius: v, backgroundColor: colors.background.lavender, borderWidth: borderWidth.thick, borderColor: colors.action.accent.default }} />
            <Label>radius[{k}]</Label>
            <Caption>{v}px</Caption>
          </View>
        ))}
      </Wrap>
    </Page>
  ),
};

export const BorderWidth: Story = {
  parameters: { source: 'src/tokens/spacing.ts:19', docs: { description: { story: 'Stroke widths. `iconDefault` is the 1.25 stroke of the icon set.' } } },
  render: () => (
    <Page>
      <Wrap>
        {Object.entries(borderWidth).map(([k, v]) => (
          <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
            <View style={{ width: 96, height: 56, borderRadius: radius.md, borderWidth: v, borderColor: colors.text.primary, backgroundColor: colors.surface.default }} />
            <Label>borderWidth[{k}]</Label>
            <Caption>{v}px</Caption>
          </View>
        ))}
      </Wrap>
    </Page>
  ),
};

export const Opacity: Story = {
  parameters: { source: 'src/tokens/opacity.ts', docs: { description: { story: 'Node opacity (0 to 1) for the `opacity` style, and rgba overlays for scrims and borders. Both are named by the percentage.' } } },
  render: () => (
    <Page>
      <Group title="opacity" note="The `opacity` style prop. Shown on text.primary.">
        <Wrap>
          {Object.entries(opacity).map(([k, v]) => (
            <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
              <View style={{ width: 72, height: 56, borderRadius: radius.md, backgroundColor: colors.text.primary, opacity: v }} />
              <Label>opacity[{k}]</Label>
              <Caption>{v}</Caption>
            </View>
          ))}
        </Wrap>
      </Group>
      {(['black', 'white'] as const).map((tone) => (
        <Group key={tone} title={`alpha.${tone}`} note="Overlays. Shown over a half-and-half ground so the tint reads on both.">
          <Wrap>
            {Object.entries(alpha[tone]).map(([k, v]) => (
              <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
                <View style={{ width: 72, height: 56, borderRadius: radius.md, overflow: 'hidden', flexDirection: 'row', borderWidth: borderWidth.thin, borderColor: colors.border.default }}>
                  <View style={{ flex: 1, backgroundColor: colors.surface.inverse }} />
                  <View style={{ flex: 1, backgroundColor: colors.surface.default }} />
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: v }} />
                </View>
                <Label>alpha.{tone}[{k}]</Label>
                <Caption>{v}</Caption>
              </View>
            ))}
          </Wrap>
        </Group>
      ))}
    </Page>
  ),
};

export const InUse: Story = {
  parameters: { source: 'src/tokens/spacing.ts', docs: { description: { story: 'Spacing and radius together on a card: padding spacing[16], gap spacing[8], radius.xl.' } } },
  render: () => (
    <Page>
      <Frame width={280} style={{ padding: spacing[16], gap: spacing[8], borderRadius: radius.xl }}>
        <Text variant="heading18SemiBold">Axis Bank Magnus</Text>
        <Text variant="body14Regular" color={colors.text.secondary}>padding spacing[16] · gap spacing[8] · radius.xl</Text>
      </Frame>
    </Page>
  ),
};
