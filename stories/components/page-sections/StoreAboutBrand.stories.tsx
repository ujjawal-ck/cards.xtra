import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreAboutBrand } from '../../../src/organisms/StoreAboutBrand';
import { images } from '../../../src/assets/images';
import { Labeled, Stack } from './_chrome';

const logos = { mcaffeine: images.stores.mcaffeine, amazon: images.stores.amazon2, myntra: images.stores.myntra31, tata: images.stores.tata };
const LONG = 'Mcaffeine is the first caffeinated personal care brand in India. Every product is made with coffee, is 100% SLS paraffin free, and is tested on people, not on animals. It ships across India and is sold on its own app and website.';

const meta = {
  title: 'Components/Page sections/StoreAboutBrand',
  component: StoreAboutBrand,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreAboutBrand.tsx', docs: { description: { component: 'The brand block on a store page: a logo chip and an optional one-line description that expands on tap.' } } },
  argTypes: {
    brandDescription: { control: 'boolean', description: 'On shows the description row. Off is logo only.' },
    logo: { control: 'select', options: Object.keys(logos), mapping: logos },
    description: { control: 'text' },
    onViewMore: { control: false },
    style: { control: false },
  },
  args: { brandDescription: true, logo: logos.mcaffeine as any },
} satisfies Meta<typeof StoreAboutBrand>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Labeled label="brandDescription = true (On)"><StoreAboutBrand logo={logos.mcaffeine} /></Labeled>
      <Labeled label="brandDescription = false (Off, logo only)"><StoreAboutBrand brandDescription={false} logo={logos.amazon} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Tap the description row to expand it. Collapsed shows one line with "View More". Expanded shows all the text with "View Less". Open question: there is no empty state for a store with no logo. Product has not decided what to show.' } } },
  render: () => (
    <Stack>
      <Labeled label="Collapsed, short text"><StoreAboutBrand logo={logos.myntra} description="India's fashion destination for brands you love." /></Labeled>
      <Labeled label="Collapsed, long text (truncates to one line, tap to expand)"><StoreAboutBrand logo={logos.mcaffeine} description={LONG} /></Labeled>
      <Labeled label="Logo only"><StoreAboutBrand brandDescription={false} logo={logos.tata} /></Labeled>
    </Stack>
  ),
};
