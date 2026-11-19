import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CardDetailSheet, type CardDetailSheetProps } from '../../../src/organisms/CardDetailSheet';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import { ComponentHarness } from '../../../storybook/harness';
import type { ApiParams } from '../../../storybook/harness';

/** Presents the sheet after mount, as in stories/_spike/Sheet.stories.tsx. Lives inside the harness so a parent re-render does not remount it. */
function Opener(props: CardDetailSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.present(), 400); return () => clearTimeout(t); }, []);
  return <CardDetailSheet ref={ref} {...props} />;
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
  title: 'Components/Page sections/CardDetailSheet',
  component: CardDetailSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/CardDetailSheet.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'The card detail bottom sheet (iOS): a two-stage sheet with a card pager, benefits, eligibility checker, FAQ and Apply bar.' } },
  },
  argTypes: {
    card: { control: 'select', options: Object.keys(byId), mapping: byId, description: 'The card the sheet opens on.' },
    index: { control: 'radio', options: [0, 1], description: 'Snap index on present. 0 is the partial sheet (75%), 1 is full screen.' },
    cards: { control: false }, recommended: { control: false }, initialCardId: { control: false }, originY: { control: false },
    eligibilityDefaults: { control: 'object' },
    eligibleAliases: { control: 'object' },
  },
  args: { card: SAMPLE_CARDS[0], cards: SAMPLE_CARDS, recommended: SAMPLE_CARDS.slice(1), index: 0 },
  render: (args) => <Open {...(args as CardDetailSheetProps)} />,
} satisfies Meta<typeof CardDetailSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: { docs: { description: { story: 'The sheet opens 400 ms after mount. On web Platform.OS is "web", so the iOS two-stage sheet renders (the Android full screen version is CardDetailScreenAndroid). Drag, snap and the zoom animation are native first and may differ on web. No fixture exists for the card benefits request (GET /cardgenius/cards/:alias), so what the benefits section shows without it is not verified.' } } },
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'Variants are separate stories because only one modal sheet can be open at a time: Playground (partial), Expanded, EligibilityPrefilled.' } } },
  render: () => <Open card={SAMPLE_CARDS[1]} cards={SAMPLE_CARDS} recommended={SAMPLE_CARDS} index={0} />,
};

export const Expanded: Story = {
  parameters: { docs: { description: { story: 'Opens at snap index 1 (full screen), as when the user comes back from All Card Benefits.' } } },
  args: { card: SAMPLE_CARDS[2], index: 1 },
};

export const EligibilityPrefilled: Story = {
  parameters: { docs: { description: { story: 'The user already entered pincode and income on Home, so the embedded checker shows its result inline. The pincode here is a placeholder.' } } },
  args: { card: SAMPLE_CARDS[0], eligibilityDefaults: { pincode: '110001', income: '10,00,000', incomeType: 'salaried' } as any, eligibleAliases: [] },
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Card with no recommendations (the carousel is empty). Other states: invite-only card (SAMPLE_CARDS[0]), lifetime-free card (SAMPLE_CARDS[1]) and discontinued card (SAMPLE_CARDS[4]); pick them with the card control in Playground. Open question: the sheet has no loading or error state for the benefits request.' } } },
  render: () => <Open card={SAMPLE_CARDS[4]} cards={[SAMPLE_CARDS[4]]} recommended={[]} index={0} api={{ mode: 'loading' }} />,
};
