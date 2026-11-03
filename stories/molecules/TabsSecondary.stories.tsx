import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TabsSecondary } from "../../src/molecules/TabsSecondary";

const meta: Meta<typeof TabsSecondary> = {
  title: "Molecules/TabsSecondary",
  component: TabsSecondary,
  argTypes: {
    activeIndex: { control: "number" },
  },
  args: {
    activeIndex: 0,
  },
};
export default meta;
type Story = StoryObj<typeof TabsSecondary>;

export const Playground: Story = {};
