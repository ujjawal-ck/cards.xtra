import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { primitives, colors, gradients as tokenGradients, spacing, radius, borderWidth } from '../../src/tokens';
import { gradients as themeGradients } from '../../src/theme/gradients';
import { Page, Group, Wrap, Swatch, Caption, Frame } from './_shared';
import { byValue, fmt, leaves, primitiveLeaves, primitivesByValue, semanticByValue, semanticLeaves, short } from './_tokens';

const meta: Meta = {
  title: 'Foundations/Colors',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/colors.ts', docs: { description: { component: 'Primitive palette, semantic roles and gradients, rendered from the token objects.' } } },
};
export default meta;
type Story = StoryObj;

const rampNames = Object.keys(primitives) as (keyof typeof primitives)[];

export const Primitives: Story = {
  parameters: { source: 'src/tokens/colors.ts:19', docs: { description: { story: 'Every primitive step. The lines under a swatch are the semantic tokens that point at the same value. A step that nothing points at shows "no semantic". Two steps with one hex (saffron 50 and 100) show the same names.' } } },
  render: () => (
    <Page>
      {rampNames.map((ramp) => (
        <Group key={ramp} title={ramp}>
          <Wrap>
            {primitiveLeaves.filter((l) => l.path[0] === ramp).map((l) => {
              const sem = byValue(semanticByValue, l.value);
              return <Swatch key={fmt(l.path)} name={fmt(l.path)} value={l.value} lines={sem.length ? short(sem.map((s) => s.replace('colors.', ''))) : ['no semantic']} />;
            })}
          </Wrap>
        </Group>
      ))}
    </Page>
  ),
};

const semanticGroups = Array.from(new Set(semanticLeaves.map((l) => l.path[0])));

export const Semantic: Story = {
  parameters: { source: 'src/tokens/colors.ts:94', docs: { description: { story: 'Every semantic token, grouped by its first key. The second line is the primitive it points at. Components use only these names.' } } },
  render: () => (
    <Page>
      {semanticGroups.map((g) => (
        <Group key={g} title={`colors.${g}`}>
          <Wrap>
            {semanticLeaves.filter((l) => l.path[0] === g).map((l) => {
              const prim = byValue(primitivesByValue, l.value);
              return <Swatch key={fmt(l.path)} name={fmt(l.path.slice(1))} value={l.value} warn={!prim.length} lines={prim.length ? short(prim.map((p) => p.replace('primitives.', ''))) : ['no primitive']} />;
            })}
          </Wrap>
        </Group>
      ))}
    </Page>
  ),
};

export const NoPrimitive: Story = {
  parameters: { source: 'src/tokens/colors.ts', docs: { description: { story: 'Semantic tokens whose value matches no primitive. They hold a raw hex or rgba. A design system gap: add a primitive or document the one-off.' } } },
  render: () => {
    const rows = semanticLeaves.filter((l) => !byValue(primitivesByValue, l.value).length);
    return (
      <Page>
        <Group title={`${rows.length} semantic tokens with no primitive`}>
          <Wrap>{rows.map((l) => <Swatch key={fmt(l.path)} name={fmt(l.path)} value={l.value} warn lines={['no primitive']} />)}</Wrap>
        </Group>
      </Page>
    );
  },
};

export const ActionRoles: Story = {
  parameters: { source: 'src/atoms/Button.tsx', docs: { description: { story: 'D17: Saffron is the only solid button colour. Cobalt is for links, outline and secondary buttons, selected chips and the opt-in accent fill.' } } },
  render: () => (
    <Page>
      <Group title="Saffron is the action" note="colors.action.primary.default">
        <Wrap>
          <Button label="Apply now" variant="solid" tone="main" size={44} />
          <Button label="Apply now" variant="solid" tone="second" size={44} />
          <Button label="Disabled" variant="solid" tone="main" size={44} disabled />
        </Wrap>
      </Group>
      <Group title="Cobalt is the accent" note="colors.action.secondary.*, colors.action.accent.*, colors.text.link">
        <Wrap>
          <Button label="Learn more" variant="outline" tone="second" size={44} />
          <Button label="Opt-in accent fill" variant="solid" tone="accent" size={44} />
          <Button label="Read the terms" variant="link" tone="second" size={44} />
        </Wrap>
      </Group>
    </Page>
  ),
};

const radialLike = (g: { colors: readonly string[] }) => g.colors;

export const Gradients: Story = {
  parameters: { source: 'src/tokens/gradients.ts', docs: { description: { story: 'Linear gradients render with expo-linear-gradient. Radial gradients (type "radial") are drawn as flat stops because expo-linear-gradient cannot draw them. The raw hex values in gradients.ts have no primitive: a design system gap.' } } },
  render: () => (
    <Page>
      <Group title="gradients (src/tokens/gradients.ts)">
        <Wrap>
          {Object.entries(tokenGradients).map(([name, g]) => {
            const gg = g as any;
            return (
              <View key={name} style={{ width: 164, gap: spacing[4] }}>
                {gg.type === 'radial' ? (
                  <View style={{ height: 72, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row', borderWidth: borderWidth.thin, borderColor: colors.border.default }}>
                    {radialLike(gg).map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
                  </View>
                ) : (
                  <LinearGradient colors={gg.colors} locations={gg.locations} start={gg.start} end={gg.end} style={{ height: 72, borderRadius: radius.lg, borderWidth: borderWidth.thin, borderColor: colors.border.default }} />
                )}
                <Text variant="body12SemiBold">{name}</Text>
                <Caption>{gg.type === 'radial' ? 'radial, stops only: ' : ''}{gg.colors.join(' → ')}</Caption>
              </View>
            );
          })}
        </Wrap>
      </Group>
      <Group title="theme gradients (src/theme/gradients.ts)" note="Built from primitives, so they stay on the palette.">
        <Wrap>
          {Object.entries(themeGradients).map(([name, stops]) => (
            <View key={name} style={{ width: 164, gap: spacing[4] }}>
              <LinearGradient colors={[...stops] as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 72, borderRadius: radius.lg }} />
              <Text variant="body12SemiBold">{name}</Text>
              <Caption>{stops.join(' → ')}</Caption>
            </View>
          ))}
        </Wrap>
      </Group>
    </Page>
  ),
};

export const Tones: Story = {
  parameters: { source: 'src/tokens/colors.ts', docs: { description: { story: 'The nine semantic tones. Toast and InlineMessage read bg, bgSubtle, text and border from here.' } } },
  render: () => (
    <Page>
      <Wrap>
        {Object.entries(colors.tones).map(([name, t]) => (
          <Frame key={name} width={164} style={{ backgroundColor: t.bgSubtle, borderColor: t.border }}>
            <View style={{ height: 24, borderRadius: radius.sm, backgroundColor: t.bg }} />
            <Text variant="body14SemiBold" color={t.text}>{name}</Text>
            <Caption color={t.text}>text on bgSubtle</Caption>
          </Frame>
        ))}
      </Wrap>
    </Page>
  ),
};
