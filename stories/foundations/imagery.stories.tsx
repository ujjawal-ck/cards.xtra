import React from 'react';
import { View, Image } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '../../src/atoms/Text';
import { images } from '../../src/assets/images';
import { logos } from '../../src/assets/logos';
import { colors, spacing, radius, borderWidth } from '../../src/tokens';
import { Page, Group, Wrap, Caption } from './_shared';

const meta: Meta = {
  title: 'Foundations/Imagery',
  tags: ['live'],
  parameters: { layout: 'padded', source: 'src/assets/images/index.ts', docs: { description: { component: 'Card art, store and brand logos, illustrations, backgrounds and the app wordmark.' } } },
};
export default meta;
type Story = StoryObj;

function Tile({ name, src, w, h, fit = 'contain', dark }: { name: string; src: any; w: number; h: number; fit?: 'contain' | 'cover'; dark?: boolean }) {
  return (
    <View style={{ width: Math.max(w, 96), gap: spacing[4] }}>
      <View style={{ width: Math.max(w, 96), height: h + spacing[16], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: borderWidth.thin, borderColor: colors.border.subtle3, backgroundColor: dark ? colors.surface.dark : colors.background.muted }}>
        <Image source={src} style={{ width: w, height: h }} resizeMode={fit} />
      </View>
      <Caption>{name}</Caption>
    </View>
  );
}

type G = keyof typeof images;
const gallery = (title: string, keys: G[], w: number, h: number, note?: string, fit: 'contain' | 'cover' = 'contain', dark: boolean | ((n: string) => boolean) = false): React.ReactNode => (
  <>
    {keys.map((k) => (
      <Group key={k} title={`${title}: images.${k}`} note={note}>
        <Wrap gap={spacing[16]}>
          {Object.entries(images[k] as Record<string, any>).map(([n, src]) => <Tile key={n} name={n} src={src} w={w} h={h} fit={fit} dark={typeof dark === 'function' ? dark(n) : dark} />)}
        </Wrap>
      </Group>
    ))}
  </>
);

export const CardArt: Story = {
  parameters: { source: 'src/assets/images/index.ts:16', docs: { description: { story: 'Credit card art, `images.cards`. Rendered by CardArt and the card tiles.' } } },
  render: () => <Page>{gallery('Card art', ['cards'], 144, 92)}</Page>,
};

export const StoreAndBrandLogos: Story = {
  parameters: { source: 'src/assets/images/index.ts:74', docs: { description: { story: 'Partner marks: `brands` (store brand logos) and `stores` (store and bank tiles). Frame them with BrandLogoTile or LogoContainer.' } } },
  render: () => <Page>{gallery('Logos', ['brands', 'stores'], 88, 56)}</Page>,
};

export const Categories: Story = {
  parameters: { source: 'src/assets/images/index.ts:46', docs: { description: { story: 'Category art and the Home filter icons.' } } },
  render: () => <Page>{gallery('Categories', ['categories', 'filters'], 64, 64)}</Page>,
};

export const Illustrations: Story = {
  parameters: { source: 'src/assets/images/index.ts:141', docs: { description: { story: 'Illustrations: the three ScreenState images, onboarding slides, help mastheads and the promo banner.' } } },
  render: () => (
    <Page>
      {gallery('Illustrations', ['screenstate'], 120, 120)}
      {gallery('Illustrations', ['onboarding', 'promos'], 96, 150)}
      {gallery('Illustrations', ['help'], 176, 96)}
    </Page>
  ),
};

export const Backgrounds: Story = {
  parameters: { source: 'src/assets/images/index.ts:100', docs: { description: { story: 'Hero backgrounds and the store page headers.' } } },
  render: () => <Page>{gallery('Backgrounds', ['backgrounds', 'storepage'], 160, 96, undefined, 'cover')}</Page>,
};

export const AppLogo: Story = {
  parameters: { source: 'src/assets/logos.ts', docs: { description: { story: 'The Cards.xtra wordmark. SVG components (`logos`) for crisp rendering, PNG twins in `images.logos`. light = white mark for dark surfaces. dark = dark mark for light surfaces.' } } },
  render: () => (
    <Page>
      <Group title="logos (SVG)">
        <Wrap gap={spacing[16]}>
          {Object.entries(logos).map(([name, Logo]) => {
            const onDark = name.startsWith('light');
            const L = Logo as React.ComponentType<{ width?: number; height?: number }>;
            return (
              <View key={name} style={{ gap: spacing[4] }}>
                <View style={{ padding: spacing[16], borderRadius: radius.lg, backgroundColor: onDark ? colors.surface.dark : colors.background.muted, borderWidth: borderWidth.thin, borderColor: colors.border.subtle3 }}>
                  <L width={name.endsWith('Small') ? 114 : 140} height={name.endsWith('Small') ? 56 : 70} />
                </View>
                <Text variant="body12SemiBold">logos.{name}</Text>
              </View>
            );
          })}
        </Wrap>
      </Group>
      {gallery('Wordmark PNG', ['logos'], 114, 56, undefined, 'contain', (n) => n.startsWith('light'))}
    </Page>
  ),
};
