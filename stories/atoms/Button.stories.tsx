import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../../src/atoms/Button";

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  argTypes: {
    label: { control: "text" },
    variant: { control: "select", options: ["solid", "outline", "subtle", "destructive", "ghost", "link"] },
    tone: { control: "select", options: ["main", "second"] },
    size: { control: "select", options: [36, 44, 52] },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    fullWidth: { control: "boolean" },
    icon: { control: "select", options: ["none", "leading", "trailing", "only"] },
  },
  args: {
    label: "Label",
    variant: "solid",
    tone: "main",
    size: 36,
    disabled: false,
    loading: false,
    fullWidth: false,
    icon: "none",
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};
