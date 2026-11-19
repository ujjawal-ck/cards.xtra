import React from 'react';
import type { Preview } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colors, primitives } from '../../src/tokens/colors';

function Providers({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1 }}>{children}</View>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** A "Proposed" ribbon on every story tagged `proposed`: designed here, not in the app. */
function ProposedRibbon({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: primitives.amber[50], borderColor: primitives.amber[600], borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 11, color: primitives.amber[700] }}>PROPOSED · not in app</Text>
      </View>
      {children}
    </View>
  );
}

const preview: Preview = {
  decorators: [
    (Story, ctx) => (
      <Providers>
        {ctx.tags.includes('proposed') ? <ProposedRibbon><Story /></ProposedRibbon> : <Story />}
      </Providers>
    ),
  ],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'app', values: [{ name: 'app', value: colors.background.default }, { name: 'muted', value: primitives.slate[150] }] },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Components', 'Patterns', 'Flows', '*'],
      },
    },
  },
};
export default preview;
