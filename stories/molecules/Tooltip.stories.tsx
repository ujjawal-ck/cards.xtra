import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "../../src/molecules/Tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "Molecules/Tooltip",
  component: Tooltip,
  argTypes: {
    title: { control: "text" },
    supporting: { control: "text" },
    theme: { control: "select", options: ["dark", "light"] },
    position: { control: "select", options: ["top", "bottom", "left", "right"] },
    size: { control: "select", options: ["sm", "md"] },
    maxWidth: { control: "number" },
  },
  args: {
    title: "Title",
    supporting: "Supporting",
    theme: "dark",
    position: "top",
    size: "sm",
    maxWidth: 0,
  },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Playground: Story = {};
