import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { BrandLogo } from "../../src/molecules/BrandLogo";

const meta: Meta<typeof BrandLogo> = {
  title: "Molecules/BrandLogo",
  component: BrandLogo,
  argTypes: {
    accessibilityLabel: { control: "text" },
  },
  args: {
    accessibilityLabel: "Accessibilitylabel",
  },
};
export default meta;
type Story = StoryObj<typeof BrandLogo>;

export const Playground: Story = {};
