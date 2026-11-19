import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FilterMenu, type FilterMenuProps } from '../../../src/organisms/FilterMenu';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { FilterTransitionOverlay } from '../../../src/organisms/FilterTransitionOverlay';
import { PhoneFrame, SheetHarness, ComponentHarness } from '../../../storybook/harness';
import { FilterHost } from '../01-launch-and-login/_hosts';

const toggle = (list: number[], i: number) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);
const BANKS = ['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Federal Bank'];

/** Holds the selection so taps work. `seed` is the first state. */
function Menu({ seed = {} }: { seed?: Partial<FilterMenuProps> }) {
  const [tab, setTab] = useState(seed.activeCategory ?? 'category');
  const [tiles, setTiles] = useState(seed.selectedTileIndices ?? []);
  const [fee, setFee] = useState(seed.selectedAnnualFee ?? []);
  const [net, setNet] = useState(seed.selectedCardNetwork ?? []);
  const [type, setType] = useState(seed.selectedCardType ?? []);
  const [banks, setBanks] = useState(seed.selectedBanks ?? []);
  const count = tiles.length + fee.length + net.length + type.length + banks.length;
  const footer = <FooterButtons buttons="dual" size={44} shadow="on" strip="caption" stripTone="brand" stripText={`${count} filter${count === 1 ? '' : 's'} selected`} color="second" primaryLabel="Apply Filter" secondaryLabel="Clear" />;
  return (
    <SheetHarness>
      {(ref) => (
        <FilterHost ref={ref as never} footer={footer}>
          <FilterMenu
            bankOptions={BANKS}
            activeCategory={tab} onCategoryChange={setTab}
            selectedTileIndices={tiles} onToggleTile={(i) => setTiles((l) => toggle(l, i))}
            selectedAnnualFee={fee} onToggleAnnualFee={(i) => setFee((l) => toggle(l, i))}
            selectedCardNetwork={net} onToggleCardNetwork={(i) => setNet((l) => toggle(l, i))}
            selectedCardType={type} onToggleCardType={(i) => setType((l) => toggle(l, i))}
            selectedBanks={banks} onToggleBanks={(i) => setBanks((l) => toggle(l, i))}
          />
        </FilterHost>
      )}
    </SheetHarness>
  );
}

const meta: Meta = {
  title: 'Flows/2 Home and discovery/Filters',
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false },
      description: { component: 'The Filters chip on Home opens a 70% sheet: a left rail (Category, Annual Fee, Card Network, Card Type, Banks) and a right panel. "Apply Filter" runs a white-screen transition and then shows the filtered list. The stories render the real FilterMenu in the same host Home uses; taps on the options work.' },
    },
  },
};
export default meta;
type Story = StoryObj;

/** Menu: Category tab, nothing selected. */
export const MenuOpen: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/FilterMenu.tsx:267' },
  render: () => <Menu />,
};

/** Applied: selections on three rails (dots on the rail labels, count in the footer). */
export const Applied: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/FilterMenu.tsx:267', docs: { description: { story: 'A category, a fee bucket and a bank selected. The strip above "Apply Filter" counts them.' } } },
  render: () => <Menu seed={{ selectedTileIndices: [0, 3], selectedAnnualFee: [1], selectedBanks: [0] }} />,
};

/** Transition: the white screen with the redirect animation after "Apply Filter". */
export const Transition: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/FilterTransitionOverlay.tsx:74', docs: { description: { story: 'The overlay holds for about 2 seconds, then fades out. Storybook stubs the Rive animation, so the animation area is blank. The story starts the transition once on mount; reload to see it again.' } } },
  render: () => (
    <ComponentHarness>
      <View style={{ flex: 1 }}>
        <FilterTransitionOverlay visible onCovered={() => {}} onHidden={() => {}} />
      </View>
    </ComponentHarness>
  ),
};
