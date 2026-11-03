import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FooterButtons } from "../../src/organisms/FooterButtons";

const meta: Meta<typeof FooterButtons> = {
  title: "Organisms/FooterButtons",
  component: FooterButtons,
  argTypes: {
    buttons: { control: "select", options: ["single", "dual", "dual-outline"] },
    size: { control: "select", options: [44, 52] },
    shadow: { control: "select", options: ["on", "off"] },
    strip: { control: "select", options: ["none", "caption", "tnc"] },
    color: { control: "select", options: ["main", "second", "mixed"] },
    primaryLabel: { control: "text" },
    secondaryLabel: { control: "text" },
    stripText: { control: "text" },
    tncChecked: { control: "boolean" },
  },
  args: {
    buttons: "single",
    size: 44,
    shadow: "on",
    strip: "none",
    color: "main",
    primaryLabel: "Apply Filter",
    secondaryLabel: "Secondarylabel",
    stripText: "Striptext",
    tncChecked: false,
  },
};
export default meta;
type Story = StoryObj<typeof FooterButtons>;

export const Playground: Story = {};
