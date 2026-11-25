import React from 'react';
import { Image } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreBestCards } from '../../../src/organisms/StoreBestCards';
import { ComponentHarness } from '../../../storybook/harness';
import { api as apiPresets } from '../../../storybook/fixtures';
import { images } from '../../../src/assets/images';
import { Labeled, Stack } from './_chrome';

const uri = (src: any) => (Image as any).resolveAssetSource?.(src)?.uri ?? '';
/** Hand-written BankKaro-shaped rows for GET /cardgenius/cards. Only what mapBkCardToCardModel reads. Local art only. */
const bk = (id: number, name: string, image: any, commission: string, tagId: number, tag: string) => ({
  id, name, image: uri(image), card_alias: `sample-${id}`, status: true, commission, bank_id: 1,
  joining_fee_text: '2500', annual_fee_text: '2500', tags: [{ id: tagId, name: tag }],
  product_usps: [{ header: 'Get rewards on', description: 'all online spends', tag_id: tagId }],
});
const CARD_ROWS = [
  bk(1, 'HDFC Bank Regalia Gold Credit Card', images.cards.hdfcRegaliaGold, '2500', 2, 'Shopping'),
  bk(2, 'HDFC Swiggy Credit Card', images.cards.hdfcSwiggy, '1200', 2, 'Shopping'),
  bk(3, 'SBI Cashback Credit Card', images.cards.sbiCashback, '1200', 2, 'Shopping'),
  bk(4, 'ICICI Coral Credit Card', images.cards.iciciCoral, '1000', 12, 'Travel'),
];
const okPreset = apiPresets.ok();
const api = { ...okPreset, routes: [{ match: '/cardgenius/cards', body: { data: CARD_ROWS } }, ...(okPreset.routes ?? [])] };

const Wrapped = (props: React.ComponentProps<typeof StoreBestCards> & { mode?: 'ok' | 'loading' | 'error' }) => {
  const { mode = 'ok', ...rest } = props;
  return <ComponentHarness api={mode === 'ok' ? api : { mode }}><StoreBestCards {...rest} /></ComponentHarness>;
};

const meta = {
  title: 'Components/Page sections/StoreBestCards',
  component: StoreBestCards,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/StoreBestCards.tsx',
    layout: 'padded',
    docs: { description: { component: 'The Best cards to use here floor on a store page: a card carousel matched to the store category, with the card detail sheet on tap.' } },
  },
  argTypes: {
    category: { control: 'select', options: [undefined, 'Fashion', 'Flights & Travel', 'Food & Grocery', 'Electronics', 'Banking'], description: 'Offers category. No match falls back to the top cards.' },
    title: { control: 'text' },
    style: { control: false },
  },
  render: (args) => <Wrapped {...args} />,
} satisfies Meta<typeof StoreBestCards>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: { docs: { description: { story: 'There is no checked-in fixture for the BankKaro card list, so this story serves four hand-written rows (HDFC Regalia Gold, HDFC Swiggy, SBI Cashback, ICICI Coral) through the harness api mock. Card art is local. The carousel appears after the query resolves.' } } },
  args: { category: 'Fashion' },
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label='category = "Fashion" (matched: "Best cards to use here")'><Wrapped category="Fashion" /></Labeled>
      <Labeled label='category = "Flights & Travel" (matched, travel cards)'><Wrapped category="Flights & Travel" /></Labeled>
      <Labeled label='category = "Banking" (no match: "Popular credit cards")'><Wrapped category="Banking" /></Labeled>
      <Labeled label="Custom title"><Wrapped category="Fashion" title="Cards that pay more on Myntra" /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Loading, error and an empty catalog all render nothing: the component returns null so the screen floors collapse. A blank area is the correct output. This story shows loading. Open question for product: should a failed card load show a retry.' } } },
  render: () => (
    <Stack>
      <Labeled label="Loading (renders nothing)"><Wrapped mode="loading" category="Fashion" /></Labeled>
    </Stack>
  ),
};

/** Separate story: all harnesses share one query client and one fetch mock, so loading and error cannot sit on one page. */
export const ErrorState: Story = {
  parameters: { docs: { description: { story: 'The card list request fails. The component renders nothing.' } } },
  render: () => (
    <Stack>
      <Labeled label="Error (renders nothing)"><Wrapped mode="error" category="Fashion" /></Labeled>
    </Stack>
  ),
};
