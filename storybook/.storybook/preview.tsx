import React from 'react';
import type { Preview } from '@storybook/react-native-web-vite';
import { View, Text, BackHandler, Alert } from 'react-native';

// Android back button does not exist on web; react-native-web logs an error on every use.
(BackHandler as any).addEventListener = () => ({ remove() {} });
(BackHandler as any).removeEventListener = () => {};

// react-native-web's Alert.alert does nothing, so money-failure dialogs would be invisible.
// Draw the native dialog as a plain DOM overlay: title, message, buttons. Tapping a button runs its onPress.
(Alert as any).alert = (title: string, message?: string, buttons?: { text?: string; onPress?: () => void; style?: string }[]) => {
  console.info('[storybook] Alert', title, message ?? '');
  const doc = document;
  doc.getElementById('sb-alert')?.remove();
  const scrim = doc.createElement('div');
  scrim.id = 'sb-alert';
  Object.assign(scrim.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '9999', fontFamily: 'Outfit, system-ui, sans-serif' });
  const box = doc.createElement('div');
  Object.assign(box.style, { width: '280px', background: primitives.slate[50], borderRadius: '14px', padding: '20px 20px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' });
  const h = doc.createElement('div'); h.textContent = title; Object.assign(h.style, { fontWeight: '700', fontSize: '17px', color: primitives.slate[900], marginBottom: '6px' });
  const m = doc.createElement('div'); m.textContent = message ?? ''; Object.assign(m.style, { fontSize: '14px', lineHeight: '1.4', color: primitives.slate[800], marginBottom: '12px' });
  const row = doc.createElement('div'); Object.assign(row.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px' });
  (buttons?.length ? buttons : [{ text: 'OK' }]).forEach((b) => {
    const btn = doc.createElement('button'); btn.textContent = b.text ?? 'OK';
    Object.assign(btn.style, { border: '0', background: 'transparent', color: b.style === 'destructive' ? primitives.ruby[500] : primitives.cobalt[700], fontWeight: '600', fontSize: '15px', padding: '10px 8px', cursor: 'pointer', fontFamily: 'inherit' });
    btn.onclick = () => { scrim.remove(); b.onPress?.(); };
    row.appendChild(btn);
  });
  box.append(h, m, row); scrim.appendChild(box); doc.body.appendChild(scrim);
};
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

/** Removes a shimmed Alert left over from the previous story. */
function ClearAlert() {
  React.useEffect(() => { document.getElementById('sb-alert')?.remove(); }, []);
  return null;
}

// Phone sizes. Every story opens on a phone canvas, so the window the app measures is a phone.
const PHONES = {
  android360: { name: 'Android small (360 x 800)', styles: { width: '360px', height: '800px' }, type: 'mobile' },
  iphone390: { name: 'iPhone 14/15 (390 x 844)', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  android412: { name: 'Android (412 x 915)', styles: { width: '412px', height: '915px' }, type: 'mobile' },
  iphone430: { name: 'iPhone Pro Max (430 x 932)', styles: { width: '430px', height: '932px' }, type: 'mobile' },
};

const preview: Preview = {
  initialGlobals: { viewport: { value: 'iphone390', isRotated: false } },
  decorators: [
    (Story, ctx) => (
      <Providers key={ctx.id}>
        <ClearAlert />
        {ctx.tags.includes('proposed') ? <ProposedRibbon><Story /></ProposedRibbon> : <Story />}
      </Providers>
    ),
  ],
  parameters: {
    layout: 'centered',
    viewport: { options: PHONES },
    backgrounds: { default: 'app', values: [{ name: 'app', value: colors.background.default }, { name: 'muted', value: primitives.slate[150] }] },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Components', 'Patterns', 'Flows', '*'],
      },
    },
  },
};
export default preview;
