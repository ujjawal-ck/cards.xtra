import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LoginSheet } from "../../src/organisms/LoginSheet";

/**
 * ⚠️ LoginSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof LoginSheet> = {
  title: "Organisms/LoginSheet",
  component: LoginSheet,
  argTypes: {
    defaultPhone: { control: "text" },
  },
  args: {
    defaultPhone: "Defaultphone",
  },
};
export default meta;
type Story = StoryObj<typeof LoginSheet>;

export const Playground: Story = {};
