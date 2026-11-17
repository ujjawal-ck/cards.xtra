/**
 * index.ts — Token barrel.
 * Lets every component import from one place:
 *   import { colors, spacing, radius, typography } from '../../tokens';
 */
export { primitives, colors } from './colors';
export type { ToneName } from './colors';
export { spacing, radius, borderWidth, iconSize, avatarSize, mediaSize, sizing } from './spacing';
export { typography, fontFamily, fontSize, letterSpacing } from './typography';
export { gradients } from './gradients';
export { elevation } from './elevation';
export { opacity, alpha } from './opacity';
// DS-ADD(ds-expansion-1) start: motion tokens
export { motion } from './motion';
// DS-ADD(ds-expansion-1) end
