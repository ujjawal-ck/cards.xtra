import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EligibilityMasthead } from "../../src/organisms/EligibilityMasthead";

const meta: Meta<typeof EligibilityMasthead> = {
  title: "Organisms/EligibilityMasthead",
  component: EligibilityMasthead,
  argTypes: {
    variant: { control: "select", options: ["eligible", "maybe"] },
    message: { control: "text" },
    pincode: { control: "text" },
    amount: { control: "text" },
    occupation: { control: "text" },
    infoText: { control: "text" },
    ctaLabel: { control: "text" },
  },
  args: {
    variant: "eligible",
    message: "This is a message",
    pincode: "110001",
    amount: "₹1,500",
    occupation: "Salaried",
    infoText: "Info",
    ctaLabel: "Apply Now",
  },
};
export default meta;
type Story = StoryObj<typeof EligibilityMasthead>;

export const Playground: Story = {};
