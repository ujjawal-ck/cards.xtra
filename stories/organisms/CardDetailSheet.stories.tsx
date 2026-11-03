import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CardDetailSheet } from "../../src/organisms/CardDetailSheet";

/**
 * ⚠️ CardDetailSheet is a gorhom bottom-sheet / native-gesture component.
 * RN-Web renders its static layout but the sheet gestures, snap points,
 * and reanimated transitions only work on a device/simulator.
 * This story shows the visual structure; interactions: view on device.
 */
const meta: Meta<typeof CardDetailSheet> = {
  title: "Organisms/CardDetailSheet",
  component: CardDetailSheet,
  argTypes: {

  },
  args: {

  },
};
export default meta;
type Story = StoryObj<typeof CardDetailSheet>;

export const Playground: Story = {};
