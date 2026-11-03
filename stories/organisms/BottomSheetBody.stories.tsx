import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BottomSheetBody } from "../../src/organisms/BottomSheetBody";

/**
 * ⚠️ BottomSheetBody is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof BottomSheetBody> = {
  title: "Organisms/BottomSheetBody",
  component: BottomSheetBody,
  argTypes: {
    template: { control: "select", options: ["image-only", "eligibility-checker", "cashback-status", "month-picker", "text-only", "image-heading-body", "money-status", "reward-rates", "selector", "filters"] },
    heading: { control: "text" },
    body: { control: "text" },
    note: { control: "text" },
    text: { control: "text" },
    amount: { control: "text" },
    description: { control: "text" },
    title: { control: "text" },
    value: { control: "text" },
    biline: { control: "text" },
  },
  args: {
    template: "image-only",
    heading: "Heading",
    body: "Body content",
    note: "Note",
    text: "Text",
    amount: "₹1,500",
    description: "Description text",
    title: "Title",
    value: "Value",
    biline: "Biline",
  },
};
export default meta;
type Story = StoryObj<typeof BottomSheetBody>;

export const Playground: Story = {};
