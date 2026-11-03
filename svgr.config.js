/**
 * SVGR config — controls how react-native-svg-transformer turns each .svg
 * into a React component.
 *
 * `replaceAttrValues` rewrites attribute values at build time. We rewrite the
 * default outline / fill colour (#262626 = slate-900, the most common baked
 * default in this icon set) to `currentColor` so the Icon atom's `color` prop
 * actually tints these icons.
 *
 * We intentionally do NOT remap brand / semantic colours (Saffron, Cobalt,
 * fern/ruby, etc.) — those carry meaning (success / cashback / danger) and
 * must not be theme-overridable on the icons that ship them baked.
 * `white` is also left alone so the nav-* icons keep their dark-pill design.
 */
module.exports = {
  replaceAttrValues: {
    '#262626': 'currentColor',
  },
};
