import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Grid } from "../../src/organisms/Grid";

const meta: Meta<typeof Grid> = {
  title: "Organisms/Grid",
  component: Grid,
  argTypes: {

  },
  args: {

  },
};
export default meta;
type Story = StoryObj<typeof Grid>;

/* Grid needs structured data props (card/items). Wire a fixture from src/data. */
export const Playground: Story = {};
