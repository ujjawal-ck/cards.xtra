import React from 'react';
import type { Preview, Decorator } from '@storybook/react';
import { View } from 'react-native';

// Self-host Outfit to match the app's bundled font metrics as closely as web allows
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  * { -webkit-font-smoothing: antialiased; }
`;

const withFrame: Decorator = (Story) => (
  <>
    <style>{fontStyle}</style>
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 0',
      }}
    >
      {/* 390px = iPhone logical width, so layout matches the phone's column width */}
      <View style={{ width: 390, alignItems: 'stretch' }}>
        <Story />
      </View>
    </div>
  </>
);

const preview: Preview = {
  decorators: [withFrame],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f5f7f9' },   // your surface.sunken
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1d' },
      ],
    },
    options: {
      storySort: {
        order: ['Foundations', 'Atoms', 'Molecules', 'Organisms'],
      },
    },
  },
};

export default preview;