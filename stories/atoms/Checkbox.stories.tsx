import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../../src/atoms/Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Atoms/Checkbox",
  component: Checkbox,
  argTypes: {
    checked: { control: "select", options: ["indeterminate"] },
    size: { control: "select", options: ["md", "sm"] },
    disabled: { control: "boolean" },
  },
  args: {
    checked: "indeterminate",
    size: "md",
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Playground: Story = {};
