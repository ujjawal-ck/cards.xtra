import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MaybeSheet } from "../../src/organisms/MaybeSheet";

/**
 * ⚠️ MaybeSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof MaybeSheet> = {
  title: "Organisms/MaybeSheet",
  component: MaybeSheet,
  argTypes: {
    exploreLead: { control: "text" },
    exploreTail: { control: "text" },
    message: { control: "text" },
    infoText: { control: "text" },
    pincode: { control: "text" },
    amount: { control: "text" },
    occupation: { control: "text" },
    ctaLabel: { control: "text" },
  },
  args: {
    exploreLead: "Explorelead",
    exploreTail: "Exploretail",
    message: "This is a message",
    infoText: "Info",
    pincode: "110001",
    amount: "₹1,500",
    occupation: "Salaried",
    ctaLabel: "Apply Now",
  },
};
export default meta;
type Story = StoryObj<typeof MaybeSheet>;

export const Playground: Story = {};
