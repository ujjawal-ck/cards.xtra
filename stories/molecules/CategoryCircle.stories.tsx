import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CategoryCircle } from "../../src/molecules/CategoryCircle";

const meta: Meta<typeof CategoryCircle> = {
  title: "Molecules/CategoryCircle",
  component: CategoryCircle,
  argTypes: {
    label: { control: "text" },
    placeholderColor: { control: "select", options: ["saffron", "cobalt", "fern", "violet", "sky", "rose"] },
    size: { control: "number" },
  },
  args: {
    label: "Label",
    placeholderColor: "saffron",
    size: 24,
  },
};
export default meta;
type Story = StoryObj<typeof CategoryCircle>;

export const Playground: Story = {};
