import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "../../src/atoms/Switch";

const meta: Meta<typeof Switch> = {
  title: "Atoms/Switch",
  component: Switch,
  argTypes: {
    value: { control: "boolean" },
    size: { control: "select", options: ["md", "sm"] },
    disabled: { control: "boolean" },
  },
  args: {
    value: true,
    size: "md",
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Playground: Story = {};
