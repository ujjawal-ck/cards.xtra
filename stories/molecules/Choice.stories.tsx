import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Choice } from "../../src/molecules/Choice";

const meta: Meta<typeof Choice> = {
  title: "Molecules/Choice",
  component: Choice,
  argTypes: {
    type: { control: "select", options: ["checkbox", "radio"] },
    label: { control: "text" },
    description: { control: "text" },
    showDescription: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    type: "checkbox",
    label: "Label",
    description: "Description text",
    showDescription: false,
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<typeof Choice>;

export const Playground: Story = {};
