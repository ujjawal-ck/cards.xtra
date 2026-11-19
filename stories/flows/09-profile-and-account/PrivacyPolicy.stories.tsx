import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PrivacyPolicyScreen } from '../../../src/screens/PrivacyPolicyScreen';
import { ScreenHarness } from '../../../storybook/harness';
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Privacy policy',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

/** Static policy sections and a last-updated line. Works signed out. */
export const Policy: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/PrivacyPolicyScreen.tsx:32' },
  render: () => <ScreenHarness name="PrivacyPolicy" component={PrivacyPolicyScreen} api={api.ok()} />,
};
