import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import { primitives } from '../../src/tokens/colors';

// Light, Saffron-led theme that matches the Cards.xtra tokens. Values come from src/tokens.
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Cards.xtra design system',
    colorPrimary: primitives.saffron[500],
    colorSecondary: primitives.saffron[500],
    appBg: primitives.slate[100],
    appContentBg: primitives.slate[50],
    appBorderColor: primitives.slate[250],
    textColor: primitives.slate[900],
    textMutedColor: primitives.slate[700],
    barBg: primitives.slate[50],
    fontBase: '"Outfit", system-ui, sans-serif',
    fontCode: 'ui-monospace, monospace',
  }),
  sidebar: { showRoots: true },
});
