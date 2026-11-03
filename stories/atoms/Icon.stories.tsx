import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Icon } from "../../src/atoms/Icon";

const meta: Meta<typeof Icon> = {
  title: "Atoms/Icon",
  component: Icon,
  argTypes: {
    size: { control: "number" },
    color: { control: "text" },
  },
  args: {
    name: "nav-home-outline" as any,
    size: 24,
    color: "#262626",
  },
};
export default meta;
type Story = StoryObj<typeof Icon>;

export const Playground: Story = {};
