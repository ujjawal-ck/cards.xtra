import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DividerVertical } from "../../src/atoms/DividerVertical";

const meta: Meta<typeof DividerVertical> = {
  title: "Atoms/DividerVertical",
  component: DividerVertical,
  argTypes: {
    style: { control: "select", options: ["solid", "fade", "dashed", "or"] },
    height: { control: "number" },
  },
  args: {
    style: "solid",
    height: 0,
  },
};
export default meta;
type Story = StoryObj<typeof DividerVertical>;

export const Playground: Story = {};
