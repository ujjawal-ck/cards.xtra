/** Fixtures for the Carousels stories. Local assets and SAMPLE_CARDS only. No network. */
import { images } from '../../../src/assets/images';
import { SAMPLE_CARDS } from '../../../src/data/cards';
import type {
  CreditCardOfferItem,
  CategoryTileItem,
  HowItWorksStep,
  MilestoneStatItem,
  CardCarouselItem,
} from '../../../src/organisms/Carousels';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const offerCards: CreditCardOfferItem[] = [
  { id: 'hdfc-regalia-gold', image: images.cards.hdfcRegaliaGold, name: 'HDFC Regalia Gold', cashback: `${inr(2500)} Cashback`, prefix: 'Upto' },
  { id: 'hdfc-swiggy', image: images.cards.hdfcSwiggy, name: 'HDFC Swiggy', cashback: `${inr(1200)} Cashback`, prefix: 'Upto' },
  { id: 'sbi-cashback', image: images.cards.sbiCashback, name: 'SBI Cashback', cashback: `${inr(2000)} Cashback` },
  { id: 'icici-coral', image: images.cards.iciciCoral, name: 'ICICI Coral', cashback: `${inr(1000)} Cashback`, prefix: 'Upto' },
  { id: 'axis-magnus', image: images.cards.axisMagnus, name: 'Axis Magnus', cashback: `${inr(3500)} Cashback` },
  { id: 'axis-flipkart', image: images.cards.axisFlipkart, name: 'Axis Flipkart', cashback: `${inr(800)} Cashback`, prefix: 'Upto' },
  { id: 'federal-scapia', image: images.cards.federalScapia, name: 'Federal Scapia', cashback: `${inr(600)} Cashback` },
];

export const categoryTiles: CategoryTileItem[] = [
  { id: 'fashion', label: 'Fashion', image: images.categories.fashion },
  { id: 'electronics', label: 'Electronics', image: images.categories.electronics },
  { id: 'food', label: 'Food and Grocery', image: images.categories.foodAndGrocery },
  { id: 'travel', label: 'Flights and Travel', image: images.categories.flightsAndTravel },
  { id: 'beauty', label: 'Beauty and Grooming', image: images.categories.beautyAndGrooming },
  { id: 'health', label: 'Health and Wellness', image: images.categories.healthAndWellness },
  { id: 'home', label: 'Home and Kitchen', image: images.categories.homeAndKitchen },
];

export const howSteps: HowItWorksStep[] = [
  { id: 's1', text: 'Pick a card that fits your spends', icon: 'feat-discount-outline' },
  { id: 's2', text: 'Apply through Cards.xtra', icon: 'check-circle-outline' },
  { id: 's3', text: 'Spend as usual and track it', icon: 'wallet-outline' },
  { id: 's4', text: 'Get your cashback in your wallet', icon: 'feat-rewards-outline' },
];

export const milestoneItems: MilestoneStatItem[] = [
  { id: 'm1', image: images.storepage.amazon },
  { id: 'm2', image: images.storepage.myntra },
  { id: 'm3', image: images.storepage.nocashback },
];

export const promoImages = [images.storepage.amazon, images.storepage.myntra, images.storepage.nocashback];

export const cardCarouselItems: CardCarouselItem[] = SAMPLE_CARDS.map((c) => ({
  id: c.id,
  cardImage: c.cardImage,
  cardName: c.name,
  cashbackText: c.cashbackValue,
  tags: c.tags,
  benefits: c.tileBenefits.slice(0, 3),
}));
