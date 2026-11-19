import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { BottomSheet, type BottomSheetProps } from '../../../src/organisms/BottomSheet';
import { images } from '../../../src/assets/images';
import { Open } from './_present';

const meta: Meta<BottomSheetProps> = {
  title: 'Components/Sheets/BottomSheet',
  component: BottomSheet,
  tags: ['autodocs', 'live'],
  parameters: {
    layout: 'fullscreen',
    source: 'src/organisms/BottomSheet.tsx:65',
    docs: { description: { component: 'The sheet shell: handle and title, a body picked by `template`, and an optional sticky footer. Snap points 58% and 96%. Scroll up to expand, pan down to close.' } },
  },
  argTypes: {
    template: { control: 'select', options: ['image-only', 'eligibility-checker', 'cashback-status', 'month-picker', 'text-only', 'image-heading-body', 'icon-heading-body', 'money-status', 'reward-rates', 'rate-list', 'terms-list', 'numbered-list', 'selector', 'filters'] },
    title: { control: 'text' },
    showStroke: { control: 'boolean' },
    footer: { control: 'boolean' },
  },
  args: { title: 'About cashback', showStroke: true, template: 'text-only', footer: false },
  render: (args) => <Open>{(ref) => <BottomSheet ref={ref} {...args} />}</Open>,
};
export default meta;
type Story = StoryObj<BottomSheetProps>;

const okFooter = { buttons: 'single', color: 'second', primaryLabel: 'Ok, Got It' } as const;

export const Playground: Story = {
  args: { bodyProps: { text: 'Cashback is credited after the store confirms your order. This usually takes 60 to 90 days.' } },
};
export const ImageOnly: Story = { args: { title: undefined, template: 'image-only', bodyProps: { image: images.storepage.amazon } } };
export const EligibilityChecker: Story = { args: { title: 'Check your eligibility', template: 'eligibility-checker', footer: true, footerProps: { buttons: 'single', color: 'second', primaryLabel: 'Check Eligibility' } },
  parameters: { docs: { description: { story: 'Static form body. The real checker is EligibilityCheckerSheet; this template is not wired to the API.' } } } };
export const CashbackStatus: Story = {
  args: { title: 'Cashback status', template: 'cashback-status', footer: true, footerProps: okFooter, bodyProps: { sections: [
    { title: 'Amazon', items: [{ value: '₹1,500', biline: 'Order CKORDER0001', status: 'confirmed' }, { value: '₹240', biline: 'Order CKORDER0002', status: 'pending' }] },
    { title: 'Flipkart', items: [{ value: '₹3,200', biline: 'Order CKORDER0003', status: 'paid' }] },
  ] } },
};
export const MonthPicker: Story = { args: { title: 'Select month', template: 'month-picker', bodyProps: { options: ['November 2026', 'October 2026', 'September 2026', 'August 2026'] } } };
export const TextOnly: Story = { args: { template: 'text-only', bodyProps: { text: 'Cashback stays pending until the return and cancellation window of the store ends.' } } };
export const ImageHeadingBody: Story = { args: { title: undefined, template: 'image-heading-body', footer: true, footerProps: okFooter, bodyProps: { image: images.help.appLogo, heading: 'Shop through Cards.xtra', body: 'Open the store from the app so we can track your order.', note: 'Orders usually show up within 24 hours.' } } };
export const IconHeadingBody: Story = { args: { title: undefined, template: 'icon-heading-body', bodyProps: { image: images.screenstate.tracking, heading: 'Your order is tracked', body: 'Cashback shows as pending once the store reports the order.' } } };
export const MoneyStatus: Story = { args: { title: 'Earning status', template: 'money-status', footer: true, footerProps: okFooter, bodyProps: { amount: '₹1,500', status: 'pending', description: 'Cashback stays pending until the return window ends' } } };
export const RewardRates: Story = { args: { title: 'Reward rates', template: 'reward-rates' } };
export const RateList: Story = { args: { title: 'Cashback rates', template: 'rate-list', bodyProps: { rewardRates: [{ rate: 'X%', description: 'on Fashion' }, { rate: 'X%', description: 'on Electronics' }, { rate: 'X%', description: 'on all other categories' }] } } };
export const TermsList: Story = { args: { title: 'Terms and conditions', template: 'terms-list', bodyProps: { text: 'Cashback is paid only when:', bullets: ['You open the store from Cards.xtra', 'You finish the order in the same session', 'The order is not returned or cancelled'] } } };
export const NumberedList: Story = { args: { title: 'See offer details', template: 'numbered-list', bodyProps: { text: 'How to get this offer:', bullets: ['Tap Shop Now', 'Add items worth ₹1,499 or more', 'Pay online and finish the order'] } } };
export const Selector: Story = { args: { title: 'Pick a category', template: 'selector', bodyProps: { options: ['Shopping', 'Travel', 'Dining', 'Fuel'] } } };
export const Filters: Story = { args: { title: 'Filters', template: 'filters' },
  parameters: { docs: { description: { story: 'Placeholder body. The code says the filter menu is not built into this template. Real filter sheets are FilterMenu and OrdersFilterMenu, hosted by the screens.' } } } };
export const WithStickyFooter: Story = { args: { title: 'Withdraw cashback', template: 'text-only', footer: true, footerProps: { buttons: 'dual', color: 'second', primaryLabel: 'Withdraw ₹1,500', secondaryLabel: 'Not now' }, bodyProps: { text: 'You can withdraw confirmed cashback to UPI or as a gift card. Minimum ₹250.' } } };
