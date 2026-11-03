import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TabPrimary } from "../../src/molecules/TabPrimary";

const meta: Meta<typeof TabPrimary> = {
  title: "Molecules/TabPrimary",
  component: TabPrimary,
  argTypes: {
    activeIndex: { control: "number" },
  },
  args: {
    activeIndex: 0,
  },
};
export default meta;
type Story = StoryObj<typeof TabPrimary>;

export const Playground: Story = {};
