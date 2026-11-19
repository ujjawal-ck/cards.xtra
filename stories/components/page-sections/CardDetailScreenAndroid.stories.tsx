import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { CardDetailSheetProps } from '../../../src/organisms/CardDetailSheet';
import { CardDetailScreenAndroid } from '../../../src/organisms/CardDetailScreenAndroid';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { ComponentHarness } from '../../../storybook/harness';
import type { ApiParams } from '../../../storybook/harness';

/** Presents the sheet after mount, as in stories/_spike/Sheet.stories.tsx. Lives inside the harness so a parent re-render does not remount it. */
function Opener(props: CardDetailSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.present(), 400); return () => clearTimeout(t); }, []);
  return <CardDetailScreenAndroid ref={ref} {...props} />;
}
function Open({ api, ...props }: CardDetailSheetProps & { api?: ApiParams }) {
  return (
    <View style={{ width: 390, height: 844, alignSelf: 'center' }}>
      <ComponentHarness api={api}><Opener {...props} /></ComponentHarness>
    </View>
  );
}

const byId = Object.fromEntries(SAMPLE_CARDS.map((c) => [c.id, c]));

const meta = {
  title: 'Components/Page sections/CardDetailScreenAndroid',
  component: CardDetailScreenAndroid,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/CardDetailScreenAndroid.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'The Android card detail (decision D18): one full screen modal with a card pager, benefits, eligibility checker, FAQ and Apply bar. CardDetailSheet picks it on Android.' } },
  },
  argTypes: {
    card: { control: 'select', options: Object.keys(byId), mapping: byId, description: 'The card the sheet opens on.' },
    originY: { control: 'number', description: 'Screen Y of the tapped card. The open zoom grows from here.' },
    cards: { control: false }, recommended: { control: false }, initialCardId: { control: false },
    eligibilityDefaults: { control: 'object' },
    eligibleAliases: { control: 'object' },
  },
  args: { card: SAMPLE_CARDS[0], cards: SAMPLE_CARDS, recommended: SAMPLE_CARDS.slice(1) },
  render: (args) => <Open {...(args as CardDetailSheetProps)} />,
} satisfies Meta<typeof CardDetailScreenAndroid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: { docs: { description: { story: 'The screen opens 400 ms after mount at a single 100% snap. It is the Android branch, rendered here directly on web. The open zoom from the tapped card (originY), the swipe lean and the swipe down to close are native first and may differ on web. Not verified on a device.' } } },
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Variants are separate stories because only one modal sheet can be open at a time: Playground, EligibilityPrefilled.' } } },
  render: () => <Open card={SAMPLE_CARDS[1]} cards={SAMPLE_CARDS} recommended={SAMPLE_CARDS} />,
};

export const EligibilityPrefilled: Story = {
  parameters: { docs: { description: { story: 'The user already entered pincode and income on Home, so the embedded checker shows its result inline. The pincode here is a placeholder.' } } },
  args: { card: SAMPLE_CARDS[0], eligibilityDefaults: { pincode: '110001', income: '10,00,000', incomeType: 'salaried' } as any, eligibleAliases: [] },
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Card with no recommendations (the carousel is empty). Other states: invite-only card, lifetime-free card and discontinued card; pick them with the card control in Playground. Open question: the screen has no loading or error state for the benefits request.' } } },
  render: () => <Open card={SAMPLE_CARDS[4]} cards={[SAMPLE_CARDS[4]]} recommended={[]} api={{ mode: 'loading' }} />,
};
