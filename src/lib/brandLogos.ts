/**
 * Brand logos for the card tools (TOOL_BRANDS ids -> image source).
 * Only clean logo files are used: images.stores (wordmarks) and the Flipkart raster icon.
 * images.brands holds offer promo art ("UP TO 60% OFF"), not logos, so ajio and nykaa have none yet.
 * TEMP: ajio, nykaa, swiggy, zomato, blinkit, zepto and bigbasket have no logo file; replace with the CashKaro store image_url when the mini app key has stores mapped (see knowledge M10)
 */
import type { ImageSourcePropType } from 'react-native';
import { images } from '../assets/images';

export const BRAND_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
  amazon: images.stores.amazon2,
  flipkart: require('../assets/icons/raster/flipkart.png'),
  myntra: images.stores.myntra31,
};

export function brandLogoFor(id: string): ImageSourcePropType | undefined {
  return Object.prototype.hasOwnProperty.call(BRAND_LOGOS, id) ? BRAND_LOGOS[id] : undefined;
}
