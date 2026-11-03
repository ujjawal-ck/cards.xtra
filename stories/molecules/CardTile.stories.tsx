import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CardTile } from "../../src/molecules/CardTile";

const meta: Meta<typeof CardTile> = {
  title: "Molecules/CardTile",
  component: CardTile,
  argTypes: {

  },
  args: {

  },
};
export default meta;
type Story = StoryObj<typeof CardTile>;

/* CardTile needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
