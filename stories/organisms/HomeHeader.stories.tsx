import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HomeHeader } from "../../src/organisms/HomeHeader";

const meta: Meta<typeof HomeHeader> = {
  title: "Organisms/HomeHeader",
  component: HomeHeader,
  argTypes: {
    scrolled: { control: "boolean" },
    notificationCount: { control: "number" },
    filtersCategoryLabel: { control: "text" },
    eligibilityOn: { control: "boolean" },
  },
  args: {
    scrolled: false,
    notificationCount: 9,
    filtersCategoryLabel: "Filterscategorylabel",
    eligibilityOn: false,
  },
};
export default meta;
type Story = StoryObj<typeof HomeHeader>;

export const Playground: Story = {};
