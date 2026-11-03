import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MastheadHeader } from "../../src/organisms/MastheadHeader";

const meta: Meta<typeof MastheadHeader> = {
  title: "Organisms/MastheadHeader",
  component: MastheadHeader,
  argTypes: {
    iconType: { control: "select", options: ["solid", "overlay"] },
    leading: { control: "select", options: ["back", "close"] },
    title: { control: "text" },
    trailingGlyph: { control: "select", options: ["share"] },
  },
  args: {
    iconType: "solid",
    leading: "back",
    title: "Title",
    trailingGlyph: "share",
  },
};
export default meta;
type Story = StoryObj<typeof MastheadHeader>;

export const Playground: Story = {};
