import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { Accordion } from '../../../src/molecules/Accordion';
import { colors, spacing, typography } from '../../../src/tokens';

const FRAME = 390;
const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: FRAME, padding: spacing[16], gap: spacing[12] }}>{children}</View>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ ...typography.caption10Medium, color: colors.text.tertiary }}>{children}</Text>
);

const BODY = 'Cashback is tracked within 72 hours of your purchase and confirmed once the store settles the order. Rewards on a card come after the bank approves it.';

/** Local state so a tap opens and closes the row. */
function Live(props: React.ComponentProps<typeof Accordion>) {
  const [open, setOpen] = useState(props.expanded);
  useEffect(() => setOpen(props.expanded), [props.expanded]);
  return <Accordion {...props} expanded={open} onToggle={setOpen} />;
}

const meta = {
  title: 'Components/Accordions/Accordion',
  component: Accordion,
  tags: ['autodocs', 'live'],
  decorators: [(Story) => <Frame><Story /></Frame>],
  parameters: {
    source: 'src/molecules/Accordion.tsx',
    docs: { description: { component: 'One expandable row: a title that opens a body, in three looks (default, highlight, bare).' } },
  },
  argTypes: {
    title: { control: 'text' },
    body: { control: 'text' },
    expanded: { control: 'boolean' },
    state: { control: 'select', options: ['default', 'highlight', 'bare'] },
    leadingIcon: { control: 'select', options: [undefined, 'help-ticket-outline', 'help-cash-outline', 'help-rupee-outline', 'feat-lounge-outline', 'feat-rewards-outline'] },
    trailingIcon: { control: 'boolean' },
    onToggle: { control: false },
    style: { control: false },
  },
  args: {
    title: 'When do I get my cashback?',
    body: BODY,
    expanded: true,
    state: 'default',
    trailingIcon: true,
  },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <Live {...args} /> };

export const Variants: Story = {
  render: () => (
    <>
      {(['default', 'highlight', 'bare'] as const).map((s) => (
        <View key={s} style={{ gap: spacing[4] }}>
          <Label>{`state="${s}"`}</Label>
          <Live title="When do I get my cashback?" body={BODY} expanded state={s} />
        </View>
      ))}
      <View style={{ gap: spacing[4] }}>
        <Label>leadingIcon</Label>
        <Live title="Missing cashback?" body={BODY} expanded leadingIcon="help-cash-outline" />
      </View>
      <View style={{ gap: spacing[4] }}>
        <Label>trailingIcon=false</Label>
        <Live title="Always open section" body={BODY} expanded trailingIcon={false} />
      </View>
    </>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Collapsed shows the title only. Expanded shows the body under it. No body: expanding changes the chevron only. A long title wraps to more lines, it is not cut. Tap any row to toggle it.',
      },
    },
  },
  render: () => (
    <>
      <Label>collapsed</Label>
      <Live title="How do I withdraw ₹10,00,000?" body={BODY} expanded={false} />
      <Label>expanded</Label>
      <Live title="How do I withdraw ₹10,00,000?" body={BODY} expanded />
      <Label>no body</Label>
      <Live title="Title with no body" expanded />
      <Label>long title</Label>
      <Live
        title="I shopped on Amazon through the app but my cashback of ₹0 is not showing in the Pending tab after four days, what should I do?"
        body={BODY}
        expanded
      />
      <Label>1 item in a list, then many</Label>
      <Live title="Only one question" body="One answer." expanded={false} />
      {['Cashback status', 'Withdrawal limits', 'Card eligibility', 'Referral rewards', 'Account deletion'].map((t) => (
        <Live key={t} title={t} body={BODY} expanded={false} state="bare" />
      ))}
    </>
  ),
};
