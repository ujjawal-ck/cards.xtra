import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "../../src/atoms/Text";

const meta: Meta<typeof Text> = {
  title: "Atoms/Text",
  component: Text,
  argTypes: {
    color: { control: "text" },
    align: { control: "select", options: ["left", "center", "right"] },
  },
  args: {
    color: "#262626",
    align: "left",
  },
};
export default meta;
type Story = StoryObj<typeof Text>;

export const Playground: Story = {
  render: (args) => <Text {...args}>The quick brown fox jumps</Text>,
};
