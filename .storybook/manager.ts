import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'dark',
  brandTitle: 'Cards.xtra Design System',
  brandUrl: '#',

  // Brand accent = your saffron primary
  colorPrimary: '#ff6d1d',
  colorSecondary: '#ff6d1d',

  // App chrome
  appBg: '#0e0e10',
  appContentBg: '#1a1a1d',
  appPreviewBg: '#1a1a1d',
  appBorderColor: '#2a2a2e',
  appBorderRadius: 10,

  // Text
  textColor: '#f5f5f5',
  textInverseColor: '#1a1a1d',
  textMutedColor: '#9a9a9a',

  // Toolbar + sidebar
  barTextColor: '#9a9a9a',
  barSelectedColor: '#ff6d1d',
  barHoverColor: '#ff8540',
  barBg: '#0e0e10',

  // Inputs
  inputBg: '#1a1a1d',
  inputBorder: '#2a2a2e',
  inputTextColor: '#f5f5f5',
  inputBorderRadius: 8,

  fontBase: '"Outfit", system-ui, sans-serif',
});

addons.setConfig({
  theme,
  panelPosition: 'right',          // <-- controls panel on the RIGHT, like you remember
  showToolbar: true,
  sidebar: { showRoots: true },
});