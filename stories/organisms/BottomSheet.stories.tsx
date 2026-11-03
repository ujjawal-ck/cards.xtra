import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BottomSheet } from "../../src/organisms/BottomSheet";

/**
 * ⚠️ BottomSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof BottomSheet> = {
  title: "Organisms/BottomSheet",
  component: BottomSheet,
  argTypes: {
    title: { control: "text" },
    showStroke: { control: "boolean" },
    bodyProps: { control: "select", options: ["template"] },
    footer: { control: "boolean" },
  },
  args: {
    title: "Title",
    showStroke: true,
    bodyProps: "template",
    footer: false,
  },
};
export default meta;
type Story = StoryObj<typeof BottomSheet>;

export const Playground: Story = {};
