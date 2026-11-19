import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { EligibilityMasthead } from '../../../src/organisms/EligibilityMasthead';
import { images } from '../../../src/assets/images';
import { colors, spacing, typography } from '../../../src/tokens';

const meta = {
  title: 'Components/Mastheads/EligibilityMasthead',
  component: EligibilityMasthead,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/organisms/EligibilityMasthead.tsx',
    layout: 'fullscreen',
    docs: { description: { component: 'Hero of the eligibility result sheets. Three variants by verdict: eligible (green banner with info pill and card), maybe (reason window and CTA), ineligible (bulleted reasons and CTA).' } },
  },
  argTypes: {
    variant: { control: 'select', options: ['eligible', 'maybe', 'ineligible'] },
    message: { control: 'text' }, pincode: { control: 'text' }, amount: { control: 'text' }, occupation: { control: 'text' },
    infoText: { control: 'text' }, reasons: { control: 'object' }, ctaLabel: { control: 'text' },
  },
  args: {
    variant: 'eligible', message: "Congrats!\nYou're eligible", pincode: '560001', amount: '₹1,00,000', occupation: 'Salaried',
    cardImage: images.cards.axisMagnus,
  },
} satisfies Meta<typeof EligibilityMasthead>;
export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <View style={{ width: 390, alignSelf: 'center', marginBottom: spacing[16], backgroundColor: colors.surface.sunken }}>
    {label ? <Text style={{ ...typography.caption10Medium, color: colors.text.secondary, padding: spacing[8] }}>{label}</Text> : null}
    {children}
  </View>
);

export const Playground: Story = { render: (args) => <Frame><EligibilityMasthead {...args} /></Frame> };

export const Variants: Story = {
  render: () => (
    <View>
      <Frame label="eligible"><EligibilityMasthead variant="eligible" message={"Congrats!\nYou're eligible"} pincode="560001" amount="₹1,00,000" occupation="Salaried" cardImage={images.cards.axisMagnus} /></Frame>
      <Frame label="maybe"><EligibilityMasthead variant="maybe" message={"You may be eligible"} infoText={"The bank decides after a credit check.\nApply to find out."} ctaLabel="Continue to Apply" /></Frame>
      <Frame label="ineligible"><EligibilityMasthead variant="ineligible" message={"Not eligible right now"} reasons={['Your pin code is not serviceable', 'Income is below the minimum for this card']} ctaLabel="Continue to Apply" /></Frame>
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'Eligible with several cards shows a fanned stack (Home flow "eligible for N cards"). Product decisions about reason wording sit in docs/decision.md D22, not here. Open question for product: should ineligible show an alternative card? Not decided here.' } } },
  render: () => (
    <View>
      <Frame label="eligible, stack of 3 cards"><EligibilityMasthead variant="eligible" message={"Congrats!\nYou're eligible for 3 cards"} pincode="400001" amount="₹25,00,000" occupation="Self employed" cardImages={[images.cards.axisMagnus, images.cards.hdfcRegaliaGold, images.cards.sbiCashback]} /></Frame>
      <Frame label="eligible, long occupation and large amount"><EligibilityMasthead variant="eligible" message={"Congrats!\nYou're eligible"} pincode="110001" amount="₹1,00,00,000" occupation="Self employed professional" cardImage={images.cards.hdfcSwiggy} /></Frame>
      <Frame label="ineligible, one reason, custom CTA"><EligibilityMasthead variant="ineligible" message="Not eligible right now" reasons={['Your pin code is not serviceable']} ctaLabel="See other cards" /></Frame>
      <Frame label="maybe, custom CTA"><EligibilityMasthead variant="maybe" message="You may be eligible" infoText="We could not confirm your details." ctaLabel="Try again" /></Frame>
    </View>
  ),
};
