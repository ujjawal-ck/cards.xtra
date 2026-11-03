import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AmountActionRow } from "../../src/molecules/AmountActionRow";

const meta: Meta<typeof AmountActionRow> = {
  title: "Molecules/AmountActionRow",
  component: AmountActionRow,
  argTypes: {
    caption: { control: "text" },
    value: { control: "text" },
    buttonLabel: { control: "text" },
  },
  args: {
    caption: "Caption",
    value: "Value",
    buttonLabel: "Action",
  },
};
export default meta;
type Story = StoryObj<typeof AmountActionRow>;

export const Playground: Story = {};
