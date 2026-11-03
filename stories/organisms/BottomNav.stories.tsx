import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BottomNav } from "../../src/organisms/BottomNav";

const meta: Meta<typeof BottomNav> = {
  title: "Organisms/BottomNav",
  component: BottomNav,
  argTypes: {
    activeTab: { control: "select", options: ["home", "offers", "earnings", "profile"] },
  },
  args: {
    activeTab: "home",
  },
};
export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Playground: Story = {};
