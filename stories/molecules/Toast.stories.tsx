import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "../../src/molecules/Toast";

const meta: Meta<typeof Toast> = {
  title: "Molecules/Toast",
  component: Toast,
  argTypes: {
    message: { control: "text" },
    action: { control: "select", options: ["none", "single"] },
    actionLabel: { control: "text" },
  },
  args: {
    message: "This is a message",
    action: "none",
    actionLabel: "Undo",
  },
};
export default meta;
type Story = StoryObj<typeof Toast>;

export const Playground: Story = {};
