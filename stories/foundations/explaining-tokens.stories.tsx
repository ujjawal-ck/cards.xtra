import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import * as tokens from '../../src/tokens';
import { primitives, colors, spacing, radius, borderWidth } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Frame, Label, Tag } from './_shared';

const meta: Meta = {
  title: 'Foundations/Explaining tokens',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/index.ts', docs: { description: { component: 'What a token is, the primitive to semantic to component chain, and what the barrel exports.' } } },
};
export default meta;
type Story = StoryObj;

const Arrow = () => <Text variant="heading24Medium" color={colors.text.tertiary}>→</Text>;

function Step({ kind, name, value, children }: { kind: string; name: string; value?: string; children?: React.ReactNode }) {
  return (
    <Frame width={240}>
      <Tag>{kind}</Tag>
      {children}
      <Label>{name}</Label>
      {value ? <Caption>{value}</Caption> : null}
    </Frame>
  );
}

export const Chain: Story = {
  parameters: { source: 'src/tokens/colors.ts:19', docs: { description: { story: 'One value, three layers. The primitive holds the raw colour. The semantic token gives it a role. The component uses only the role. Values below are read from the token objects.' } } },
  render: () => (
    <Page>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[16] }}>
        <Step kind="Primitive" name="primitives.saffron[500]" value={primitives.saffron[500]}>
          <View style={{ height: 48, borderRadius: radius.md, backgroundColor: primitives.saffron[500] }} />
        </Step>
        <Arrow />
        <Step kind="Semantic" name="colors.action.primary.default" value={colors.action.primary.default}>
          <View style={{ height: 48, borderRadius: radius.md, backgroundColor: colors.action.primary.default }} />
        </Step>
        <Arrow />
        <Step kind="Component" name="Button solid, tone main">
          <Button label="Apply now" variant="solid" tone="main" size={44} />
        </Step>
      </View>
      <Caption>Change the semantic mapping and every component that uses it follows. Changing a primitive moves every role that points at it.</Caption>
    </Page>
  ),
};

export const Rules: Story = {
  parameters: { source: 'src/tokens/colors.ts', docs: { description: { story: 'Saffron marks the action. Cobalt marks the accent. They are not interchangeable (D17).' } } },
  render: () => (
    <Page>
      <Wrap>
        <Frame width={280}>
          <Tag>Saffron · action</Tag>
          <Text variant="body14Regular" color={colors.text.secondary}>The one solid button on a screen. Cashback amounts.</Text>
          <Button label="Apply now" variant="solid" tone="main" size={44} />
        </Frame>
        <Frame width={280}>
          <Tag>Cobalt · accent</Tag>
          <Text variant="body14Regular" color={colors.text.secondary}>Links, outline buttons, selected chips, focus.</Text>
          <View style={{ borderWidth: borderWidth.thin, borderColor: colors.border.focussed, borderRadius: radius.md, padding: spacing[8] }}>
            <Text variant="body14Medium" color={colors.text.link}>See how it works</Text>
          </View>
        </Frame>
      </Wrap>
    </Page>
  ),
};

export const Barrel: Story = {
  parameters: { source: 'src/tokens/index.ts', docs: { description: { story: 'Everything `src/tokens/index.ts` exports, read at runtime. Import from the barrel: `import { colors, spacing } from "../tokens"`.' } } },
  render: () => (
    <Page>
      <Group title={`${Object.keys(tokens).length} exports`}>
        <View style={{ gap: spacing[8] }}>
          {Object.entries(tokens).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: spacing[16], flexWrap: 'wrap' }}>
              <View style={{ width: 160 }}><Label>{k}</Label></View>
              <Caption>{Object.keys(v as object).length} keys: {Object.keys(v as object).slice(0, 8).join(', ')}{Object.keys(v as object).length > 8 ? ', …' : ''}</Caption>
            </View>
          ))}
        </View>
      </Group>
    </Page>
  ),
};
