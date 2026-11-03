import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FilterRow } from "../../src/molecules/FilterRow";

const meta: Meta<typeof FilterRow> = {
  title: "Molecules/FilterRow",
  component: FilterRow,
  argTypes: {
    category: { control: "text" },
    eligibilityOn: { control: "boolean" },
  },
  args: {
    category: "Category",
    eligibilityOn: false,
  },
};
export default meta;
type Story = StoryObj<typeof FilterRow>;

export const Playground: Story = {};
