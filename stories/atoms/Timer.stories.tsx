import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Timer } from "../../src/atoms/Timer";

const meta: Meta<typeof Timer> = {
  title: "Atoms/Timer",
  component: Timer,
  argTypes: {
    surface: { control: "select", options: ["default", "transparent"] },
    format: { control: "select", options: ["hh:mm", "dd:hh:mm"] },
    days: { control: "number" },
    hours: { control: "number" },
    minutes: { control: "number" },
  },
  args: {
    surface: "default",
    format: "hh:mm",
    days: 0,
    hours: 2,
    minutes: 30,
  },
};
export default meta;
type Story = StoryObj<typeof Timer>;

export const Playground: Story = {};
