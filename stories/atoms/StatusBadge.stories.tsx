import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "../../src/atoms/StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "Atoms/StatusBadge",
  component: StatusBadge,
  argTypes: {
    status: { control: "select", options: ["requested", "pending", "delayed", "cancelled", "confirmed", "paid", "expired"] },
    size: { control: "select", options: ["default", "pill"] },
    rounded: { control: "boolean" },
    label: { control: "text" },
  },
  args: {
    status: "requested",
    size: "default",
    rounded: true,
    label: "Label",
  },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Playground: Story = {};
