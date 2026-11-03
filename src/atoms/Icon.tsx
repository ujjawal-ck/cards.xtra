/**
 * Icon — atom
 *
 * Type-safe wrapper around the project's SVG icon set. Pick a `name` from
 * the registry; the icon resolves to a react-native-svg component built
 * by react-native-svg-transformer (see metro.config.js + svgr.config.js).
 *
 * Color behaviour:
 *   - Most outline / general icons have their default `#262626` stroke
 *     rewritten to `currentColor` at build time (see svgr.config.js), so
 *     the `color` prop tints them.
 *   - The nav-* icons bake `white` / white-gradient on purpose for the
 *     dark pill tab bar — they ignore the `color` prop.
 *   - The desc-* status icons bake semantic colours (success green,
 *     danger red, cashback orange, etc.) and ignore the `color` prop on
 *     purpose: those colours carry meaning and must not theme-shift.
 *
 * Use the project's tokens for `color` and `size`; never inline hex.
 */
import React from 'react';
import { colors, iconSize } from '../tokens';
import type { StyleProp, ViewStyle } from 'react-native';

// ----------------------------------------------------------------------------
// Registry — generated from src/assets/icons/. Keep alphabetical so the union
// of IconName matches the directory listing.
// ----------------------------------------------------------------------------
const ICON_REGISTRY = {
  'amazon': require('../assets/icons/amazon.svg').default,
  'bank-pillars-outline': require('../assets/icons/bank-pillars-outline.svg').default,
  'bell-filled': require('../assets/icons/bell-filled.svg').default,
  'bell-outline': require('../assets/icons/bell-outline.svg').default,
  'category-selector-bg': require('../assets/icons/category-selector-bg.svg').default,
  'cart-filled': require('../assets/icons/cart-filled.svg').default,
  'cart-outline': require('../assets/icons/cart-outline.svg').default,
  'check-circle-filled': require('../assets/icons/check-circle-filled.svg').default,
  'check-circle-outline': require('../assets/icons/check-circle-outline.svg').default,
  'check-filled': require('../assets/icons/check-filled.svg').default,
  'check-outline': require('../assets/icons/check-outline.svg').default,
  'chevron-down': require('../assets/icons/chevron-down.svg').default,
  'chevron-right': require('../assets/icons/chevron-right.svg').default,
  'clipboard-search-filled': require('../assets/icons/clipboard-search-filled.svg').default,
  'clipboard-search-outline': require('../assets/icons/clipboard-search-outline.svg').default,
  'clock-filled': require('../assets/icons/clock-filled.svg').default,
  'clock-outline': require('../assets/icons/clock-outline.svg').default,
  'close': require('../assets/icons/close.svg').default,
  'copy-filled': require('../assets/icons/copy-filled.svg').default,
  'copy-outline': require('../assets/icons/copy-outline.svg').default,
  'desc-approve': require('../assets/icons/desc-approve.svg').default,
  'desc-cart': require('../assets/icons/desc-cart.svg').default,
  'desc-cashback': require('../assets/icons/desc-cashback.svg').default,
  'desc-celebrate': require('../assets/icons/desc-celebrate.svg').default,
  'desc-confirm': require('../assets/icons/desc-confirm.svg').default,
  'desc-confirmed': require('../assets/icons/desc-confirmed.svg').default,
  'desc-cross': require('../assets/icons/desc-cross.svg').default,
  'desc-exclamation': require('../assets/icons/desc-exclamation.svg').default,
  'desc-missingcashback': require('../assets/icons/desc-missingcashback.svg').default,
  'desc-paid': require('../assets/icons/desc-paid.svg').default,
  'desc-pending': require('../assets/icons/desc-pending.svg').default,
  'desc-pendingcash': require('../assets/icons/desc-pendingcash.svg').default,
  'desc-replacement': require('../assets/icons/desc-replacement.svg').default,
  'desc-rewards': require('../assets/icons/desc-rewards.svg').default,
  'desc-right': require('../assets/icons/desc-right.svg').default,
  'desc-timeline': require('../assets/icons/desc-timeline.svg').default,
  'desc-withdraw': require('../assets/icons/desc-withdraw.svg').default,
  'desc-withdrawcash': require('../assets/icons/desc-withdrawcash.svg').default,
  'edit-filled': require('../assets/icons/edit-filled.svg').default,
  'edit-outline': require('../assets/icons/edit-outline.svg').default,
  'feat-bank-filled': require('../assets/icons/feat-bank-filled.svg').default,
  'feat-bank-outline': require('../assets/icons/feat-bank-outline.svg').default,
  'feat-celebration-filled': require('../assets/icons/feat-celebration-filled.svg').default,
  'feat-celebration-outline': require('../assets/icons/feat-celebration-outline.svg').default,
  'feat-daily-outline': require('../assets/icons/feat-daily-outline.svg').default,
  'feat-dining-filled': require('../assets/icons/feat-dining-filled.svg').default,
  'feat-dining-outline': require('../assets/icons/feat-dining-outline.svg').default,
  'feat-discount-filled': require('../assets/icons/feat-discount-filled.svg').default,
  'feat-discount-outline': require('../assets/icons/feat-discount-outline.svg').default,
  'feat-dot-filled': require('../assets/icons/feat-dot-filled.svg').default,
  'feat-dot-outline': require('../assets/icons/feat-dot-outline.svg').default,
  'feat-fuel-filled': require('../assets/icons/feat-fuel-filled.svg').default,
  'feat-fuel-outline': require('../assets/icons/feat-fuel-outline.svg').default,
  'feat-lounge-filled': require('../assets/icons/feat-lounge-filled.svg').default,
  'feat-lounge-outline': require('../assets/icons/feat-lounge-outline.svg').default,
  'feat-mobile-recharge-filled': require('../assets/icons/feat-mobile-recharge-filled.svg').default,
  'feat-mobile-recharge-outline': require('../assets/icons/feat-mobile-recharge-outline.svg').default,
  'feat-rewards-filled': require('../assets/icons/feat-rewards-filled.svg').default,
  'feat-rewards-outline': require('../assets/icons/feat-rewards-outline.svg').default,
  'feat-savings-filled': require('../assets/icons/feat-savings-filled.svg').default,
  'feat-savings-outline': require('../assets/icons/feat-savings-outline.svg').default,
  'feat-sparkle-filled': require('../assets/icons/feat-sparkle-filled.svg').default,
  'feat-sparkle-outline': require('../assets/icons/feat-sparkle-outline.svg').default,
  'feat-travel-filled': require('../assets/icons/feat-travel-filled.svg').default,
  'feat-travel-outline': require('../assets/icons/feat-travel-outline.svg').default,
  'filter-filled': require('../assets/icons/filter-filled.svg').default,
  'filter-outline': require('../assets/icons/filter-outline.svg').default,
  'filter-sliders': require('../assets/icons/filter-sliders.svg').default,
  'flipkart': require('../assets/icons/flipkart.svg').default,
  'headset-filled': require('../assets/icons/headset-filled.svg').default,
  'headset-outline': require('../assets/icons/headset-outline.svg').default,
  'message-filled': require('../assets/icons/message-filled.svg').default,
  'message-outline': require('../assets/icons/message-outline.svg').default,
  'nav-cards-filled': require('../assets/icons/nav-cards-filled.svg').default,
  'nav-cards-outline': require('../assets/icons/nav-cards-outline.svg').default,
  'nav-earnings-filled': require('../assets/icons/nav-earnings-filled.svg').default,
  'nav-earnings-outline': require('../assets/icons/nav-earnings-outline.svg').default,
  'nav-home-filled': require('../assets/icons/nav-home-filled.svg').default,
  'nav-home-outline': require('../assets/icons/nav-home-outline.svg').default,
  'nav-offers-filled': require('../assets/icons/nav-offers-filled.svg').default,
  'nav-offers-outline': require('../assets/icons/nav-offers-outline.svg').default,
  'nav-profile-filled': require('../assets/icons/nav-profile-filled.svg').default,
  'nav-profile-outline': require('../assets/icons/nav-profile-outline.svg').default,
  'pay-amazon': require('../assets/icons/pay-amazon.svg').default,
  'pay-bank-transfer': require('../assets/icons/pay-bank-transfer.svg').default,
  'pay-combined': require('../assets/icons/pay-combined.svg').default,
  'pay-flipkart': require('../assets/icons/pay-flipkart.svg').default,
  'pay-UPI': require('../assets/icons/pay-UPI.svg').default,
  'phone-off-filled': require('../assets/icons/phone-off-filled.svg').default,
  'phone-off-outline': require('../assets/icons/phone-off-outline.svg').default,
  'search-outline': require('../assets/icons/search-outline.svg').default,
  'social-app-outline': require('../assets/icons/social-app-outline.svg').default,
  'social-facebook-filled': require('../assets/icons/social-facebook-filled.svg').default,
  'social-facebook-outline': require('../assets/icons/social-facebook-outline.svg').default,
  'social-instagram-filled': require('../assets/icons/social-instagram-filled.svg').default,
  'social-instagram-outline': require('../assets/icons/social-instagram-outline.svg').default,
  'social-whatsapp-filled': require('../assets/icons/social-whatsapp-filled.svg').default,
  'social-whatsapp-outline': require('../assets/icons/social-whatsapp-outline.svg').default,
  'sofa-outline': require('../assets/icons/sofa-outline.svg').default,
  'star-filled': require('../assets/icons/star-filled.svg').default,
  'star-outline': require('../assets/icons/star-outline.svg').default,
  'wallet-filled': require('../assets/icons/wallet-filled.svg').default,
  'wallet-outline': require('../assets/icons/wallet-outline.svg').default,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

/** Every available icon name, alphabetical (mirrors the registry). */
export const ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[];

export interface IconProps {
  name: IconName;
  /** Edge length in px. Default = iconSize[20] (20). */
  size?: number;
  /** Tint applied via `currentColor`. Only affects icons whose default
   *  stroke/fill was remapped (see svgr.config.js). Nav and desc icons
   *  keep their baked colours. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  name,
  size = iconSize[20],
  color = colors.text.primary,
  style,
}: IconProps) {
  const Svg = ICON_REGISTRY[name];
  if (!Svg) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`<Icon /> received unknown name: "${name}"`);
    }
    return null;
  }
  return <Svg width={size} height={size} color={color} style={style} />;
}
