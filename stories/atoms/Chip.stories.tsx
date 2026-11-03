import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "../../src/atoms/Chip";

const meta: Meta<typeof Chip> = {
  title: "Atoms/Chip",
  component: Chip,
  argTypes: {
    label: { control: "text" },
    type: { control: "select", options: ["default", "tab", "toggle"] },
    state: { control: "select", options: ["default", "selected", "disabled"] },
    size: { control: "select", options: [20, 24, 28, 32] },
    count: { control: "number" },
  },
  args: {
    label: "Label",
    type: "default",
    state: "default",
    size: 20,
    count: 3,
  },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Playground: Story = {};
