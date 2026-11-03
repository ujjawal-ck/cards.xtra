import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "../../src/organisms/Footer";

const meta: Meta<typeof Footer> = {
  title: "Organisms/Footer",
  component: Footer,
  argTypes: {
    theme: { control: "select", options: ["dark", "light"] },
    headline: { control: "text" },
    subtext: { control: "text" },
    ctaLabel: { control: "text" },
  },
  args: {
    theme: "dark",
    headline: "Headline",
    subtext: "Supporting text",
    ctaLabel: "Apply Now",
  },
};
export default meta;
type Story = StoryObj<typeof Footer>;

/* Footer needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
