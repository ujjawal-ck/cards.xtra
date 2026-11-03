import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tag } from "../../src/atoms/Tag";

const meta: Meta<typeof Tag> = {
  title: "Atoms/Tag",
  component: Tag,
  argTypes: {
    label: { control: "text" },
    size: { control: "select", options: ["xxs", "xs", "sm", "md"] },
    pill: { control: "boolean" },
    appearance: { control: "select", options: ["default", "subtle", "gradient"] },
    icon: { control: "select", options: ["none", "dot", "icon-left", "icon-right", "icon-only", "x-close"] },
    bgColor: { control: "text" },
    labelColor: { control: "text" },
    borderColor: { control: "text" },
    iconPx: { control: "number" },
  },
  args: {
    label: "Label",
    size: "xxs",
    pill: false,
    appearance: "default",
    icon: "none",
    bgColor: "Bgcolor",
    labelColor: "Labelcolor",
    borderColor: "Bordercolor",
    iconPx: 0,
  },
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Playground: Story = {};
