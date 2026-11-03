import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BottomSheetHeader } from "../../src/organisms/BottomSheetHeader";

const meta: Meta<typeof BottomSheetHeader> = {
  title: "Organisms/BottomSheetHeader",
  component: BottomSheetHeader,
  argTypes: {
    title: { control: "text" },
    showStroke: { control: "boolean" },
  },
  args: {
    title: "Title",
    showStroke: true,
  },
};
export default meta;
type Story = StoryObj<typeof BottomSheetHeader>;

export const Playground: Story = {};
