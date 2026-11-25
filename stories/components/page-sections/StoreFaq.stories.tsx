import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StoreFaq } from '../../../src/organisms/StoreFaq';
import { Labeled, Stack } from './_chrome';

const ITEMS = [
  { question: 'How long does Amazon cashback take to track?', answer: 'Cashback usually tracks within 72 hours of the order. You can see it in Orders as Pending.' },
  { question: 'When is my cashback confirmed?', answer: 'Cashback is confirmed after the return window of the order closes. This is usually 30 to 90 days.' },
  { question: 'Why did my order not track?', answer: 'Orders do not track if you used another coupon site, did not accept cookies, or opened the app link before the cashback click.' },
];

const meta = {
  title: 'Components/Page sections/StoreFaq',
  component: StoreFaq,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/StoreFaq.tsx', docs: { description: { component: 'The Frequently Asked Questions block on a store page: accordion rows, one open at a time, first open by default.' } } },
  argTypes: {
    items: { control: 'object', description: 'Question and answer pairs.' },
    title: { control: 'text' },
    style: { control: false },
  },
  args: { items: ITEMS },
} satisfies Meta<typeof StoreFaq>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  parameters: { docs: { description: { story: 'StoreFaq has no visual variants. It differs only by title and item count.' } } },
  render: () => (
    <Stack>
      <Labeled label="Default title"><StoreFaq items={ITEMS} /></Labeled>
      <Labeled label="Custom title"><StoreFaq title="Mcaffeine FAQs" items={ITEMS.slice(0, 2)} /></Labeled>
    </Stack>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'With no items the component renders nothing, so the screen collapses the section.' } } },
  render: () => (
    <Stack>
      <Labeled label="One item"><StoreFaq items={ITEMS.slice(0, 1)} /></Labeled>
      <Labeled label="Many items (8)"><StoreFaq items={[...ITEMS, ...ITEMS, ...ITEMS.slice(0, 2)]} /></Labeled>
      <Labeled label="Long question and answer"><StoreFaq items={[{ question: 'What happens to my cashback if I return part of an order worth ₹10,00,000 that was paid by EMI on a credit card?', answer: 'Cashback is reduced in proportion to the returned items. If the whole order is returned, the cashback is cancelled. EMI interest and shipping charges are not part of the cashback base. Refunds can take up to 45 days to reach the original payment method, and the cashback status updates only after the store confirms the return.' }]} /></Labeled>
      <Labeled label="Empty (renders nothing)"><StoreFaq items={[]} /></Labeled>
    </Stack>
  ),
};
