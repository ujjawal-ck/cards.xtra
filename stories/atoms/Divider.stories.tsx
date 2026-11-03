import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "../../src/atoms/Divider";

const meta: Meta<typeof Divider> = {
  title: "Atoms/Divider",
  component: Divider,
  argTypes: {
    style: { control: "select", options: ["solid", "dashed", "fade", "or", "text-count"] },
    label: { control: "text" },
    showCounter: { control: "boolean" },
    color: { control: "text" },
  },
  args: {
    style: "solid",
    label: "Label",
    showCounter: false,
    color: "#262626",
  },
};
export default meta;
type Story = StoryObj<typeof Divider>;

export const Playground: Story = {};
