/**
 * Brand logos for the card tools (TOOL_BRANDS ids -> images.brands source).
 * TEMP: logos for swiggy, zomato, blinkit, zepto and bigbasket are missing; replace with the CashKaro store image_url when the mini app key has stores mapped (see knowledge M10)
 */
import type { ImageSourcePropType } from 'react-native';
import { images } from '../assets/images';

export const BRAND_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
  amazon: images.brands.amazon,
  flipkart: images.brands.flipkart,
  myntra: images.brands.myntra,
  ajio: images.brands.ajio,
  nykaa: images.brands.nykaa,
};

export function brandLogoFor(id: string): ImageSourcePropType | undefined {
  return Object.prototype.hasOwnProperty.call(BRAND_LOGOS, id) ? BRAND_LOGOS[id] : undefined;
}
