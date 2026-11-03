import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CashbackBadge } from "../../src/atoms/CashbackBadge";

const meta: Meta<typeof CashbackBadge> = {
  title: "Atoms/CashbackBadge",
  component: CashbackBadge,
  argTypes: {
    prefix: { control: "text" },
    value: { control: "text" },
    showPrefix: { control: "boolean" },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  args: {
    prefix: "Upto",
    value: "Value",
    showPrefix: true,
    size: "sm",
  },
};
export default meta;
type Story = StoryObj<typeof CashbackBadge>;

export const Playground: Story = {};
