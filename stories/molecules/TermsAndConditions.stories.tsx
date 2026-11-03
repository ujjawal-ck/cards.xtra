import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TermsAndConditions } from "../../src/molecules/TermsAndConditions";

const meta: Meta<typeof TermsAndConditions> = {
  title: "Molecules/TermsAndConditions",
  component: TermsAndConditions,
  argTypes: {
    checked: { control: "select", options: ["none"] },
    description: { control: "text" },
    placement: { control: "select", options: ["default", "sticky"] },
    body: { control: "select", options: ["multi-line", "1-line"] },
    state: { control: "select", options: ["default", "error"] },
    errorText: { control: "text" },
  },
  args: {
    checked: "none",
    description: "Description text",
    placement: "default",
    body: "multi-line",
    state: "default",
    errorText: "Error",
  },
};
export default meta;
type Story = StoryObj<typeof TermsAndConditions>;

export const Playground: Story = {};
