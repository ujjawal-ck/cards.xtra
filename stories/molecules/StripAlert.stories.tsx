import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { StripAlert } from "../../src/molecules/StripAlert";

const meta: Meta<typeof StripAlert> = {
  title: "Molecules/StripAlert",
  component: StripAlert,
  argTypes: {
    layout: { control: "select", options: ["center", "left-cta"] },
    icon: { control: "boolean" },
    text: { control: "text" },
    ctaLabel: { control: "text" },
  },
  args: {
    layout: "center",
    icon: false,
    text: "Text",
    ctaLabel: "Apply Now",
  },
};
export default meta;
type Story = StoryObj<typeof StripAlert>;

export const Playground: Story = {};
