/**
 * Sample card data — Indian bank cards backed by real card art from
 * src/assets/images/cards. Covers all three fee-strip states so the
 * Home list demonstrates the organism CardTile + CardFeeStrip in full.
 *
 *   1. HDFC Regalia Gold       — with-fees,    invite-only
 *   2. HDFC Swiggy             — lifetime-free
 *   3. SBI Cashback            — with-fees
 *   4. ICICI Coral             — with-fees
 *   5. Axis Magnus             — discontinued, invite-only
 *
 * `placeholderColor`, `shortName`, `cashback`, and emoji `benefits` are
 * kept for the legacy CardDetailSheet hero/grid; the organism tile
 * reads `cardImage`, `cashbackValue`, `feeType`, and `tileBenefits`.
 *
 * tileBenefits now carries SIX entries per card so the CardDetailSheet
 * benefits grid (Grid variant="features") fills two columns x three rows
 * like the Figma (3813:27969 / 27972). Icons are feat-*-outline names
 * confirmed present in src/assets/icons.
 */
import type { CardModel } from '../molecules';
import { images } from '../assets/images';
 
export const SAMPLE_CARDS: CardModel[] = [
  {
    id: 'hdfc-regalia-gold',
    name: 'HDFC Bank Regalia Gold Credit Card',
    shortName: 'HDFC',
    placeholderColor: 'dark',
    cardImage: images.cards.hdfcRegaliaGold,
    cashback: 'Upto \u20B92,500 Cashback',
    cashbackValue: '\u20B92,500',
    feeType: 'with-fees',
    tags: ['Travel', 'Airport Lounge', 'Fuel'],
    benefits: [
      { icon: '\u{1F6EC}', text: '12 complimentary airport lounge visits / year' },
      { icon: '\u26FD', text: '1% fuel surcharge waiver on all stations' },
      { icon: '\u{1F381}', text: '\u20B92,500 welcome benefit on first spend' },
    ],
    tileBenefits: [
      { icon: 'feat-lounge-outline', title: '12 complimentary domestic lounge visits / year', tagId: 4 },
      { icon: 'feat-dining-outline', title: 'Up to 7% discount at partner restaurants', tagId: 6 },
      { icon: 'feat-travel-outline', title: '4 international & 6 domestic lounge access', tagId: 12 },
      { icon: 'feat-rewards-outline', title: '\u20B92,500 welcome benefit on first spend' },
      { icon: 'feat-discount-outline', title: '\u20B90 annual fee on \u20B92L+ annual spend', tagId: 2 },
      { icon: 'feat-fuel-outline', title: '1% fuel surcharge waiver on all stations', tagId: 1 },
    ],
    joiningFee: '\u20B92,500',
    annualFee: '\u20B92,500',
    inviteOnly: true,
  },
  {
    id: 'hdfc-swiggy',
    name: 'HDFC Swiggy Credit Card',
    shortName: 'HDFC',
    placeholderColor: 'saffron',
    cardImage: images.cards.hdfcSwiggy,
    cashback: 'Upto 10% Cashback',
    cashbackValue: '\u20B91,200',
    feeType: 'lifetime-free',
    tags: ['Dining', 'Daily Spends'],
    benefits: [
      { icon: '\u{1F354}', text: '10% cashback on Swiggy app spends' },
      { icon: '\u{1F6D2}', text: '5% cashback on online merchant categories' },
      { icon: '\u{1F4B3}', text: '1% cashback on all other spends' },
    ],
    tileBenefits: [
      { icon: 'feat-dining-outline', title: '10% cashback on dining and food delivery', tagId: 6 },
      { icon: 'feat-mobile-recharge-outline', title: '1.5% cashback on all online purchases', tagId: 14 },
      { icon: 'feat-lounge-outline', title: '4 international & 6 domestic airport lounge access', tagId: 4 },
      { icon: 'feat-travel-outline', title: '\u20B912,000 yatra voucher upon joining', tagId: 12 },
      { icon: 'feat-discount-outline', title: '\u20B90 annual fee on \u20B92L+ annual spend', tagId: 2 },
      { icon: 'feat-fuel-outline', title: 'Save 1% on fuel spends between \u20B9500 and \u20B93,000', tagId: 1 },
    ],
    joiningFee: 'Free',
    annualFee: 'Free',
  },
  {
    id: 'sbi-cashback',
    name: 'SBI Cashback Credit Card',
    shortName: 'SBI',
    placeholderColor: 'cobalt',
    cardImage: images.cards.sbiCashback,
    cashback: 'Flat 5% Cashback',
    cashbackValue: '\u20B92,000',
    feeType: 'with-fees',
    tags: ['Online Spends', 'Daily Use'],
    benefits: [
      { icon: '\u{1F6D2}', text: '5% cashback on all online spends' },
      { icon: '\u{1F3EC}', text: '1% cashback on offline transactions' },
    ],
    tileBenefits: [
      { icon: 'feat-discount-outline', title: '5% cashback on online spends, no merchant cap', tagId: 2 },
      { icon: 'feat-mobile-recharge-outline', title: '5% cashback on all online purchases', tagId: 14 },
      { icon: 'feat-savings-outline', title: '1% cashback on all offline spends', tagId: 7 },
      { icon: 'feat-dining-outline', title: '5% cashback on dining and food delivery', tagId: 6 },
      { icon: 'feat-fuel-outline', title: '1% fuel surcharge waiver across stations', tagId: 1 },
      { icon: 'feat-rewards-outline', title: '\u20B92,000 welcome benefit on activation' },
    ],
    joiningFee: '\u20B9999',
    annualFee: '\u20B9999',
  },
  {
    id: 'icici-coral',
    name: 'ICICI Bank Coral Credit Card',
    shortName: 'ICICI',
    placeholderColor: 'ruby',
    cardImage: images.cards.iciciCoral,
    cashback: 'Upto \u20B91,000 Cashback',
    cashbackValue: '\u20B91,000',
    feeType: 'with-fees',
    tags: ['Shopping', 'Movies', 'Lounge'],
    benefits: [
      { icon: '\u{1F3AC}', text: '1 free BookMyShow movie ticket / month' },
      { icon: '\u{1F6EC}', text: '1 domestic lounge visit / quarter' },
      { icon: '\u{1F6D2}', text: '2 PAYBACK points per \u20B9100 on retail spends' },
    ],
    tileBenefits: [
      { icon: 'feat-celebration-outline', title: '1 free BookMyShow movie ticket every month' },
      { icon: 'feat-lounge-outline', title: '1 complimentary domestic lounge visit per quarter', tagId: 4 },
      { icon: 'feat-discount-outline', title: '2 PAYBACK points per \u20B9100 on retail spends', tagId: 2 },
      { icon: 'feat-dining-outline', title: '15% off at over 2,500 partner restaurants', tagId: 6 },
      { icon: 'feat-fuel-outline', title: '1% fuel surcharge waiver on all stations', tagId: 1 },
      { icon: 'feat-travel-outline', title: 'Complimentary railway lounge access', tagId: 12 },
    ],
    joiningFee: '\u20B9500',
    annualFee: '\u20B9500',
  },
  {
    id: 'axis-magnus',
    name: 'Axis Bank Magnus Credit Card',
    shortName: 'AXIS',
    placeholderColor: 'violet',
    cardImage: images.cards.axisMagnus,
    cashback: 'Upto \u20B93,500 Cashback',
    cashbackValue: '\u20B93,500',
    feeType: 'discontinued',
    tags: ['Premium', 'Travel', 'Lifestyle'],
    benefits: [
      { icon: '\u2708', text: '8 international + unlimited domestic lounge visits' },
      { icon: '\u{1F3AB}', text: '25,000 EDGE reward points on activation' },
      { icon: '\u{1F3E8}', text: '5x EDGE points on travel spends' },
    ],
    tileBenefits: [
      { icon: 'feat-lounge-outline', title: 'Unlimited domestic & 8 international lounge visits', tagId: 4 },
      { icon: 'feat-rewards-outline', title: '25,000 EDGE reward points on activation' },
      { icon: 'feat-travel-outline', title: '5x EDGE points on travel spends', tagId: 12 },
      { icon: 'feat-dining-outline', title: 'Up to 20% off at premium partner restaurants', tagId: 6 },
      { icon: 'feat-discount-outline', title: '\u20B90 annual fee on \u20B925L+ annual spend', tagId: 2 },
      { icon: 'feat-fuel-outline', title: '1% fuel surcharge waiver on all stations', tagId: 1 },
    ],
    joiningFee: '\u20B912,500',
    annualFee: '\u20B912,500',
    inviteOnly: true,
  },
];
 