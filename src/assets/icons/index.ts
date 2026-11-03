/**
 * PNG icon registry — for raster icons that live under
 * src/assets/icons/ (the SVG icons live in src/atoms/Icon.tsx's
 * ICON_REGISTRY and are rendered via the <Icon /> atom).
 *
 * Why explicit require()s: Metro can only resolve `require()` when the
 * path is a string literal at the call site, so each file is listed.
 * Adding a PNG icon = drop the file in src/assets/icons/ and add one
 * line here. Consumers pass the value straight to <Image source={...} />.
 *
 * Keying convention: the raw filename minus extension (matches the
 * `feat-*` SVG naming convention), so callers can lookup by the same
 * key they'd use for the SVG analogue.
 *
 * Usage:
 *   import { icons } from '../assets/icons';
 *   <Image source={icons['feat-salaried']} ... />
 */
export const icons = {
  'feat-salaried': require('./feat-salaried.jpg'),
  'feat-self-employed': require('./feat-self-employed.jpg'),
} as const;

export type IconAssetKey = keyof typeof icons;
