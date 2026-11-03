import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Selector } from "../../src/atoms/Selector";

const meta: Meta<typeof Selector> = {
  title: "Atoms/Selector",
  component: Selector,
  argTypes: {
    title: { control: "text" },
    selected: { control: "boolean" },
    accessibilityLabel: { control: "text" },
  },
  args: {
    title: "Title",
    selected: true,
    accessibilityLabel: "Accessibilitylabel",
  },
};
export default meta;
type Story = StoryObj<typeof Selector>;

export const Playground: Story = {};
