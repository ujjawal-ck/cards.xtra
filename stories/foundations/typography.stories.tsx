import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, type TextVariant } from '../../src/atoms/Text';
import { typography, fontFamily, fontSize, letterSpacing, colors, spacing, borderWidth } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Frame, Label } from './_shared';

const meta: Meta = {
  title: 'Foundations/Typography',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/typography.ts', docs: { description: { component: 'The type scale, rendered with the real Text atom.' } } },
};
export default meta;
type Story = StoryObj;

const weightOf = (ff: string) => (Object.entries(fontFamily).find(([, v]) => v === ff)?.[0] ?? ff);
const styles = Object.entries(typography) as [TextVariant, (typeof typography)[TextVariant]][];
const categories = ['display', 'heading', 'body', 'caption'] as const;

function Row({ name, s }: { name: TextVariant; s: (typeof typography)[TextVariant] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[16], paddingVertical: spacing[8], borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border.subtle3, flexWrap: 'wrap' }}>
      <View style={{ width: 200, gap: spacing[2] }}>
        <Label>{name}</Label>
        <Caption>{s.fontSize} / {s.lineHeight} · {weightOf(s.fontFamily)} · ls {s.letterSpacing}</Caption>
      </View>
      <View style={{ flex: 1, minWidth: 240 }}>
        <Text variant={name}>Cashback on every card</Text>
      </View>
    </View>
  );
}

export const Scale: Story = {
  parameters: { source: 'src/tokens/typography.ts:61', docs: { description: { story: 'Every text style. Each line is the real Text atom with `variant` set to the token name. Under the name: size / line height, weight, letter spacing.' } } },
  render: () => (
    <Page>
      {categories.map((c) => (
        <Group key={c} title={c}>
          <View>{styles.filter(([n]) => n.startsWith(c)).map(([n, s]) => <Row key={n} name={n} s={s} />)}</View>
        </Group>
      ))}
    </Page>
  ),
};

export const Weights: Story = {
  parameters: { source: 'src/tokens/typography.ts:21', docs: { description: { story: 'Outfit, five weights. React Native loads each weight as its own font, so the app sets `fontFamily` and never `fontWeight`.' } } },
  render: () => (
    <Page>
      <Wrap>
        {Object.entries(fontFamily).map(([w, ff]) => (
          <Frame key={w} width={200}>
            <Text style={{ fontFamily: ff, fontSize: 32, lineHeight: 40 }}>Aa ₹1,234</Text>
            <Label>{w}</Label>
            <Caption>{ff}</Caption>
          </Frame>
        ))}
      </Wrap>
    </Page>
  ),
};

export const RawScales: Story = {
  parameters: { source: 'src/tokens/typography.ts:30', docs: { description: { story: 'Raw size and letter-spacing steps, for composing a custom style. Prefer a named style.' } } },
  render: () => (
    <Page>
      <Group title="fontSize">
        <Wrap gap={spacing[16]}>{Object.values(fontSize).map((n) => <View key={n} style={{ alignItems: 'center', gap: spacing[2] }}><Text style={{ fontFamily: fontFamily.semiBold, fontSize: n, lineHeight: n + 8 }}>Ag</Text><Caption>{n}</Caption></View>)}</Wrap>
      </Group>
      <Group title="letterSpacing">
        <Wrap>{Object.entries(letterSpacing).map(([k, v]) => <Frame key={k} width={160}><Text style={{ fontFamily: fontFamily.semiBold, fontSize: 20, letterSpacing: v }}>Cashback</Text><Caption>{k}: {v}</Caption></Frame>)}</Wrap>
      </Group>
    </Page>
  ),
};

export const LongText: Story = {
  parameters: { source: 'src/atoms/Text.tsx', docs: { description: { story: 'D7: the app follows the OS font size with no cap and no auto-shrink. Layouts grow: minHeight, two-line labels, rows that scroll. Read this block as the rule for any new component.' } } },
  render: () => (
    <Page>
      <Frame width={240}>
        <Text variant="heading20SemiBold">HDFC Bank Regalia Gold Credit Card</Text>
        <Text variant="body14Regular" color={colors.text.secondary}>Long names wrap to the next line. The box grows with the text.</Text>
      </Frame>
    </Page>
  ),
};
