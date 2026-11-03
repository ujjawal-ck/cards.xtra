import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ListRow } from "../../src/molecules/ListRow";

const meta: Meta<typeof ListRow> = {
  title: "Molecules/ListRow",
  component: ListRow,
  argTypes: {
    type: { control: "select", options: ["number-bullet", "thumbnail-key-chevron", "icon-definition", "icon-caption-value", "bullet-point", "icon-caption", "amount-status", "caption-value", "caption-cta", "menu-option", "simple-bullet", "rate-description"] },
    description: { control: "text" },
    text: { control: "text" },
    caption: { control: "text" },
    value: { control: "text" },
    label: { control: "text" },
    rate: { control: "text" },
    title: { control: "text" },
    biline: { control: "text" },
  },
  args: {
    type: "number-bullet",
    description: "Description text",
    text: "Text",
    caption: "Caption",
    value: "Value",
    label: "Label",
    rate: "Rate",
    title: "Title",
    biline: "Biline",
  },
};
export default meta;
type Story = StoryObj<typeof ListRow>;

export const Playground: Story = {};
