import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Toast } from '../../../src/molecules/Toast';
import { Button, Text } from '../../../src/atoms';
import { spacing } from '../../../src/tokens';

const TONES = ['brand', 'gray', 'success', 'warning', 'error', 'info', 'sky', 'rose', 'purple'] as const;

const meta = {
  title: 'Components/Messages and tooltips/Toast',
  component: Toast,
  tags: ['autodocs', 'live'],
  parameters: {
    source: 'src/molecules/Toast.tsx',
    docs: { description: { component: 'A compact transient feedback row. The screen shows it with local state and hides it with a timer (about 3 s in the app).' } },
  },
  argTypes: {
    tone: { control: 'select', options: TONES },
    icon: { control: 'select', options: [undefined, 'check-circle-outline', 'message-outline', 'clock-outline', 'desc-exclamation'] },
    action: { control: 'select', options: ['none', 'single'] },
    message: { control: 'text' },
    actionLabel: { control: 'text' },
    onActionPress: { control: false },
    onDismiss: { control: false },
  },
  args: { tone: 'success', icon: 'check-circle-outline', message: 'Excel downloaded to your phone', action: 'none', actionLabel: 'Undo' },
  decorators: [(Story) => <View style={{ width: 360 }}><Story /></View>],
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: string }) => (
  <Text variant="body12Medium" style={{ marginBottom: spacing[4], marginTop: spacing[12] }}>{children}</Text>
);

/** Trigger: press the button, the toast shows for 3 s, then hides, like the screens do. */
function Triggered() {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const fire = () => {
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 3000);
  };
  return (
    <View style={{ width: 360, gap: spacing[12] }}>
      <Button label="Download PDF" variant="solid" tone="main" size={44} onPress={fire} />
      <View style={{ height: 48 }}>
        {show ? <Toast tone="success" icon="check-circle-outline" message="PDF downloaded for request CKORDER0001" /> : null}
      </View>
    </View>
  );
}

export const Playground: Story = {};

export const Triggered3s: Story = {
  name: 'Triggered (3 s)',
  parameters: { docs: { description: { story: 'Press the button. The toast shows for 3 s and then hides. This is the app behaviour on the payment history details screen.' } } },
  render: () => <Triggered />,
};

export const Variants: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <Label>action: none</Label>
      <Toast tone="info" icon="message-outline" message="Link copied" />
      <Label>action: single</Label>
      <Toast tone="info" icon="message-outline" message="Card removed from compare" action="single" actionLabel="Undo" />
      <Label>with dismiss</Label>
      <Toast tone="info" icon="message-outline" message="Link copied" onDismiss={() => {}} />
      <Label>action and dismiss</Label>
      <Toast tone="info" icon="message-outline" message="Card removed from compare" action="single" actionLabel="Undo" onDismiss={() => {}} />
      <Label>without icon</Label>
      <Toast tone="info" message="Link copied" />
    </View>
  ),
};

export const States: Story = {
  parameters: { docs: { description: { story: 'All nine tones, long text (wraps, no line limit) and a large rupee amount.' } } },
  render: () => (
    <View style={{ width: 360, gap: spacing[8] }}>
      {TONES.map((t) => <Toast key={t} tone={t} icon="message-outline" message={`Tone ${t}`} action="single" actionLabel="Undo" onDismiss={() => {}} />)}
      <Toast tone="success" icon="check-circle-outline" message="₹1,00,000 withdrawal requested to the bank account ending 4321. You will get a confirmation on the app and by SMS once the payout is done." action="single" actionLabel="Track" onDismiss={() => {}} />
    </View>
  ),
};
