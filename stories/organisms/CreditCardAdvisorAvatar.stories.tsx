import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { CreditCardAdvisorAvatar } from "../../src/organisms/CreditCardAdvisorAvatar";
import { ADVISOR_AVATAR_STATES } from "../../src/lib/advisorAvatar/types";
import { colors, spacing } from "../../src/tokens";

const meta: Meta<typeof CreditCardAdvisorAvatar> = {
  title: "Organisms/CreditCardAdvisorAvatar",
  component: CreditCardAdvisorAvatar,
  argTypes: {
    state: { control: "select", options: ADVISOR_AVATAR_STATES },
    size: { control: "number" },
    audioLevel: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
  args: {
    state: "idle",
    size: 160,
  },
};
export default meta;
type Story = StoryObj<typeof CreditCardAdvisorAvatar>;

export const Playground: Story = {};

const caption = { color: colors.text.secondary, marginTop: spacing[4] } as const;

export const AllStates: Story = {
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[16] }}>
      {ADVISOR_AVATAR_STATES.map((s) => (
        <View key={s} style={{ alignItems: "center" }}>
          <CreditCardAdvisorAvatar state={s} size={96} />
          <Text style={caption}>{s}</Text>
        </View>
      ))}
    </View>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[16], alignItems: "flex-end" }}>
      {[48, 96, 160, 300].map((size) => (
        <View key={size} style={{ alignItems: "center" }}>
          <CreditCardAdvisorAvatar state={args.state} audioLevel={args.audioLevel} size={size} />
          <Text style={caption}>{size}</Text>
        </View>
      ))}
    </View>
  ),
};
