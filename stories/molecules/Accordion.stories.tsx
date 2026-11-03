import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Accordion } from "../../src/molecules/Accordion";

const meta: Meta<typeof Accordion> = {
  title: "Molecules/Accordion",
  component: Accordion,
  argTypes: {
    title: { control: "text" },
    body: { control: "text" },
    expanded: { control: "boolean" },
    state: { control: "select", options: ["default", "highlight", "bare"] },
    trailingIcon: { control: "boolean" },
  },
  args: {
    title: "Title",
    body: "Body content",
    expanded: true,
    state: "default",
    trailingIcon: false,
  },
};
export default meta;
type Story = StoryObj<typeof Accordion>;

export const Playground: Story = {};
