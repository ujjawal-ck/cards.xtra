import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CardTile } from "../../src/organisms/CardTile";

const meta: Meta<typeof CardTile> = {
  title: "Organisms/CardTile",
  component: CardTile,
  argTypes: {
    type: { control: "select", options: ["full", "scrollable"] },
    cardName: { control: "text" },
    cashbackText: { control: "text" },
    inviteOnly: { control: "boolean" },
    feeType: { control: "select", options: ["type"] },
    feeProps: { control: "select", options: ["type"] },
  },
  args: {
    type: "full",
    cardName: "HDFC Regalia Gold",
    cashbackText: "Upto ₹2,500",
    inviteOnly: false,
    feeType: "type",
    feeProps: "type",
  },
};
export default meta;
type Story = StoryObj<typeof CardTile>;

/* CardTile needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
