import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { BottomSheetBody, type BottomSheetBodyProps, type BottomSheetTemplate } from '../../../src/organisms/BottomSheetBody';
import { Text } from '../../../src/atoms';
import { images } from '../../../src/assets/images';
import { colors, spacing, radius, borderWidth } from '../../../src/tokens';

const meta: Meta<BottomSheetBodyProps> = {
  title: 'Components/Sheets/BottomSheetBody',
  component: BottomSheetBody,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/organisms/BottomSheetBody.tsx:125', docs: { description: { component: 'The body of a BottomSheet. One container, many templates. Each template composes existing atoms and molecules. Shown here without the modal.' } } },
  argTypes: {
    template: { control: 'select', options: ['image-only', 'eligibility-checker', 'cashback-status', 'month-picker', 'text-only', 'image-heading-body', 'icon-heading-body', 'money-status', 'reward-rates', 'rate-list', 'terms-list', 'numbered-list', 'selector', 'filters'] },
    heading: { control: 'text' }, body: { control: 'text' }, text: { control: 'text' }, amount: { control: 'text' },
    status: { control: 'select', options: ['requested', 'pending', 'delayed', 'cancelled', 'confirmed', 'paid'] },
  },
  args: { template: 'image-heading-body', image: images.help.appLogo, heading: 'Shop through Cards.xtra', body: 'Open the store from the app so we can track your order.', note: 'Orders usually show up within 24 hours.' },
  render: (args) => <View style={{ width: 390, backgroundColor: colors.surface.default }}><BottomSheetBody {...args} /></View>,
};
export default meta;
type Story = StoryObj<BottomSheetBodyProps>;

export const Playground: Story = {};

const samples: [BottomSheetTemplate, Partial<BottomSheetBodyProps>][] = [
  ['text-only', { text: 'Cashback stays pending until the return window of the store ends.' }],
  ['image-heading-body', { image: images.help.appLogo, heading: 'Shop through Cards.xtra', body: 'Open the store from the app so we can track your order.', note: 'Orders usually show up within 24 hours.' }],
  ['icon-heading-body', { image: images.screenstate.tracking, heading: 'Your order is tracked', body: 'Cashback shows as pending once the store reports the order.' }],
  ['money-status', { amount: '₹1,500', status: 'pending', description: 'Cashback stays pending until the return window ends' }],
  ['cashback-status', { sections: [{ title: 'Amazon', items: [{ value: '₹1,500', biline: 'Order CKORDER0001', status: 'confirmed' }] }] }],
  ['month-picker', { options: ['November 2026', 'October 2026', 'September 2026'] }],
  ['selector', { options: ['Shopping', 'Travel', 'Dining', 'Fuel'] }],
  ['reward-rates', {}],
  ['rate-list', { rewardRates: [{ rate: 'X%', description: 'on Fashion' }, { rate: 'X%', description: 'on Electronics' }] }],
  ['terms-list', { text: 'Cashback is paid only when:', bullets: ['You open the store from Cards.xtra', 'You finish the order in the same session'] }],
  ['numbered-list', { text: 'How to get this offer:', bullets: ['Tap Shop Now', 'Add items worth ₹1,499 or more'] }],
  ['eligibility-checker', {}],
  ['image-only', { image: images.storepage.amazon }],
  ['filters', {}],
];

export const AllTemplates: Story = {
  render: () => (
    <View style={{ width: 390, gap: spacing[24] }}>
      {samples.map(([template, props]) => (
        <View key={template} style={{ gap: spacing[8] }}>
          <Text variant="body12SemiBold" color={colors.text.secondary}>{template}</Text>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: radius.lg, borderWidth: borderWidth.thin, borderColor: colors.border.default, overflow: 'hidden' }}>
            <BottomSheetBody template={template} {...props} />
          </View>
        </View>
      ))}
    </View>
  ),
  parameters: { docs: { description: { story: 'The `filters` template is a placeholder in code ("not built yet"). Real filter sheets are FilterMenu and OrdersFilterMenu.' } } },
};
