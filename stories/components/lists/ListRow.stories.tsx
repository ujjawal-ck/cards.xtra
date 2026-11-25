import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ListRow, type ListRowType } from '../../../src/molecules/ListRow';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing } from '../../../src/tokens';

const noop = () => {};
const TYPES: ListRowType[] = ['number-bullet', 'thumbnail-key-chevron', 'icon-definition', 'icon-caption-value', 'bullet-point', 'icon-caption', 'amount-status', 'caption-value', 'caption-cta', 'menu-option', 'simple-bullet', 'rate-description'];
const STATUSES = ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid', 'expired'] as const;

const meta = {
  title: 'Components/Lists/ListRow',
  component: ListRow,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/ListRow.tsx',
    docs: { description: { component: 'One row component with twelve render modes picked by type. Each mode reads only the props it needs.' } },
  },
  decorators: [(Story) => <View style={{ width: 340 }}><Story /></View>],
  argTypes: {
    type: { control: 'select', options: TYPES },
    number: { control: 'text' },
    description: { control: 'text' },
    text: { control: 'text' },
    caption: { control: 'text' },
    value: { control: 'text' },
    label: { control: 'text' },
    rate: { control: 'text' },
    title: { control: 'text' },
    biline: { control: 'text' },
    icon: { control: 'select', options: ['wallet-outline', 'bank-pillars-outline', 'help-ticket-outline', 'bell-outline', 'headset-outline', 'logout-outline'] },
    status: { control: 'select', options: [undefined, ...STATUSES] },
    thumbnail: { control: false },
    onPress: { control: false },
    onCta: { control: false },
    style: { control: false },
  },
  args: {
    type: 'amount-status',
    number: 1,
    description: 'Shop through CashKaro before you add to cart',
    text: 'Amazon',
    caption: 'Cashback earned',
    value: '₹1,250',
    label: 'Pending cashback',
    rate: 'Up to X%',
    title: 'Payment settings',
    biline: 'Order on 19 Sep 2026',
    icon: 'wallet-outline',
    thumbnail: images.brands.amazon,
    status: 'pending',
    onPress: noop,
    onCta: noop,
  },
} satisfies Meta<typeof ListRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const sample = (type: ListRowType) => {
  switch (type) {
    case 'number-bullet': return <ListRow type={type} number={1} description="Click the store from CashKaro" />;
    case 'thumbnail-key-chevron': return <ListRow type={type} thumbnail={images.brands.flipkart} text="Flipkart" onPress={noop} />;
    case 'icon-definition': return <ListRow type={type} description="Cashback is added after the return window ends" />;
    case 'icon-caption-value': return <ListRow type={type} icon="wallet-outline" caption="Confirmed cashback" value="₹1,250" />;
    case 'bullet-point': return <ListRow type={type} description="Use the CashKaro link every time you shop" />;
    case 'icon-caption': return <ListRow type={type} icon="bell-outline" caption="Get tracking alerts" />;
    case 'amount-status': return <ListRow type={type} value="₹1,250" biline="Order on 19 Sep 2026" status="confirmed" />;
    case 'caption-value': return <ListRow type={type} label="Order value" value="₹10,000" />;
    case 'caption-cta': return <ListRow type={type} label="Order details" onCta={noop} />;
    case 'menu-option': return <ListRow type={type} icon="bank-pillars-outline" title="Payment settings" onPress={noop} />;
    case 'simple-bullet': return <ListRow type={type} description="Cashback rates can change without notice" />;
    case 'rate-description': return <ListRow type={type} rate="Up to X%" description="On fashion and beauty orders" />;
  }
};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'All twelve types, in the order of the ListRowType union.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[16] }}>
      {TYPES.map((t) => (
        <View key={t} style={{ gap: spacing[4] }}>
          <Text variant="body12Medium" color={colors.text.secondary}>{t}</Text>
          {sample(t)}
        </View>
      ))}
    </View>
  ),
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: spacing[4] }}>
    <Text variant="body12Medium" color={colors.text.secondary}>{title}</Text>
    {children}
  </View>
);

export const States: Story = {
  parameters: { docs: { description: { story: 'Seven status values on amount-status, ₹0 and ₹10,00,000 with Indian grouping, long copy, and a row with no handler. There is no loading or error mode on this component.' } } },
  render: () => (
    <View style={{ width: 340, gap: spacing[16] }}>
      {STATUSES.map((s) => (
        <Block key={s} title={`amount-status, ${s}`}><ListRow type="amount-status" value="₹1,250" biline="Amazon, 19 Sep 2026" status={s} /></Block>
      ))}
      <Block title="₹0"><ListRow type="amount-status" value={`₹${(0).toLocaleString('en-IN')}`} biline="Nothing tracked yet" status="requested" /></Block>
      <Block title="₹10,00,000"><ListRow type="amount-status" value={`₹${(1000000).toLocaleString('en-IN')}`} biline="Large order, long biline that wraps onto a second line on a narrow phone" status="paid" /></Block>
      <Block title="long description"><ListRow type="number-bullet" number={2} description="Shop as usual on the store app or site and do not click on any other coupon, deal or price comparison link before you check out" /></Block>
      <Block title="menu-option without onPress"><ListRow type="menu-option" icon="headset-outline" title="Get help" /></Block>
    </View>
  ),
};
