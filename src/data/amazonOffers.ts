/**
 * amazonOffers — content for the Amazon brand page's offer-detail bottom
 * sheets (Figma 4439:291383, offers/brand/bottomsheet/*).
 *
 * Shared by OffersBrandAmazon (live sheets) and FoundationCheck (gallery)
 * so the copy lives in one place.
 *
 * NOTE: the terms-conditions final bullet was corrupted in Figma
 * ("withi xjbsjcbs…"); clean copy is used below — FLAGGED for confirmation.
 */

export interface RewardRateRow {
  /** Big saffron value, e.g. "5%" or "₹2.5". */
  rate: string;
  /** Category label. */
  description: string;
}

export const AMAZON_RATE_ROWS: RewardRateRow[] = [
  { rate: '5%', description: 'Rewards on Beauty | Luxury Beauty | Apparel | Luggage | Shoes, Handbags & Accessories' },
  { rate: '3.5%', description: 'Rewards on Pet Products' },
  { rate: '3%', description: 'Rewards on Sports | Baby Products | Health & Personal Care | Books and Toys' },
  { rate: '2.5%', description: 'Rewards on Kitchen | Business Equipment | Home Improvement | Lawn & Garden | Furniture | Home | Personal Care Appliances | Grocery' },
  { rate: '2%', description: 'Rewards on Jewellery (excluding Gold Coins, Gold Bars, Silver Coins, Gold Jewellery, Silver Jewellery & other Precious Jewellery) | Watches' },
  { rate: '₹2.5', description: 'Rewards on all Recharge/Bill Payments except adding Amazon Pay Balance, Credit Card Bill, Insurance Payments (Min. amount of Rs.10)' },
];

export const AMAZON_TC_INTRO =
  "Do not add products to your Cart/Wishlist/Save for later before visiting Amazon's website/app through CashKaro";

export const AMAZON_TC_BULLETS: string[] = [
  'If you ever had/have a Seller/Merchant/Affiliate account, you are not eligible for Rewards',
  'GST/Amazon Business users are not eligible for Rewards on the purchase of cell phones and mobile accessories',
  'Order Amount considered for calculation of Rewards is the amount paid after subtracting GST and other charges',
  'For Subscribe & Save orders, Rewards are applicable only on the first order and not on subsequent deliveries',
  'CashKaro users should access only one Amazon account per click-out. Logging into multiple accounts or sharing CashKaro links with personal details is considered abuse, which may result in account blocking and forfeiture of Rewards',
  'Rewards for Cell phones and Mobile Accessories purchases will be validated within 80 days of order date',
  'Rewards for Home Entertainment & Furniture purchases will be validated within 45 days from the order date',
  // FLAGGED: Figma copy corrupted ("withi xjbsjcbs…") — clean copy below.
  'Missing Tickets are resolved within 3 days, and corresponding Rewards validated within 90 days of being added to CashKaro account',
];
