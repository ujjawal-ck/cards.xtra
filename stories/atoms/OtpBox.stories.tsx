import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { OtpBox } from "../../src/atoms/OtpBox";

const meta: Meta<typeof OtpBox> = {
  title: "Atoms/OtpBox",
  component: OtpBox,
  argTypes: {
    value: { control: "text" },
    focused: { control: "boolean" },
    error: { control: "boolean" },
    size: { control: "number" },
  },
  args: {
    value: "Value",
    focused: false,
    error: false,
    size: 24,
  },
};
export default meta;
type Story = StoryObj<typeof OtpBox>;

export const Playground: Story = {};
