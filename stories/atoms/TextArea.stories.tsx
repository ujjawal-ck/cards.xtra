import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TextArea } from "../../src/atoms/TextArea";

const meta: Meta<typeof TextArea> = {
  title: "Atoms/TextArea",
  component: TextArea,
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    size: { control: "select", options: ["md", "sm"] },
    state: { control: "select", options: ["unfilled", "selected", "filled", "error", "disabled"] },
    hint: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Label",
    placeholder: "Placeholder",
    size: "md",
    state: "unfilled",
    hint: "Helper text",
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<typeof TextArea>;

export const Playground: Story = {};
