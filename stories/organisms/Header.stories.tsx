import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "../../src/organisms/Header";

const meta: Meta<typeof Header> = {
  title: "Organisms/Header",
  component: Header,
  argTypes: {
    surface: { control: "select", options: ["default", "transparent"] },
    leading: { control: "select", options: ["back", "close"] },
    title: { control: "text" },
    activeTab: { control: "number" },
  },
  args: {
    surface: "default",
    leading: "back",
    title: "Title",
    activeTab: 0,
  },
};
export default meta;
type Story = StoryObj<typeof Header>;

export const Playground: Story = {};
