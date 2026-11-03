import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CardDetailMasthead } from "../../src/organisms/CardDetailMasthead";

const meta: Meta<typeof CardDetailMasthead> = {
  title: "Organisms/CardDetailMasthead",
  component: CardDetailMasthead,
  argTypes: {

  },
  args: {

  },
};
export default meta;
type Story = StoryObj<typeof CardDetailMasthead>;

/* CardDetailMasthead needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
