import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { InlineMessage } from "../../src/molecules/InlineMessage";

const meta: Meta<typeof InlineMessage> = {
  title: "Molecules/InlineMessage",
  component: InlineMessage,
  argTypes: {
    message: { control: "text" },
    title: { control: "text" },
    action: { control: "select", options: ["none", "single", "two"] },
    primaryActionLabel: { control: "text" },
    secondaryActionLabel: { control: "text" },
  },
  args: {
    message: "This is a message",
    title: "Title",
    action: "none",
    primaryActionLabel: "Confirm",
    secondaryActionLabel: "Cancel",
  },
};
export default meta;
type Story = StoryObj<typeof InlineMessage>;

export const Playground: Story = {};
