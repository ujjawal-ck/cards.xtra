import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SearchBar } from "../../src/molecules/SearchBar";

const meta: Meta<typeof SearchBar> = {
  title: "Molecules/SearchBar",
  component: SearchBar,
  argTypes: {
    state: { control: "select", options: ["default", "focused", "filled"] },
    value: { control: "text" },
    placeholder: { control: "text" },
  },
  args: {
    state: "default",
    value: "Value",
    placeholder: "Placeholder",
  },
};
export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Playground: Story = {};
