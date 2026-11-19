import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ScreenState } from '../../src/organisms/ScreenState';
import { FooterButtons } from '../../src/organisms/FooterButtons';
import { InlineMessage } from '../../src/molecules/InlineMessage';
import { Button } from '../../src/atoms/Button';
import { images } from '../../src/assets/images';
import { spacing } from '../../src/tokens';
import { Board, Phone, Labelled, noop } from './_shared';

const meta: Meta = {
  title: 'Patterns/Click-out',
  parameters: { layout: 'padded', docs: { description: { component: 'Apply Now and Shop & Earn are the revenue paths (D13). Every tap goes through one attributed path.' } } },
};
export default meta;
type Story = StoryObj;

export const Cta: Story = {
  tags: ['live'],
  parameters: { source: 'src/atoms/Button.tsx', docs: { description: { story: 'The CTA is a solid Saffron button (D17). Signed in: the app resolves the user id, then opens the link.' } } },
  render: () => <Board><Phone><Button label="Apply Now" variant="solid" tone="main" size={52} fullWidth onPress={noop} /></Phone></Board>,
};

export const ResolvingProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (Apply click-out, resolving the user id)', docs: { description: { story: 'Proposed: the tap awaits a profile refetch with no feedback (`src/lib/useClickOut.tsx:96`), so the CTA looks dead. Show the loading state on the button until the link opens. No copy.' } } },
  render: () => <Board><Phone padded={false}><FooterButtons buttons="single" primaryLabel="Apply Now" primaryLoading onPrimary={noop} /></Phone></Board>,
};

export const RedirectProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (Apply click-out, redirect to bank or store)', docs: { description: { story: 'Proposed: a hand-off step of 1 to 2 seconds before the bank or store opens (R8). DS gap: a redirect interstitial organism. The cat animation `cat-redirecting.riv` lives only in FilterTransitionOverlay. Open questions: show terms to accept before the hand-off? how long does it stay? what does the user see on return (R1)?' } } },
  render: () => (
    <Board><Phone padded={false}>
      <ScreenState image={images.screenstate.tracking} title="Taking you to HDFC Bank" body="Your cashback is being tracked. Finish there to earn it." />
    </Phone></Board>
  ),
};

export const NoLinkProposed: Story = {
  tags: ['proposed'],
  parameters: { source: 'ux-states.md section 3 (Apply click-out, no URL)', docs: { description: { story: 'Proposed: a card or store with no URL returns silently today (`src/lib/useClickOut.tsx:87`), a dead CTA. Disable the button and say why. Open question: where do the "similar cards below" come from?' } } },
  render: () => (
    <Board><Phone padded={false}>
      <View style={{ padding: spacing[16] }}><InlineMessage tone="info" message="Applications for this card are paused. See similar cards below." /></View>
      <FooterButtons buttons="single" primaryLabel="Apply Now" primaryDisabled onPrimary={noop} />
    </Phone></Board>
  ),
};
