import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EligibilityCheckerSheet } from "../../src/organisms/EligibilityCheckerSheet";

/**
 * ⚠️ EligibilityCheckerSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof EligibilityCheckerSheet> = {
  title: "Organisms/EligibilityCheckerSheet",
  component: EligibilityCheckerSheet,
  argTypes: {
    defaultPincode: { control: "text" },
    defaultIncome: { control: "text" },
    defaultIncomeType: { control: "select", options: ["salaried", "self-employed"] },
    threshold: { control: "number" },
  },
  args: {
    defaultPincode: "Defaultpincode",
    defaultIncome: "Defaultincome",
    defaultIncomeType: "salaried",
    threshold: 0,
  },
};
export default meta;
type Story = StoryObj<typeof EligibilityCheckerSheet>;

export const Playground: Story = {};
