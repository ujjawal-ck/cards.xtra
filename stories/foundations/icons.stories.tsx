import React, { useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Icon, ICON_NAMES } from '../../src/atoms/Icon';
import { Text } from '../../src/atoms/Text';
import { colors, spacing, radius, borderWidth, iconSize, typography } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Frame, Label } from './_shared';

const meta: Meta = {
  title: 'Foundations/Icons',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/atoms/Icon.tsx', docs: { description: { component: 'Every icon name in the registry, rendered with the Icon atom.' } } },
};
export default meta;
type Story = StoryObj;

const prefixOf = (n: string) => (n.includes('-') ? n.split('-')[0] : 'other');
const raster = new Set(['amazon', 'flipkart', 'pay-amazon', 'pay-combined', 'pay-flipkart']);

function Cell({ name, size, color }: { name: (typeof ICON_NAMES)[number]; size: number; color: string }) {
  return (
    <View style={{ width: 112, alignItems: 'center', gap: spacing[8], padding: spacing[8], borderRadius: radius.lg, borderWidth: borderWidth.thin, borderColor: colors.border.subtle3, backgroundColor: colors.surface.default }}>
      <Icon name={name} size={size} color={color} />
      <Text variant="caption10Medium" color={colors.text.secondary} align="center">{name}</Text>
    </View>
  );
}

function Grid() {
  const [q, setQ] = useState('');
  const shown = useMemo(() => ICON_NAMES.filter((n) => n.includes(q.trim().toLowerCase())), [q]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof shown>();
    for (const n of shown) m.set(prefixOf(n), [...(m.get(prefixOf(n)) ?? []), n]);
    return Array.from(m.entries());
  }, [shown]);
  return (
    <Page>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={`Search ${ICON_NAMES.length} icons`}
        placeholderTextColor={colors.text.placeholder}
        style={[typography.body14Regular, { height: 44, paddingHorizontal: spacing[16], borderRadius: radius.lg, borderWidth: borderWidth.thin, borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.default, maxWidth: 360 }] as any}
      />
      <Caption>{shown.length} of {ICON_NAMES.length} shown</Caption>
      {groups.map(([g, names]) => (
        <Group key={g} title={`${g} (${names.length})`}>
          <Wrap gap={spacing[12]}>{names.map((n) => <Cell key={n} name={n} size={iconSize[24]} color={colors.icon.actions} />)}</Wrap>
        </Group>
      ))}
    </Page>
  );
}

export const Registry: Story = {
  parameters: { source: 'src/atoms/Icon.tsx:127', docs: { description: { story: 'Type in the box to filter by name. Groups follow the name prefix: nav, feat, desc, pay, social, help and the rest.' } } },
  render: () => <Grid />,
};

export const Tinting: Story = {
  parameters: { source: 'src/atoms/Icon.tsx:11', docs: { description: { story: 'Outline and general icons take `color` (their stroke is currentColor). nav-* and desc-* icons keep their baked colours on purpose. Raster brand logos ignore `color`.' } } },
  render: () => (
    <Page>
      <Group title="color prop">
        <Wrap>
          {([['icon.actions', colors.icon.actions], ['icon.brand', colors.icon.brand], ['icon.danger', colors.icon.danger], ['icon.success', colors.icon.success], ['icon.disabled', colors.icon.disabled]] as const).map(([n, c]) => (
            <Frame key={n} width={120}><Icon name="star-outline" size={iconSize[32]} color={c} /><Label>colors.{n}</Label></Frame>
          ))}
        </Wrap>
      </Group>
      <Group title="baked colours" note="These ignore the color prop.">
        <Wrap>
          {(['nav-home-filled', 'desc-confirmed', 'desc-cross', 'desc-cashback'] as const).map((n) => (
            <Frame key={n} width={120} style={n.startsWith('nav') ? { backgroundColor: colors.surface.dark } : undefined}>
              <Icon name={n} size={iconSize[32]} color={colors.icon.danger} />
              <Text variant="body12SemiBold" color={n.startsWith('nav') ? colors.text.inverse : colors.text.primary}>{n}</Text>
            </Frame>
          ))}
        </Wrap>
      </Group>
      <Group title="raster logos" note={`${[...raster].join(', ')}: PNG, colours baked in.`}>
        <Wrap>{[...raster].map((n) => <Frame key={n} width={120}><Icon name={n as any} size={iconSize[32]} /><Label>{n}</Label></Frame>)}</Wrap>
      </Group>
    </Page>
  ),
};

export const Sizes: Story = {
  parameters: { source: 'src/atoms/Icon.tsx:140', docs: { description: { story: 'The `size` prop takes an iconSize step. Default is iconSize[20].' } } },
  render: () => (
    <Page>
      <Wrap gap={spacing[24]}>
        {Object.values(iconSize).map((s) => <View key={s} style={{ alignItems: 'center', gap: spacing[4] }}><Icon name="wallet-outline" size={s} /><Caption>{s}</Caption></View>)}
      </Wrap>
    </Page>
  ),
};
