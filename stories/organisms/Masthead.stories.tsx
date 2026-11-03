import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Masthead } from "../../src/organisms/Masthead";

const meta: Meta<typeof Masthead> = {
  title: "Organisms/Masthead",
  component: Masthead,
  argTypes: {
    variant: { control: "select", options: ["profile", "earnings", "payment", "cashback-status", "home", "offers"] },
    name: { control: "text" },
    contact: { control: "text" },
    avatarInitial: { control: "text" },
    totalEarnings: { control: "text" },
    subtitle: { control: "text" },
    cashbackValue: { control: "text" },
    rewardsValue: { control: "text" },
    amount: { control: "text" },
    statusLabel: { control: "text" },
    expectedText: { control: "text" },
    notificationCount: { control: "number" },
    placeholder: { control: "text" },
  },
  args: {
    variant: "profile",
    name: "Manikandan",
    contact: "ma****an@gmail.com",
    avatarInitial: "M",
    totalEarnings: "1,500",
    subtitle: "Subtitle",
    cashbackValue: "₹1200 Cashback",
    rewardsValue: "Rewardsvalue",
    amount: "₹1,500",
    statusLabel: "Statuslabel",
    expectedText: "Expectedtext",
    notificationCount: 9,
    placeholder: "Placeholder",
  },
};
export default meta;
type Story = StoryObj<typeof Masthead>;

export const Playground: Story = {};
