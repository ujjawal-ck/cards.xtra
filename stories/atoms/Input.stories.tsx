import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../../src/atoms/Input";

const meta: Meta<typeof Input> = {
  title: "Atoms/Input",
  component: Input,
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    size: { control: "select", options: ["md", "sm"] },
    state: { control: "select", options: ["unfilled", "selected", "filled", "error", "disabled"] },
    hint: { control: "text" },
    disabled: { control: "boolean" },
    useBottomSheetInput: { control: "boolean" },
  },
  args: {
    label: "Label",
    placeholder: "Placeholder",
    size: "md",
    state: "unfilled",
    hint: "Helper text",
    disabled: false,
    useBottomSheetInput: false,
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Playground: Story = {};
