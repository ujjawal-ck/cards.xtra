/**
 * colors.ts — Primitive + semantic color tokens
 *
 * SOURCE OF TRUTH: extracted directly from the mini-app Figma file's
 * native Variables (collections: "primitives" and "semantics").
 *
 * Two layers, exactly mirroring Figma:
 *   1. primitives — raw palette (Saffron, Cobalt, Slate, ...). Never used
 *      directly in components.
 *   2. semantic — meaning-based tokens (action.primary, text.primary, ...)
 *      that REFERENCE primitives. Components only ever use these.
 *
 * To re-theme the whole app, change a semantic mapping here — every
 * component updates automatically.
 */

// ----------------------------------------------------------------------------
// 1. PRIMITIVES (raw palette — do not use directly in components)
// ----------------------------------------------------------------------------
export const primitives = {
  saffron: {
    50: '#fff4eb', 100: '#fff4eb', 200: '#ffe6d6', 300: '#ffc299',
    400: '#ff8540', 500: '#ff6d1d', 600: '#e55a0e', 700: '#b84507',
    800: '#8a3404', 900: '#5c2202', 1000: '#3d1601',
  },
  cobalt: {
    50: '#ebf0ff', 100: '#dce5fe', 150: '#d3ddf9', 200: '#aec3fd',
    300: '#4d93e9', 400: '#4670f6', 450: '#0064e0', 500: '#0741ef',
    600: '#0635c0', 700: '#0036da', 800: '#082275', 900: '#181655',
    1000: '#0a0f36',
  },
  slate: {
    50: '#ffffff', 100: '#f8f8f8', 150: '#f5f7f9', 200: '#eeeeee',
    250: '#e7e7e7', 300: '#dddce7', 350: '#d9e3ec', 400: '#d9d9d9',
    500: '#c4c4c4', 600: '#878787', 700: '#5c5c5c', 800: '#414141',
    900: '#262626', 1000: '#000000',
  },
  fern: {
    50: '#edfbf8', 100: '#daf6e3', 200: '#a5d9b5', 300: '#47dbba',
    400: '#50b900', 500: '#26a651', 600: '#1e8c44', 700: '#1a7a39',
    800: '#125a2a', 900: '#0f4920', 1000: '#072e14',
  },
  amber: {
    50: '#fff8e1', 100: '#ffefb7', 200: '#ffe079', 300: '#fed624',
    400: '#fecf2d', 500: '#feca3a', 600: '#d9a100', 700: '#7d4100',
    800: '#5c3000', 900: '#3a2000', 1000: '#1f1100',
  },
  ruby: {
    50: '#fef1f1', 100: '#fcdada', 200: '#f58f8f', 300: '#ff3535',
    400: '#eb4335', 500: '#d41000', 600: '#b80e00', 700: '#a00c00',
    800: '#7a0900', 900: '#5c0700', 1000: '#3a0400',
  },
  rose: {
    50: '#fef2f6', 100: '#fad3e2', 200: '#f5afc8', 300: '#f08aad',
    400: '#e66492', 500: '#da2760', 600: '#b53160', 700: '#8f2549',
    800: '#6b1b36', 900: '#4a1224', 1000: '#2d0815',
  },
  violet: {
    50: '#f3eefd', 100: '#e5d9fb', 200: '#c9b0f4', 300: '#ac85ed',
    400: '#8a54e7', 500: '#6f3ad8', 600: '#5a2db8', 700: '#4724a0',
    800: '#341b7d', 900: '#231054', 1000: '#13072e',
  },
  sky: {
    50: '#edfbff', 100: '#d0f2fa', 200: '#a6e2f4', 300: '#71d2ef',
    400: '#3fb8d8', 500: '#1e96b8', 600: '#177591', 700: '#125a70',
    800: '#0d404f', 900: '#082630', 1000: '#041218',
  },
  // Transparent overlays (rgba)
  transparentBlack: {
    8: 'rgba(0,0,0,0.08)', 12: 'rgba(0,0,0,0.12)', 16: 'rgba(0,0,0,0.16)',
    24: 'rgba(0,0,0,0.24)', 32: 'rgba(0,0,0,0.32)', 40: 'rgba(0,0,0,0.40)',
    50: 'rgba(0,0,0,0.50)', 80: 'rgba(0,0,0,0.80)',
  },
  transparentWhite: {
    8: 'rgba(255,255,255,0.08)', 12: 'rgba(255,255,255,0.12)',
    16: 'rgba(255,255,255,0.16)', 24: 'rgba(255,255,255,0.24)',
    32: 'rgba(255,255,255,0.32)', 40: 'rgba(255,255,255,0.40)',
    50: 'rgba(255,255,255,0.50)', 80: 'rgba(255,255,255,0.80)',
  },
} as const;

// ----------------------------------------------------------------------------
// 2. SEMANTIC TOKENS (use THESE in components — never the primitives above)
// ----------------------------------------------------------------------------
export const colors = {
  background: {
    default: primitives.slate[50],
    sunken: '#fcfcfd',
    emphasis: primitives.saffron[50],
    muted: primitives.slate[150],
    lavender: primitives.cobalt[50],
  },
  surface: {
    default: primitives.slate[50],
    default2: '#fcfcfd',
    emphasis: primitives.saffron[50],
    sunken: primitives.slate[150],
    sunken2: primitives.cobalt[50],
    inverse: primitives.slate[900],
    dark: primitives.slate[1000],
    alert: primitives.ruby[50],
  },
  border: {
    default: primitives.slate[350],
    subtle: primitives.slate[300],
    subtle2: primitives.cobalt[100],
    subtle3: primitives.slate[200],
    strong: primitives.slate[400],
    focussed: primitives.cobalt[500],
    inverse: primitives.slate[50],
    /** Accent blue border (#4670f6 ≈ Figma #4170ff). Used for outlined
     *  surfaces over dark hero backdrops (e.g. earnings stat cards). */
    accent: primitives.cobalt[400],
  },
  text: {
    primary: primitives.slate[900],
    secondary: primitives.slate[700],
    tertiary: primitives.slate[600],
    placeholder: primitives.slate[600],
    disabled: primitives.slate[500],
    inverse: primitives.slate[50],
    onColor: primitives.slate[50],
    link: primitives.cobalt[700],
    linkHover: primitives.cobalt[800],
    /** Muted slate-blue for masthead titles (Figma 3037:256).
     *  No primitive matches exactly; inlined here as a one-off
     *  semantic so the component stays off raw hex. */
    mastheadTitle: '#4a5475',
  },
  action: {
    primary: {
      default: primitives.saffron[500],
      hover: primitives.saffron[600],
      pressed: primitives.saffron[700],
      disabled: primitives.slate[300],
      subtle: primitives.saffron[50],
      border: '#eeddd3',
      text: primitives.slate[50],
    },
    secondary: {
      default: primitives.cobalt[50],
      hover: primitives.cobalt[100],
      pressed: primitives.cobalt[200],
      disabled: primitives.slate[200],
      border: primitives.cobalt[150],
      text: primitives.cobalt[700],
    },
    tertiary: {
      default: primitives.slate[50],
      hover: primitives.saffron[50],
      pressed: primitives.saffron[100],
      disabled: primitives.slate[300],
      border: primitives.saffron[400],
      text: primitives.saffron[700],
    },
    accent: {
      default: primitives.cobalt[500],
      hover: primitives.cobalt[600],
      pressed: primitives.cobalt[700],
      disabled: primitives.slate[300],
      text: primitives.slate[50],
    },
    destructive: {
      default: primitives.ruby[500],
      hover: primitives.ruby[700],
      pressed: primitives.ruby[900],
      disabled: primitives.slate[300],
      text: primitives.slate[50],
    },
    tabular: {
      active: primitives.slate[900],
      inactive: primitives.slate[50],
      textActive: primitives.slate[50],
      textInactive: primitives.slate[900],
    },
  },
  feedback: {
    success: {
      default: primitives.fern[500], hover: primitives.fern[700],
      subtle: primitives.fern[50], text: primitives.fern[700],
      border: primitives.fern[300], onColor: primitives.fern[50],
    },
    warning: {
      default: primitives.amber[300], hover: primitives.amber[600],
      subtle: primitives.amber[50], text: primitives.amber[900],
      border: primitives.amber[500], onColor: primitives.amber[900],
    },
    error: {
      default: primitives.ruby[500], hover: primitives.ruby[700],
      subtle: primitives.ruby[50], text: primitives.ruby[700],
      border: primitives.ruby[300], onColor: primitives.ruby[50],
    },
    info: {
      default: primitives.cobalt[500], hover: primitives.cobalt[700],
      subtle: primitives.cobalt[50], text: primitives.cobalt[700],
      border: primitives.cobalt[300], onColor: primitives.cobalt[50],
    },
  },
  cashback: {
    default: primitives.saffron[500],
    onColor: primitives.slate[50],
    subtle: primitives.saffron[50],
  },
  promotional: {
    rubyRed: primitives.rose[500],
    violet: primitives.violet[400],
    violetBg: primitives.violet[50],
    skyBg: primitives.sky[50],
    fernBg: primitives.fern[50],
  },
  icon: {
    actions: primitives.slate[900],
    features: primitives.slate[600],
    disabled: primitives.slate[500],
    inverse: primitives.slate[50],
    trending: primitives.fern[400],
    brand: primitives.cobalt[500],
    danger: primitives.ruby[500],
    success: primitives.fern[500],
    warning: primitives.amber[500],
    info: primitives.cobalt[300],
  },
  // ---------------------------------------------------------------------------
  // Chip — component-specific shades not covered elsewhere in the
  // semantic layer (consumed by src/atoms/Chip).
  // ---------------------------------------------------------------------------
  chip: {
    /** Border on the 'default' filter chip in its selected state.
     *  Pairs with background.emphasis (saffron[50]) as the fill. */
    selectedBorder: primitives.saffron[200],
  },
  // ---------------------------------------------------------------------------
  // Tones — semantic colour bundles used by feedback components
  // (Toast, InlineMessage). 9 tones from the Figma "semantic tones"
  // variable collection. Each tone exposes the four shades the
  // components need:
  //   bg       — solid surface (filled chips, etc.)
  //   bgSubtle — pale surface (default container fill)
  //   text     — readable foreground on either bg (used for label + icon tint)
  //   border   — 1px stroke around the container
  // ---------------------------------------------------------------------------
  tones: {
    brand: {
      bg: primitives.saffron[50],
      bgSubtle: primitives.saffron[50],
      text: primitives.saffron[700],
      border: primitives.saffron[200],
    },
    gray: {
      bg: primitives.slate[150],
      bgSubtle: primitives.slate[50],
      text: primitives.slate[700],
      border: primitives.slate[200],
    },
    success: {
      bg: primitives.fern[100],
      bgSubtle: primitives.fern[50],
      text: primitives.fern[700],
      border: primitives.fern[200],
    },
    warning: {
      bg: primitives.amber[100],
      bgSubtle: primitives.amber[50],
      text: primitives.amber[700],
      border: primitives.amber[200],
    },
    error: {
      bg: primitives.ruby[100],
      bgSubtle: primitives.ruby[50],
      text: primitives.ruby[500],
      border: primitives.ruby[200],
    },
    info: {
      bg: primitives.cobalt[100],
      bgSubtle: primitives.cobalt[50],
      text: primitives.cobalt[700],
      border: primitives.cobalt[200],
    },
    purple: {
      bg: primitives.violet[100],
      bgSubtle: primitives.violet[50],
      text: primitives.violet[700],
      border: primitives.violet[200],
    },
    sky: {
      bg: primitives.sky[100],
      bgSubtle: primitives.sky[50],
      text: primitives.sky[700],
      border: primitives.sky[200],
    },
    rose: {
      bg: primitives.rose[100],
      bgSubtle: primitives.rose[50],
      text: primitives.rose[700],
      border: primitives.rose[200],
    },
  },
  // ---------------------------------------------------------------------------
  // Divider — opacities for the 'text-count' style (consumed by
  // src/atoms/Divider). Wrap the transparentBlack primitives so the
  // component stays off the primitives layer.
  // ---------------------------------------------------------------------------
  divider: {
    /** Label + counter foreground for the 'text-count' style — black @ 40%. */
    textCountFg: primitives.transparentBlack[40],
    /** Starting stop of the 'text-count' fade line — black @ 24%, fades to transparent. */
    textCountFadeStart: primitives.transparentBlack[24],
  },
  // ---------------------------------------------------------------------------
  // Status — themed bg / dot / border per cashback lifecycle status
  // (consumed by src/atoms/StatusBadge, Figma set 3010:1106). Each shade
  // already existed in primitives; the semantic block lets components stay
  // off the primitives layer.
  // ---------------------------------------------------------------------------
  status: {
    requested: {
      bg: primitives.violet[100],
      dot: primitives.violet[500],
      border: primitives.violet[300],
    },
    pending: {
      bg: primitives.amber[100],
      dot: primitives.amber[500],
      border: primitives.amber[500],
    },
    delayed: {
      bg: primitives.saffron[200],
      dot: primitives.saffron[400],
      border: primitives.saffron[400],
    },
    cancelled: {
      bg: primitives.ruby[100],
      dot: primitives.ruby[500],
      border: primitives.ruby[500],
    },
    confirmed: {
      bg: primitives.fern[100],
      dot: primitives.fern[500],
      border: primitives.fern[500],
    },
    paid: {
      bg: primitives.cobalt[100],
      dot: primitives.cobalt[700],
      border: primitives.cobalt[500],
    },
    expired: {
      bg: primitives.slate[200],
      dot: primitives.slate[700],
      border: primitives.slate[600],
    },
  },
  // ---------------------------------------------------------------------------
  // Surface fade — gradient stops that dissolve a peach/hero backdrop into the
  // sheet body so a masthead BG melts into the content below instead of ending
  // on a hard horizontal edge. Same colour as surface.sunken
  // (slate[150] = #f5f7f9): one stop fully transparent → one fully opaque.
  // Consumed by src/organisms/CardDetailMasthead.
  // ---------------------------------------------------------------------------
  surfaceFade: {
    sunkenTransparent: 'rgba(245,247,249,0)',
    sunken: 'rgba(245,247,249,1)',
  },
  // ---------------------------------------------------------------------------
  // Payment-processing ETA pill — the "5 Min to 72 Hrs" badge overlapping the
  // wallet illustration on the Payment-Is-Processing sheet (Figma 2047:25405).
  // One-off decorative colours (amber gradient + teal ring) not in the palette;
  // text reuses the amber-700 primitive.
  // ---------------------------------------------------------------------------
  paymentProcessingPill: {
    gradientStart: '#ffc047',
    gradientEnd: '#f8b83c',
    border: '#51d0d2',
    text: primitives.amber[700],
  },
} as const;

/** Tone names — 9 semantic tone slots exposed by colors.tones. */
export type ToneName = keyof typeof colors.tones;
