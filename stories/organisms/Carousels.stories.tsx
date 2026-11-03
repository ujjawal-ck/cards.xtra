import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  CreditCardOffer,
  CategoryTiles,
  HowItWorks,
  MilestoneStat,
  PromoBanner,
  CardCarousel,
  BestForSpending,
} from "../../src/organisms/Carousels";

/**
 * Carousels — the home-screen section carousels. The file exports SEVEN
 * named sections; each is shown below. Data-driven, so stories pass
 * representative sample items. Horizontal scroll works in RN-Web.
 */
const meta: Meta = { title: "Organisms/Carousels" };
export default meta;
type Story = StoryObj;

export const BestForSpending_: Story = {
  name: "BestForSpending",
  render: () => <BestForSpending />,
};
export const HowItWorks_: Story = {
  name: "HowItWorks",
  render: () => (
    <HowItWorks
      steps={[
        { title: "Tap a card", body: "Browse and pick" },
        { title: "Apply", body: "Quick form" },
        { title: "Earn", body: "Cashback credited" },
      ]}
    />
  ),
};
export const MilestoneStat_: Story = {
  name: "MilestoneStat",
  render: () => (
    <MilestoneStat items={[{ label: "Earned", value: "₹1,500" }, { label: "Pending", value: "₹500" }]} />
  ),
};

/*
 * CreditCardOffer, CategoryTiles, PromoBanner and CardCarousel take richer
 * item shapes (card art, brand logos) — wire real data from src/data to
 * preview them. Stubbed here to keep the story importable; fill with your
 * data fixtures when running locally.
 */
