import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AdvisorScreen } from '../../../src/screens/advisor/AdvisorScreen';
import { getAdvisorSession } from '../../../src/screens/advisor/advisorSession';
import { encodeEligForm } from '../../../src/lib/advisor/answers';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { FooterButtons } from '../../../src/organisms/FooterButtons';
import { Text } from '../../../src/atoms/Text';
import { colors, spacing, radius, alpha } from '../../../src/tokens';
import { PhoneFrame, ScreenHarness } from '../../../storybook/harness';
import { api, reply } from '../../../storybook/fixtures';
import { TapScript } from '../04-shared-result/_shared';

const meta: Meta = {
  title: 'Flows/5 Card advisor/Chat',
  parameters: { layout: 'fullscreen', docs: { story: { inline: false } } },
};
export default meta;
type Story = StoryObj;

const SRC = 'src/screens/advisor/AdvisorScreen.tsx';
type Answers = Record<string, string>;

/** The chat is rebuilt from the answers in the session store, so a mid-chat state is seeded, not tapped. */
const chat = (answers: Answers, a = api.ok(), extra?: React.ReactNode) => (
  <>
    <ScreenHarness
      name="Advisor"
      component={AdvisorScreen}
      api={a}
      beforeMount={() => {
        getAdvisorSession().state = { answers, held: [] };
      }}
    />
    {extra}
  </>
);

/** Explore journey, "just browsing": the only path that reaches the eligibility bridge with no category question. */
const BROWSING: Answers = { opener: 'explore', matters: 'browse' };
const FORM_DONE = encodeEligForm({ job: 'salaried', incomeMonthly: 60000, pincode: '110001' });

export const Intro: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: 'First visit in the app session: the large intro mascot, the greeting, and the opener "What brings you here today?" with five options. Cards appear only after the first answer.' } } },
  render: () => chat({}),
};

export const Question: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: 'Opener answered with "I have a card and want a better one" (seeded). The advisor has acknowledged it, shown three popular cards, and asks the next question in the reply tray: a multi-select "Done" tray.' } } },
  render: () => chat({ opener: 'better' }),
};

export const Reveal: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: 'Opener answered with "It\'s my first credit card" (seeded): the reveal block with "Best match", "Also great" and a third card, built from the fixture catalogue. "Free" here means no joining fee and no annual fee.' } } },
  render: () => chat({ opener: 'first' }),
};

export const Tip: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: 'First card journey, history answered "Yes" (seeded): the advisor adds a quick tip after the answer ("Your first card builds your credit score…"). Tips show once each.' } } },
  render: () => chat({ opener: 'first', history: 'yes' }),
};

export const EligibilityBridge: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:90`, docs: { description: { story: 'Journey "just exploring", "I\'m just browsing" (seeded): the advisor offers to check which cards the user can get, with a soft-check tip that the check does not touch the credit report. Options: "Yes, check" and "Not now".' } } },
  render: () => chat(BROWSING),
};

export const EligibilityForm: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/advisor/AdvisorEligibilityForm.tsx:49', docs: { description: { story: 'Bridge answered "Yes, check" (seeded): one form for how the user earns, monthly income and pincode. Income and pincode never go to route params or analytics.' } } },
  render: () => chat({ ...BROWSING, eligBridge: 'yes' }),
};

export const LikelyToQualify: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:372`, docs: { description: { story: 'Form answered (salaried, ₹60,000 a month, pincode 110001; test values, seeded). The eligibility call answers with the "partial" fixture, so the reveal carries "Likely to qualify" on the cards the API accepted.' } } },
  render: () => chat({ ...BROWSING, eligBridge: 'yes', eligForm: FORM_DONE }),
};

export const EligibilityError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:380`, docs: { description: { story: 'The eligibility call answers 500: the header says "Couldn\'t check right now" and an inline warning offers "Try again". It shows after the call\'s retries (a few seconds).' } } },
  render: () => chat({ ...BROWSING, eligBridge: 'yes', eligForm: FORM_DONE }, api.ok({ eligibility: reply.error(500) })),
};

export const Relaxed: Story = {
  tags: ['live'],
  parameters: { source: 'src/lib/advisor/engine.ts:474', docs: { description: { story: 'First card, has history, needs Fuel (seeded). The first-card journey sets "free", and the fixture catalogue has no free fuel card, so the advisor relaxes a filter and says what it set aside. If no note shows, the fixture catalogue now has a free fuel card: change the answers.' } } },
  render: () => chat({ opener: 'first', history: 'yes', need: 'fuel' }),
};

export const EndMenu: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:325`, docs: { description: { story: 'Every question answered (just exploring, just browsing, "Not now" on the check; seeded): no question is left, so the tray becomes a menu: "See all N cards", "Check which cards I can get", "Change an answer", "Start over".' } } },
  render: () => chat({ ...BROWSING, eligBridge: 'no' }),
};

export const ChangeAnswer: Story = {
  tags: ['live'],
  parameters: { source: 'src/screens/advisor/AdvisorChangeAnswerSheet.tsx', docs: { description: { story: 'The end menu with "Change an answer" tapped after mount: the sheet lists each answer to go back to.' } } },
  render: () => chat({ ...BROWSING, eligBridge: 'no' }, api.ok(), <TapScript steps={[{ click: 'Change an answer' }]} startMs={1500} />),
};

export const StartOverConfirm: Story = {
  tags: ['proposed'],
  parameters: {
    source: 'ux-states.md section 5 (AdvisorScreen, start over confirmation)',
    docs: {
      description: {
        story:
          'Proposed. Today "Start over" opens a native Alert (`AdvisorScreen.tsx:269`), which does not match the app style. This draws the same choice as a bottom sheet in the style of LogoutConfirmSheet. Open question: is a native Alert acceptable for a destructive confirm, or do all confirms use the sheet? The chat behind the sheet is not drawn.',
      },
    },
  },
  render: () => (
    <PhoneFrame>
      <View style={{ flex: 1, backgroundColor: alpha.black[50], justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], overflow: 'hidden' }}>
          <BottomSheetHeader showStroke={false} />
          <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[8], paddingBottom: spacing[8], gap: spacing[8], alignItems: 'center' }}>
            <Text variant="heading20SemiBold" color={colors.text.primary} align="center">Start over?</Text>
            <Text variant="body16Regular" color={colors.text.secondary} align="center">This clears all your answers.</Text>
          </View>
          <FooterButtons buttons="dual" size={52} primaryLabel="Start over" secondaryLabel="Keep going" onPrimary={() => undefined} onSecondary={() => undefined} />
        </View>
      </View>
    </PhoneFrame>
  ),
};

export const CatalogueError: Story = {
  tags: ['live'],
  parameters: { source: `${SRC}:435`, docs: { description: { story: 'The card list answers 500: "Couldn\'t load cards" with "Try again". Shows after the call\'s retries (a few seconds).' } } },
  render: () => chat({}, api.ok({ cards: reply.error(500) })),
};
