import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';
import { LogoutConfirmSheet, type LogoutConfirmSheetRef } from '../../../src/organisms/LogoutConfirmSheet';
import { ScreenHarness, SheetHarness } from '../../../storybook/harness';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { colors, spacing, radius, elevation } from '../../../src/tokens';
import { api, reply, authFixture } from '../../../storybook/fixtures';
import { tap } from './_dom';
import { ProposedPage } from './_proposed';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Logout',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/** The confirm sheet on its own: "Yes" signs out, "No" closes. */
export const ConfirmSheet: Story = {
  tags: ['live'],
  parameters: { source: 'src/organisms/LogoutConfirmSheet.tsx:121' },
  render: () => (
    <SheetHarness<LogoutConfirmSheetRef>>
      {(ref) => <LogoutConfirmSheet ref={ref} onConfirm={() => console.log('[storybook] logout confirmed')} />}
    </SheetHarness>
  ),
};

/** From the Profile tab: a play function taps "Logout" and the sheet rises over the screen. */
export const FromProfile: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/screens/ProfileScreen.tsx:279',
    docs: { description: { story: 'Reached by a tap. "Yes" signs out and resets to Home as a guest; the harness shows a stub page for that route.' } },
  },
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} auth="signedIn" displayName="Test User" api={api.ok()} />,
  play: async () => { await tap('Logout'); },
};

/** The server logout takes 8 s: the sheet is gone and the screen stays signed in. */
export const SlowLogout: Story = {
  tags: ['live'],
  parameters: {
    source: 'src/auth/AuthContext.tsx:274',
    docs: { description: { story: 'Reached by taps: Logout, then Yes. The sheet dismisses first (`LogoutConfirmSheet.tsx:68`), then `signOut` awaits the server call (8 s here, up to 15 s in the app) before it clears local state. For that time the Profile screen looks unchanged and nothing says that logout is running. The harness shows the stub page for Home only after the call ends.' } },
  },
  render: () => <ScreenHarness name="Profile" component={ProfileScreen} auth="signedIn" displayName="Test User" api={api.ok({ logout: reply.delay(8000, authFixture.logout) })} />,
  play: async () => { await tap('Logout'); await tap('Yes', { nth: 'last' }); },
};

/** PROPOSED: the sheet stays open while the server call runs. */
export const LoggingOutProposed: Story = {
  tags: ['proposed'],
  parameters: {
    docs: { description: { story: 'Open question Q9: wait with a loading state (this design), or clear local state first and call the server in the background? The second is a code change and has no visible state. The sheet has no copy change; "Yes" shows its spinner and blocks taps.' } },
  },
  render: () => (
    <ProposedPage title="Profile" background={colors.background.muted}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={[{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingTop: spacing[24] }, elevation.light.up]}>
          <View style={{ paddingHorizontal: spacing[16], gap: spacing[8], alignItems: 'center' }}>
            <Text variant="heading20SemiBold" color={colors.text.primary} align="center">Log out?</Text>
            <Text variant="body16Regular" color={colors.text.secondary} align="center">Do you really want to log out of your account?</Text>
          </View>
          <FooterButtons buttons="dual-outline" primaryLabel="Yes" secondaryLabel="No" primaryLoading onPrimary={() => {}} onSecondary={() => {}} />
        </View>
      </View>
    </ProposedPage>
  ),
};
