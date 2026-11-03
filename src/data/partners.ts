/**
 * Placeholder partner data — Indian e-commerce / lifestyle partners.
 */
import type { PartnerModel } from '../molecules';

export const SAMPLE_PARTNERS: PartnerModel[] = [
  { id: 'amazon', name: 'Amazon', logo: '🛍', placeholderColor: 'saffron', rate: '5%' },
  { id: 'flipkart', name: 'Flipkart', logo: '📦', placeholderColor: 'cobalt', rate: '4%' },
  { id: 'reliance-digital', name: 'Reliance Digital', logo: '🖥', placeholderColor: 'violet', rate: '4%' },
  { id: 'ajio', name: 'Ajio', logo: '👕', placeholderColor: 'rose', rate: '4%' },
  { id: 'foxtale', name: 'Foxtale', logo: '🧴', placeholderColor: 'sky', rate: '4%' },
  { id: 'times-prime', name: 'Times Prime', logo: '⭐', placeholderColor: 'fern', rate: '4%' },
];

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  placeholderColor: PartnerModel['placeholderColor'];
}

export const SAMPLE_CATEGORIES: CategoryItem[] = [
  { id: 'new', label: 'New on CashKaro', icon: '✨', placeholderColor: 'saffron' },
  { id: 'fashion', label: 'Fashion', icon: '👗', placeholderColor: 'rose' },
  { id: 'food', label: 'Food & Grocery', icon: '🍔', placeholderColor: 'fern' },
  { id: 'health', label: 'Health & Wellness', icon: '💊', placeholderColor: 'sky' },
  { id: 'travel', label: 'Flights & Travel', icon: '✈', placeholderColor: 'cobalt' },
  { id: 'electronics', label: 'Electronics', icon: '🔌', placeholderColor: 'violet' },
];
