import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Radio } from "../../src/atoms/Radio";

const meta: Meta<typeof Radio> = {
  title: "Atoms/Radio",
  component: Radio,
  argTypes: {
    selected: { control: "boolean" },
    size: { control: "select", options: ["md", "sm"] },
    disabled: { control: "boolean" },
  },
  args: {
    selected: true,
    size: "md",
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<typeof Radio>;

export const Playground: Story = {};
