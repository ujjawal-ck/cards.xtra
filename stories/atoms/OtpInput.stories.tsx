import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { OtpInput } from "../../src/atoms/OtpInput";

const meta: Meta<typeof OtpInput> = {
  title: "Atoms/OtpInput",
  component: OtpInput,
  argTypes: {
    length: { control: "select", options: [4, 6] },
    value: { control: "text" },
    state: { control: "select", options: ["default", "focused", "error"] },
    hint: { control: "text" },
    resend: { control: "select", options: ["hidden", "timer", "ready"] },
    seconds: { control: "number" },
    autoFocus: { control: "boolean" },
    useBottomSheetInput: { control: "boolean" },
  },
  args: {
    length: 4,
    value: "Value",
    state: "default",
    hint: "Helper text",
    resend: "hidden",
    seconds: 30,
    autoFocus: false,
    useBottomSheetInput: false,
  },
};
export default meta;
type Story = StoryObj<typeof OtpInput>;

export const Playground: Story = {};
