import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FilterMenu, type FilterMenuProps } from '../../../src/organisms/FilterMenu';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { Open } from './_present';
import { FilterHost } from './_ResultHost';

const toggle = (list: number[], i: number) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);

/** Holds the selection so taps work. `props` seed the first state. */
function Menu(props: FilterMenuProps) {
  const [tab, setTab] = useState(props.activeCategory ?? 'category');
  const [tiles, setTiles] = useState(props.selectedTileIndices ?? []);
  const [fee, setFee] = useState(props.selectedAnnualFee ?? []);
  const [net, setNet] = useState(props.selectedCardNetwork ?? []);
  const [type, setType] = useState(props.selectedCardType ?? []);
  const [banks, setBanks] = useState(props.selectedBanks ?? []);
  const count = tiles.length + fee.length + net.length + type.length + banks.length;
  const footer = <FooterButtons buttons="dual" size={44} shadow="on" strip="caption" stripTone="brand" stripText={`${count} filter${count === 1 ? '' : 's'} selected`} color="second" primaryLabel="Apply Filter" secondaryLabel="Clear" />;
  return (
    <Open>{(ref) => (
      <FilterHost ref={ref} footer={footer}>
        <FilterMenu {...props} activeCategory={tab} onCategoryChange={setTab}
          selectedTileIndices={tiles} onToggleTile={(i) => setTiles((l) => toggle(l, i))}
          selectedAnnualFee={fee} onToggleAnnualFee={(i) => setFee((l) => toggle(l, i))}
          selectedCardNetwork={net} onToggleCardNetwork={(i) => setNet((l) => toggle(l, i))}
          selectedCardType={type} onToggleCardType={(i) => setType((l) => toggle(l, i))}
          selectedBanks={banks} onToggleBanks={(i) => setBanks((l) => toggle(l, i))} />
      </FilterHost>
    )}</Open>
  );
}

const meta: Meta<FilterMenuProps> = {
  title: 'Components/Sheets/FilterMenu',
  component: FilterMenu,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/FilterMenu.tsx:267',
    docs: { description: { component: 'Home card filters: a left rail (Category, Annual Fee, Card Network, Card Type, Banks) and a right panel. A dot on a rail label means a filter is on. Not a modal itself: HomeScreen hosts it in a 70% sheet with a sticky header and footer, as shown here. Taps work in this story.' } },
  },
  argTypes: { activeCategory: { control: 'select', options: ['category', 'annual-fee', 'card-network', 'card-type', 'banks'] } },
  args: { bankOptions: ['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IDFC FIRST Bank'] },
  render: (args) => <Menu {...args} />,
};
export default meta;
type Story = StoryObj<FilterMenuProps>;

export const Category: Story = {};
export const AnnualFee: Story = { args: { activeCategory: 'annual-fee' } };
export const CardNetwork: Story = { args: { activeCategory: 'card-network' } };
export const CardType: Story = { args: { activeCategory: 'card-type' } };
export const Banks: Story = { args: { activeCategory: 'banks' } };
export const WithSelections: Story = { args: { selectedTileIndices: [0, 3], selectedAnnualFee: [0], selectedBanks: [1] }, parameters: { docs: { description: { story: 'Two categories, one fee bucket and one bank selected: dots show on the rail.' } } } };
