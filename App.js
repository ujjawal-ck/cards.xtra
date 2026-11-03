// App entry. Order matters:
//   1. gesture-handler import MUST be the first line (per CLAUDE.md).
//   2. Outfit fonts are loaded before anything renders (typography tokens
//      reference Outfit_400Regular … Outfit_800ExtraBold by name).
//   3. Provider order: GestureHandlerRootView -> SafeAreaProvider ->
//      BottomSheetModalProvider -> NavigationContainer. This is what
//      @gorhom/bottom-sheet v5 needs so the CardDetailSheet works on Home.
import 'react-native-gesture-handler';

import React from 'react';
import { View, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';

import Constants from 'expo-constants';

import { colors } from './src/tokens';
import { queryClient } from './src/query/queryClient';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { analytics, Events } from './src/analytics';
import { STAGE, PLATFORM, configProblems } from './src/config/env';
import { initExperiments } from './src/experiments';

// Super-props ride on EVERY event — set once, before anything is tracked.
analytics.setSuperProps({ platform: PLATFORM, stage: STAGE });

// Firebase Analytics (GA4) is a NATIVE module — it exists only in an EAS
// dev/prod build, never in Expo Go ('storeClient'). Gate the require so Expo
// Go keeps running on the console sink alone (importing it there would crash).
// Same pattern as Rive. In a real build, events fan out to GA4 automatically.
if (Constants.executionEnvironment !== 'storeClient') {
  try {
    // Lazy require so Metro never evaluates the native module under Expo Go.
    require('./src/analytics/ga4Sink').registerGa4Sink();
  } catch (e) {
    // Missing config / not yet built — fall back to console sink, never crash.
    console.warn('GA4 sink not registered:', e?.message ?? e);
  }
  try {
    // Crash reports + analytics breadcrumbs (Firebase Crashlytics).
    const crash = require('./src/analytics/crashlyticsSink');
    crash.registerCrashlyticsSink();
    // A response that stops matching its contract becomes a non-fatal,
    // tagged with the endpoint and failing fields (never the payload).
    require('./src/api/schemas/validate').setContractReporter((v) =>
      crash.recordError(new Error(`API contract drift: ${v.endpoint}`), v.issues.join(' | ')),
    );
    // Failures we recover from (fallback data) still get counted.
    require('./src/api/http/report').setHandledErrorReporter((err, context) =>
      crash.recordError(err, `handled: ${context}`),
    );
  } catch (e) {
    console.warn('Crashlytics not registered:', e?.message ?? e);
  }
}

// Catch a misconfigured build (empty API host/key for this stage) at launch,
// not when a user first hits a broken screen.
const problems = configProblems();
if (problems.length) {
  console.warn(`[config] ${problems.join('; ')}`);
  if (Constants.executionEnvironment !== 'storeClient') {
    try {
      require('./src/analytics/crashlyticsSink').recordError(new Error(`Config: ${problems.join('; ')}`), 'startup config');
    } catch {
      // crash reporting unavailable: the console warning above is enough
    }
  }
}

// A/B flags (Firebase Remote Config). Non-blocking: defaults apply until the
// fetch lands, and Expo Go just uses defaults.
initExperiments();

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  // Bridge React Native's AppState into React Query's focusManager so that
  // returning to the app from the background refetches the active queries
  // (refetchOnWindowFocus). Without this, RN has no "window focus" signal and
  // data would only refresh on a full restart. Per-screen re-entry is handled
  // separately by useRefetchOnFocus.
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  // Navigation ref drives automatic screen_view tracking — one hook covers
  // every screen in the app, no per-screen wiring needed.
  const navRef = useNavigationContainerRef();
  const currentRouteName = React.useRef(undefined);

  const handleReady = React.useCallback(() => {
    analytics.track(Events.APP_OPEN);
    const route = navRef.getCurrentRoute();
    if (route) {
      currentRouteName.current = route.name;
      analytics.track(Events.SCREEN_VIEW, {
        screen_name: route.name,
        screen_class: route.name,
      });
    }
  }, [navRef]);

  const handleStateChange = React.useCallback(() => {
    const route = navRef.getCurrentRoute();
    const next = route?.name;
    if (next && next !== currentRouteName.current) {
      currentRouteName.current = next;
      analytics.track(Events.SCREEN_VIEW, {
        screen_name: next,
        screen_class: next,
      });
    }
  }, [navRef]);

  // Loading guard — keep the screen on the brand background until Outfit is
  // ready, so we never show a flash of system-font text.
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.default }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <NavigationContainer
                ref={navRef}
                onReady={handleReady}
                onStateChange={handleStateChange}
              >
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
