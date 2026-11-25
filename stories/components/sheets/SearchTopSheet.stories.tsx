import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SearchTopSheet, type SearchTopSheetProps } from '../../../src/organisms/SearchTopSheet';
import { CARDS } from './_data';
import { Frame } from './_present';

const chips = [
  { label: 'HDFC Bank', leadingIcon: 'feat-bank-outline', image: CARDS[0].cardImage },
  { label: 'SBI Card', leadingIcon: 'feat-bank-outline', image: CARDS[2].cardImage },
  { label: 'ICICI Bank', leadingIcon: 'feat-bank-outline', image: CARDS[3].cardImage },
] as SearchTopSheetProps['recentSearches'];
const sections: SearchTopSheetProps['sections'] = [
  { header: 'Banks', rows: [{ logo: CARDS[0].cardImage, title: 'HDFC Bank', subtitle: '3 cards' }] },
  { header: 'Cards', rows: [{ logo: CARDS[0].cardImage, title: CARDS[0].name, subtitle: CARDS[0].cashback ?? '' }, { logo: CARDS[1].cardImage, title: CARDS[1].name, subtitle: CARDS[1].cashback ?? '' }] },
];

const meta: Meta<SearchTopSheetProps> = {
  title: 'Components/Sheets/SearchTopSheet',
  component: SearchTopSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/SearchTopSheet.tsx:127',
    docs: { description: { component: 'Search that drops from the top: a search bar, popular chips, the user\'s history, bank and card results, a no-results block and a "help me pick" row to the advisor. An RN Modal, so on web it covers the whole preview, not only the 390 frame. Bank rows use card art in these stories because no bank logos ship.' } },
  },
  argTypes: { variant: { control: 'radio', options: ['suggestions', 'history'] }, value: { control: 'text' }, onClose: { action: 'close' }, onChangeText: { action: 'change text' }, onResultPress: { action: 'result' }, onAdvisorPress: { action: 'advisor' } },
  args: { visible: true, variant: 'suggestions', value: '', recentSearches: chips, sections: [], placeholder: 'Search cards or banks' },
  render: (args) => <Frame><SearchTopSheet {...args} /></Frame>,
};
export default meta;
type Story = StoryObj<SearchTopSheetProps>;

export const EmptyQuery: Story = { args: { onAdvisorPress: () => {} }, parameters: { docs: { description: { story: 'Popular chips and the advisor row.' } } } };
export const WithHistory: Story = { args: { historySearches: [{ label: 'HDFC Swiggy Credit Card', image: CARDS[1].cardImage }, { label: 'SBI Card', image: CARDS[2].cardImage }], onClearHistory: () => {} } };
export const Results: Story = { args: { value: 'hdfc', sections } };
export const NoResults: Story = { args: { value: 'zzzz', sections: [], onAdvisorPress: () => {} } };
export const StoreWording: Story = { args: { value: 'zzzz', noResultsHint: 'Try a store name like Amazon or Myntra, or a category.' }, parameters: { docs: { description: { story: 'Offers passes its own no-results hint (stores and categories).' } } } };
export const HistoryVariant: Story = { args: { variant: 'history' } };
