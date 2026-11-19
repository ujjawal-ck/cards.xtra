import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SearchBar, SearchResults, type SearchBarProps, type SearchResultSection } from '../../../src/molecules/SearchBar';
import { images } from '../../../src/assets/images';
import { Group, Stack } from './_kit';

const SECTIONS: SearchResultSection[] = [
  { header: 'Cards', rows: [
    { logo: images.brands.amazon, title: 'HDFC Millennia', subtitle: 'Credit card · X% on Amazon' },
    { logo: images.brands.flipkart, title: 'SBI Cashback', subtitle: 'Credit card · Annual fee ₹999' },
  ] },
  { header: 'Stores', rows: [
    { logo: images.brands.myntra, title: 'Myntra', subtitle: 'Fashion' },
  ] },
];

/** SearchBar that moves default, focused, filled by itself as the user taps and types. */
function Live(props: SearchBarProps) {
  const [state, setState] = useState(props.state ?? 'default');
  const [value, setValue] = useState(props.value ?? '');
  return (
    <SearchBar
      {...props}
      state={state}
      value={value}
      sections={value.length > 0 ? props.sections ?? SECTIONS : []}
      onFocus={() => setState(value ? 'filled' : 'focused')}
      onBack={() => { setValue(''); setState('default'); }}
      onBlur={() => { if (!value) setState('default'); }}
      onChangeText={(t) => { setValue(t); setState(t ? 'filled' : 'focused'); }}
      onClear={() => { setValue(''); setState('focused'); }}
    />
  );
}

const meta = {
  title: 'Components/Input fields/SearchBar',
  component: SearchBar,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/SearchBar.tsx',
    docs: { description: { component: 'A 48 dp search bar with three states (default, focused, filled). The filled state shows a results list below the bar.' } },
  },
  argTypes: {
    state: { control: 'select', options: ['default', 'focused', 'filled'] },
    leadingIcon: { control: 'select', options: ['back', 'search'] },
    value: { control: 'text' },
    placeholder: { control: 'text' },
  },
  args: { state: 'default', placeholder: 'Search cards and stores', leadingIcon: 'back' },
  render: (args) => <Stack><Live {...args} /></Stack>,
} satisfies Meta<typeof SearchBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Group label="default"><SearchBar state="default" /></Group>
      <Group label="focused, leadingIcon back"><SearchBar state="focused" leadingIcon="back" /></Group>
      <Group label="focused, leadingIcon search"><SearchBar state="focused" leadingIcon="search" /></Group>
      <Group label="filled with results"><SearchBar state="filled" value="hdfc" sections={SECTIONS} /></Group>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'The cycling placeholder animates on web but timing differs from a device. Filled with no sections shows the bar only; the empty-results message is not part of this component (open product question: where it lives).' } } },
  render: () => (
    <Stack>
      <Group label="cycling placeholders"><SearchBar state="default" placeholders={['Search HDFC Millennia', 'Search SBI Cashback', 'Search Amazon']} /></Group>
      <Group label="filled, no results"><SearchBar state="filled" value="zzzz" sections={[]} /></Group>
      <Group label="long query"><SearchBar state="filled" value="HDFC Bank Millennia credit card with Amazon Pay and Flipkart" sections={[]} /></Group>
    </Stack>
  ),
};

export const SearchResultsList: StoryObj<typeof SearchResults> = {
  name: 'SearchResults',
  parameters: { docs: { description: { story: 'The results list on its own. Rendered under the bar by SearchBar, or alone inside a sheet scroll area (SearchTopSheet).' } } },
  render: () => <Stack><SearchResults sections={SECTIONS} /></Stack>,
};
