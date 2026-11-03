import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Indicator } from "../../src/atoms/Indicator";

const meta: Meta<typeof Indicator> = {
  title: "Atoms/Indicator",
  component: Indicator,
  argTypes: {
    variant: { control: "select", options: ["steps", "scroll"] },
    total: { control: "number" },
    active: { control: "number" },
    progress: { control: "number" },
  },
  args: {
    variant: "steps",
    total: 4,
    active: 0,
    progress: 0,
  },
};
export default meta;
type Story = StoryObj<typeof Indicator>;

export const Playground: Story = {};
