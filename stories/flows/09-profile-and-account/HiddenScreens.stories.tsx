import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProfilePaymentHistory } from '../../../src/screens/ProfilePaymentHistory';
import { ProfilePaymentHistoryDetails } from '../../../src/screens/ProfilePaymentHistoryDetails';
import { ProfilePaymentHistoryEmpty } from '../../../src/screens/ProfilePaymentHistoryEmpty';
import { WriteReviewScreen } from '../../../src/screens/WriteReviewScreen';
import { ScreenHarness, PhoneFrame } from '../../../storybook/harness';
import { View } from 'react-native';
import { Text } from '../../../src/atoms/Text';
import { spacing } from '../../../src/tokens';

/** ReviewUs is not rendered: its sample reviews hold a real-looking person name. Remove it in src, then render the screen here. */
const ReviewUsWithheld = () => (
  <PhoneFrame>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[24], gap: spacing[8] }}>
      <Text variant="heading18Medium">Review Us: not rendered</Text>
      <Text variant="body14Regular">The screen's sample reviews contain a real-looking person name (src/screens/ReviewUsScreen.tsx:50, 56, 62). Replace it with a placeholder before this screen is shown or released.</Text>
    </View>
  </PhoneFrame>
);
import { api } from '../../../storybook/fixtures';

const meta: Meta = {
  title: 'Flows/9 Profile and account/Hidden screens',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const D4 = 'HIDDEN (D4): the Profile row is hidden and nothing links here. The screen renders sample payouts; `/payment/history` exists but is not mapped. Shown for reference only. Open question: map the API (this is the per-payout record that R4 says is missing) or drop the screens.';
const D14 = 'HIDDEN (D14): no fake data in anything a user can reach. The reviews are sample data and the "submitted" toast shows although the text is discarded (no endpoint). Shown for reference only.';
const NAME = ' The source (`ReviewUsScreen.tsx`) contains a real-looking reviewer name in its sample reviews. Remove it before release.';

/** HIDDEN: payment history list (sample payouts). */
export const PaymentHistory: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistory.tsx:94', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistory" component={ProfilePaymentHistory} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: payment history, one payout's details. */
export const PaymentHistoryDetails: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistoryDetails.tsx:100', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistoryDetails" component={ProfilePaymentHistoryDetails} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: payment history, no payouts yet. */
export const PaymentHistoryEmpty: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ProfilePaymentHistoryEmpty.tsx:76', docs: { description: { story: D4 } } },
  render: () => <ScreenHarness name="ProfilePaymentHistoryEmpty" component={ProfilePaymentHistoryEmpty} auth="signedIn" api={api.ok()} />,
};

/** HIDDEN: Review Us with sample reviews. */
export const ReviewUs: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ReviewUsScreen.tsx:152', docs: { description: { story: D14 + NAME } } },
  render: () => <ReviewUsWithheld />,
};

/** HIDDEN: Review Us after a submit: the "submitted successfully" toast (shows 3 s). */
export const ReviewUsSubmittedToast: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/ReviewUsScreen.tsx:306', docs: { description: { story: D14 + NAME + ' Params `{ submitted: true }`. The toast disappears after 3 s; reload the story to see it again.' } } },
  render: () => <ReviewUsWithheld />,
};

/** HIDDEN: Write Review form (rating required, comment). */
export const WriteReview: Story = {
  tags: ['hidden'],
  parameters: { source: 'src/screens/WriteReviewScreen.tsx:59', docs: { description: { story: D14 } } },
  render: () => <ScreenHarness name="WriteReview" component={WriteReviewScreen} auth="signedIn" api={api.ok()} />,
};
