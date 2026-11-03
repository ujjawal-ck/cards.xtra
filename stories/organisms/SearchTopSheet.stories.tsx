import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SearchTopSheet } from "../../src/organisms/SearchTopSheet";

/**
 * ⚠️ SearchTopSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof SearchTopSheet> = {
  title: "Organisms/SearchTopSheet",
  component: SearchTopSheet,
  argTypes: {
    visible: { control: "boolean" },
    variant: { control: "select", options: ["suggestions", "history"] },
    value: { control: "text" },
    placeholder: { control: "text" },
    row: { control: "select", options: ["rows"] },
    rowIndex: { control: "number" },
  },
  args: {
    visible: true,
    variant: "suggestions",
    value: "Value",
    placeholder: "Placeholder",
    row: "rows",
    rowIndex: 0,
  },
};
export default meta;
type Story = StoryObj<typeof SearchTopSheet>;

export const Playground: Story = {};
