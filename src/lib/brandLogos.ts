/**
 * Brand logos for the card tools (TOOL_BRANDS ids -> image source).
 * Only clean logo files are used: images.stores (wordmarks), the Flipkart raster icon and
 * src/assets/images/brand-logos (see its README for the source).
 * images.brands holds offer promo art ("UP TO 60% OFF"), not logos, so it is not used.
 * TEMP: ajio has no logo file yet. Replace all of these with the CashKaro store image_url when the mini app key has stores mapped (see knowledge M10)
 */
import type { ImageSourcePropType } from 'react-native';
import { images } from '../assets/images';

export const BRAND_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
  amazon: images.stores.amazon2,
  flipkart: require('../assets/icons/raster/flipkart.png'),
  myntra: images.stores.myntra31,
  nykaa: require('../assets/images/brand-logos/logo-nykaa.png'),
  swiggy: require('../assets/images/brand-logos/logo-swiggy.png'),
  zomato: require('../assets/images/brand-logos/logo-zomato.png'),
  blinkit: require('../assets/images/brand-logos/logo-blinkit.png'),
  zepto: require('../assets/images/brand-logos/logo-zepto.png'),
  bigbasket: require('../assets/images/brand-logos/logo-bigbasket.png'),
};

export function brandLogoFor(id: string): ImageSourcePropType | undefined {
  return Object.prototype.hasOwnProperty.call(BRAND_LOGOS, id) ? BRAND_LOGOS[id] : undefined;
}
