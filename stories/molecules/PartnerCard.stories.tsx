import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { PartnerCard } from "../../src/molecules/PartnerCard";

const meta: Meta<typeof PartnerCard> = {
  title: "Molecules/PartnerCard",
  component: PartnerCard,
  argTypes: {

  },
  args: {

  },
};
export default meta;
type Story = StoryObj<typeof PartnerCard>;

/* PartnerCard needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
