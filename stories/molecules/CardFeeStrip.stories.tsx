import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CardFeeStrip } from "../../src/molecules/CardFeeStrip";

const meta: Meta<typeof CardFeeStrip> = {
  title: "Molecules/CardFeeStrip",
  component: CardFeeStrip,
  argTypes: {
    type: { control: "select", options: ["lifetime-free", "discontinued", "with-fees"] },
    joiningFee: { control: "text" },
    annualFee: { control: "text" },
    ctaLabel: { control: "text" },
  },
  args: {
    type: "lifetime-free",
    joiningFee: "₹999",
    annualFee: "₹1,179",
    ctaLabel: "Apply Now",
  },
};
export default meta;
type Story = StoryObj<typeof CardFeeStrip>;

export const Playground: Story = {};
