import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OrdersFilterMenu, type OrdersFilterMenuProps } from '../../../src/organisms/OrdersFilterMenu';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { Open } from './_present';
import { FilterHost } from './_ResultHost';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const STORES = [{ key: 'amazon', label: 'Amazon' }, { key: 'flipkart', label: 'Flipkart' }, { key: 'myntra', label: 'Myntra' }, { key: 'ajio', label: 'Ajio' }];

function Menu(props: OrdersFilterMenuProps) {
  const [tab, setTab] = useState(props.activeTab ?? 'status');
  const [status, setStatus] = useState(props.statusIndices ?? []);
  const [types, setTypes] = useState(props.typeIndices ?? []);
  const [date, setDate] = useState(props.datePresetIndex ?? 0);
  const [stores, setStores] = useState(props.storeKeys ?? []);
  const count = status.length + types.length + (date > 0 ? 1 : 0) + stores.length;
  const footer = <FooterButtons buttons="dual" size={44} shadow="on" strip="caption" stripTone="brand" stripText={`${count} filter${count === 1 ? '' : 's'} selected`} color="second" primaryLabel="Apply Filter" secondaryLabel="Clear" />;
  return (
    <Open>{(ref) => (
      <FilterHost ref={ref} footer={footer}>
        <OrdersFilterMenu {...props} activeTab={tab} onTabChange={setTab}
          statusIndices={status} onToggleStatus={(i) => setStatus((l) => toggle(l, i))}
          typeIndices={types} onToggleType={(i) => setTypes((l) => toggle(l, i))}
          datePresetIndex={date} onSelectDatePreset={setDate}
          storeKeys={stores} onToggleStore={(k) => setStores((l) => toggle(l, k))} />
      </FilterHost>
    )}</Open>
  );
}

const meta: Meta<OrdersFilterMenuProps> = {
  title: 'Components/Sheets/OrdersFilterMenu',
  component: OrdersFilterMenu,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/OrdersFilterMenu.tsx:259',
    docs: { description: { component: 'Orders filters: Status, Dates, Cashback/Reward and Store, as a left rail plus a right panel. Hosted by OrdersList in a 70% sheet with sticky header and footer, as shown here. Taps work in this story.' } },
  },
  argTypes: { activeTab: { control: 'select', options: ['status', 'dates', 'cashback-reward', 'store'] } },
  args: { storeOptions: STORES },
  render: (args) => <Menu {...args} />,
};
export default meta;
type Story = StoryObj<OrdersFilterMenuProps>;

export const Status: Story = {};
export const Dates: Story = { args: { activeTab: 'dates' } };
export const CashbackReward: Story = { args: { activeTab: 'cashback-reward' } };
export const Store: Story = { args: { activeTab: 'store' } };
export const StoreListEmpty: Story = { args: { activeTab: 'store', storeOptions: [] }, parameters: { docs: { description: { story: 'The user has no orders yet, so the store list is empty. The code shows no message for this; the owner decides if one is needed.' } } } };
export const WithSelections: Story = { args: { statusIndices: [0, 1], datePresetIndex: 2, storeKeys: ['amazon'] } };
