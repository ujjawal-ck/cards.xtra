import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../../src/atoms/Badge";

const meta: Meta<typeof Badge> = {
  title: "Atoms/Badge",
  component: Badge,
  argTypes: {
    label: { control: "text" },
    size: { control: "select", options: ["xxs", "xs", "sm", "md"] },
    appearance: { control: "select", options: ["default", "subtle"] },
    pill: { control: "boolean" },
    icon: { control: "select", options: ["none", "dot", "left", "right", "only", "close"] },
  },
  args: {
    label: "Label",
    size: "xxs",
    appearance: "default",
    pill: false,
    icon: "none",
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Playground: Story = {};
