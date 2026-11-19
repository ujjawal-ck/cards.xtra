import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Icon } from '../../src/atoms/Icon';
import { iconSize, avatarSize, mediaSize, sizing, colors, spacing, radius, borderWidth } from '../../src/tokens';
import { Page, Group, Wrap, Caption, Label } from './_shared';

const meta: Meta = {
  title: 'Foundations/Sizes',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/tokens/spacing.ts', docs: { description: { component: 'Icon, avatar, media sizes and the touch and layout sizes.' } } },
};
export default meta;
type Story = StoryObj;

const box = { backgroundColor: colors.background.lavender, borderWidth: borderWidth.thin, borderColor: colors.action.accent.default } as const;

export const Icons: Story = {
  parameters: { source: 'src/tokens/spacing.ts:24', docs: { description: { story: 'iconSize steps. Each is the real Icon atom at that edge length inside a measured box.' } } },
  render: () => (
    <Page>
      <Wrap gap={spacing[24]}>
        {Object.entries(iconSize).map(([k, v]) => (
          <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
            <View style={{ width: v, height: v, ...box }}><Icon name="check-circle-outline" size={v} /></View>
            <Label>iconSize[{k}]</Label>
            <Caption>{v}px</Caption>
          </View>
        ))}
      </Wrap>
    </Page>
  ),
};

export const Avatars: Story = {
  parameters: { source: 'src/tokens/spacing.ts:30', docs: { description: { story: 'avatarSize steps. Circles of that diameter.' } } },
  render: () => (
    <Page>
      <Wrap gap={spacing[24]}>
        {Object.entries(avatarSize).map(([k, v]) => (
          <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
            <View style={{ width: v, height: v, borderRadius: radius.full, ...box }} />
            <Label>avatarSize[{k}]</Label>
            <Caption>{v}px</Caption>
          </View>
        ))}
      </Wrap>
    </Page>
  ),
};

export const Media: Story = {
  parameters: { source: 'src/tokens/spacing.ts:36', docs: { description: { story: 'mediaSize steps: heights for brand and partner logos and contained illustrations. Separate from iconSize on purpose.' } } },
  render: () => (
    <Page>
      <Wrap gap={spacing[24]}>
        {Object.entries(mediaSize).map(([k, v]) => (
          <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
            <View style={{ height: v, width: v * 2, borderRadius: radius.sm, ...box }} />
            <Label>mediaSize[{k}]</Label>
            <Caption>height {v}px</Caption>
          </View>
        ))}
      </Wrap>
    </Page>
  ),
};

export const TouchAndLayout: Story = {
  parameters: { source: 'src/tokens/spacing.ts:44', docs: { description: { story: 'The `sizing` object: touch targets, container widths and fixed component heights. Each box is drawn at its value.' } } },
  render: () => (
    <Page>
      <Group title="sizing">
        <View style={{ gap: spacing[16] }}>
          {Object.entries(sizing).map(([k, v]) => {
            const wide = /container|ticketLogoW/.test(k);
            return (
              <View key={k} style={{ gap: spacing[4], alignItems: 'flex-start' }}>
                <Label>sizing.{k} · {v}px</Label>
                <View style={{ width: v, height: wide ? spacing[24] : v, ...box, borderRadius: radius.sm }} />
              </View>
            );
          })}
        </View>
      </Group>
    </Page>
  ),
};
