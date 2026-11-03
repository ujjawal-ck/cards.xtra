import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EligibleSheet } from "../../src/organisms/EligibleSheet";

/**
 * ⚠️ EligibleSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof EligibleSheet> = {
  title: "Organisms/EligibleSheet",
  component: EligibleSheet,
  argTypes: {
    rewardHeadline: { control: "text" },
    rewardSubtext: { control: "text" },
    ctaLabel: { control: "text" },
    message: { control: "text" },
    pincode: { control: "text" },
    amount: { control: "text" },
    occupation: { control: "text" },
    showConfetti: { control: "boolean" },
  },
  args: {
    rewardHeadline: "Rewardheadline",
    rewardSubtext: "Rewardsubtext",
    ctaLabel: "Apply Now",
    message: "This is a message",
    pincode: "110001",
    amount: "₹1,500",
    occupation: "Salaried",
    showConfetti: false,
  },
};
export default meta;
type Story = StoryObj<typeof EligibleSheet>;

export const Playground: Story = {};
