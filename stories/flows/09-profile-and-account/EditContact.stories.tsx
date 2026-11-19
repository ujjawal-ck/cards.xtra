import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { EditContactVerifyIdentityScreen } from '../../../src/screens/EditContactVerifyIdentityScreen';
import { EditContactEnterNewScreen } from '../../../src/screens/EditContactEnterNewScreen';
import { EditContactVerifyNewScreen } from '../../../src/screens/EditContactVerifyNewScreen';
import { Input } from '../../../src/atoms/Input';
import { Text } from '../../../src/atoms/Text';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors, spacing } from '../../../src/tokens';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';
import { typeInto } from './_dom';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Edit contact',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const DEMO = 'R5. DEMO: no API behind the three steps. Any 6-digit code passes, the new value is never saved, and the last step returns to Account settings with a "success" message. The contact is the login and payout identity, so a false success is costly. Open question: hide the flow until the CashKaro profile APIs exist (pm-flows question 7).';
const step1 = (field: 'email' | 'mobile') => <ScreenHarness name="EditContactVerifyIdentity" component={EditContactVerifyIdentityScreen} auth="signedIn" params={{ field }} api={api.ok()} />;
const step2 = (field: 'email' | 'mobile') => <ScreenHarness name="EditContactEnterNew" component={EditContactEnterNewScreen} auth="signedIn" params={{ field }} api={api.ok()} />;
const step3 = (field: 'email' | 'mobile', newValue: string) => <ScreenHarness name="EditContactVerifyNew" component={EditContactVerifyNewScreen} auth="signedIn" params={{ field, newValue }} api={api.ok()} />;

/** Step 1, email: an OTP is "sent" to the current email and mobile. Resend timer runs. */
export const VerifyIdentityEmail: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactVerifyIdentityScreen.tsx:43', docs: { description: { story: DEMO } } }, render: () => step1('email') };

/** Step 1, mobile. */
export const VerifyIdentityMobile: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactVerifyIdentityScreen.tsx:43', docs: { description: { story: DEMO } } }, render: () => step1('mobile') };

/** Step 2, email: enter the new email. "Send OTP" is disabled until the value is valid. */
export const EnterNewEmail: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactEnterNewScreen.tsx:34', docs: { description: { story: DEMO } } }, render: () => step2('email') };

/** Step 2, mobile. */
export const EnterNewMobile: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactEnterNewScreen.tsx:34', docs: { description: { story: DEMO } } }, render: () => step2('mobile') };

/** Step 2, an invalid email typed: the CTA stays disabled and no message explains why. A play function types "not-an-email". */
export const EnterNewInvalid: Story = {
  tags: ['demo'],
  parameters: { source: 'src/screens/EditContactEnterNewScreen.tsx:86', docs: { description: { story: DEMO + ' Reached by typing. Today only the CTA state tells the user; ux-states.md proposes an inline hint.' } } },
  render: () => step2('email'),
  play: async () => { await typeInto('Enter New Email', 'not-an-email'); },
};

/** Step 3, email: an OTP is "sent" to the new email, with an "Edit email" link. */
export const VerifyNewEmail: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactVerifyNewScreen.tsx:45', docs: { description: { story: DEMO } } }, render: () => step3('email', 'new.user@example.com') };

/** Step 3, mobile. */
export const VerifyNewMobile: Story = { tags: ['demo'], parameters: { source: 'src/screens/EditContactVerifyNewScreen.tsx:45', docs: { description: { story: DEMO } } }, render: () => step3('mobile', '9800000010') };

/** PROPOSED: the new email is already linked to another account. No server check exists today. */
export const EnterNewAlreadyRegistered: Story = {
  tags: ['proposed'],
  parameters: { docs: { description: { story: 'Copy from ux-states.md: hint "This email ID is already linked to another account." (the mobile version says "mobile number"). Needs a server check that does not exist. Open question: reveal that an email is registered (account enumeration) or answer with a neutral message.' } } },
  render: () => (
    <ProposedPage
      title="Account Settings"
      footer={<View style={{ padding: spacing[16] }}><FooterButtons buttons="single" primaryLabel="Send OTP" primaryDisabled onPrimary={() => {}} /></View>}
    >
      <View style={{ padding: spacing[16], gap: spacing[16] }}>
        <Text variant="body16SemiBold" color={colors.text.primary}>Enter Your New Email</Text>
        <Text variant="body14Regular" color={colors.text.secondary}>We will send you OTP to verify</Text>
        <Input label="Enter New Email" size="md" value="user@example.com" onChangeText={() => {}} state="error" hint="This email ID is already linked to another account." />
      </View>
    </ProposedPage>
  ),
};
