import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ShareSheet } from "../../src/organisms/ShareSheet";

/**
 * ⚠️ ShareSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof ShareSheet> = {
  title: "Organisms/ShareSheet",
  component: ShareSheet,
  argTypes: {
    cardName: { control: "text" },
    cardSubtitle: { control: "text" },
    cashbackValue: { control: "text" },
  },
  args: {
    cardName: "HDFC Regalia Gold",
    cardSubtitle: "Great for dining",
    cashbackValue: "₹1200 Cashback",
  },
};
export default meta;
type Story = StoryObj<typeof ShareSheet>;

export const Playground: Story = {};
