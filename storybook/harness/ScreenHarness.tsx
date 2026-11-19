/**
 * Harness components: render real app screens, components and sheets the way
 * App.js does, with NO network.
 *
 * Provider order copies App.js (fe-inventory 3.1):
 *   QueryClientProvider (app singleton) > AuthProvider > BottomSheetModalProvider
 *   > NavigationIndependentTree > NavigationContainer > LoginSheetProvider > navigator
 * (GestureHandlerRootView, SafeAreaProvider and fonts come from preview.tsx.)
 *
 * Setup runs ONCE per mount, in the render phase, before any child mounts:
 * reset module state, seed the secure store for `auth`, install the fetch mock.
 * Changing props after mount does not redo it; Storybook remounts on story change.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, NavigationIndependentTree, createNavigationContainerRef } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { queryClient } from '../../src/query/queryClient';
import { AuthProvider } from '../../src/auth/AuthContext';
import { LoginSheetProvider } from '../../src/auth/LoginSheetProvider';
import type { RootStackParamList } from '../../src/navigation/types';
import { colors } from '../../src/tokens/colors';
import type { ApiParams } from './apiMock';
import { prepareStory, type AuthSeed, type HarnessAuth } from './storyState';
import { createHarnessNavigator, type RouteName } from './navigation';

export const PHONE_WIDTH = 390;
export const PHONE_HEIGHT = 844;

// ── PhoneFrame ───────────────────────────────────────────────────────────────

export interface PhoneFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  /** Default colors.background.default. */
  background?: string;
  /**
   * Mount a BottomSheetModalProvider inside the frame, so gorhom sheets open
   * inside the 390x844 frame instead of the whole iframe. Default true.
   * The harness components pass false and mount their own provider BELOW
   * Query + Auth (sheet bodies render in a portal and call query/auth hooks).
   */
  sheets?: boolean;
  style?: ViewStyle;
}

/** A 390x844 phone-sized box for screens and for proposed layouts composed from DS parts. */
export function PhoneFrame({ children, width, height, background, sheets = true, style }: PhoneFrameProps) {
  // On a phone-sized canvas (a Storybook mobile viewport, or a real phone) fill it, so the
  // window the app measures and the frame are the same size. On a wide canvas use 390 x 844.
  const win = useWindowDimensions();
  const phoneCanvas = win.width <= 480;
  width = width ?? (phoneCanvas ? win.width : PHONE_WIDTH);
  height = height ?? (phoneCanvas ? win.height : PHONE_HEIGHT);
  return (
    <View
      style={[
        { width, height, overflow: 'hidden', alignSelf: 'center', backgroundColor: background ?? colors.background.default },
        style,
      ]}
    >
      {sheets ? <BottomSheetModalProvider>{children}</BottomSheetModalProvider> : children}
    </View>
  );
}

// ── Shared provider core ─────────────────────────────────────────────────────

interface CoreProps extends AuthSeed {
  api?: ApiParams;
  beforeMount?: () => void;
  name: string;
  component: React.ComponentType<any>;
  params?: object;
  children?: never;
}

function HarnessCore({ name, component, params, api, beforeMount, ...seed }: CoreProps) {
  const [{ Navigator, navRef }] = useState(() => {
    prepareStory({ ...seed, api, beforeMount });
    return {
      Navigator: createHarnessNavigator({ name, component, params }),
      navRef: createNavigationContainerRef<RootStackParamList>(),
    };
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BottomSheetModalProvider>
          <NavigationIndependentTree>
            <NavigationContainer ref={navRef}>
              <LoginSheetProvider navigationRef={navRef}>
                <Navigator />
              </LoginSheetProvider>
            </NavigationContainer>
          </NavigationIndependentTree>
        </BottomSheetModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ── ScreenHarness ────────────────────────────────────────────────────────────

export interface ScreenHarnessProps<N extends string = RouteName> extends AuthSeed {
  /** The app route name (src/navigation/types.ts). Tab and withdraw routes nest like in the app. */
  name: N;
  /** The real screen component from src/screens. */
  component: React.ComponentType<any>;
  /**
   * Route params (initialParams). Loose type; for a checked object use
   * routeParams('ToolResults', {...}) from storybook/harness.
   */
  params?: object;
  /** API answers. Build with `api.*` from storybook/fixtures. Default: every request fails loudly. */
  api?: ApiParams;
  /** 'guest' (default) | 'signedIn' | 'sessionExpired'. */
  auth?: HarnessAuth;
  /** Runs after the reset, before the screen mounts (e.g. seed getAdvisorSession()). */
  beforeMount?: () => void;
  width?: number;
  height?: number;
}

/**
 * One real screen in a 390x844 phone frame.
 * <ScreenHarness name="Earnings" component={EarningsScreen} auth="signedIn" api={api.ok()} />
 */
export function ScreenHarness<N extends string = RouteName>({ width, height, ...core }: ScreenHarnessProps<N>) {
  return (
    <PhoneFrame width={width} height={height} sheets={false}>
      <HarnessCore {...core} />
    </PhoneFrame>
  );
}

// ── ComponentHarness ─────────────────────────────────────────────────────────

const ChildrenContext = createContext<React.ReactNode>(null);

/** Module-level so its identity is stable: the children come through context, no remount on re-render. */
function ChildrenScreen() {
  return <>{useContext(ChildrenContext)}</>;
}

export interface ComponentHarnessProps extends AuthSeed {
  children: React.ReactNode;
  api?: ApiParams;
  auth?: HarnessAuth;
  beforeMount?: () => void;
  /**
   * Wrap in a PhoneFrame. Default true (390x844). The navigator fills its
   * parent, so with `frame={false}` the story must give the parent a size,
   * or the component renders 0 px tall.
   */
  frame?: boolean | { width?: number; height?: number };
}

/**
 * For one component that calls useNavigation, useQuery, useAuth or
 * useLoginSheet. Same providers and stub routes as ScreenHarness; the
 * children render as the "Component" route.
 */
export function ComponentHarness({ children, frame = true, ...core }: ComponentHarnessProps) {
  const body = (
    <ChildrenContext.Provider value={children}>
      <HarnessCore {...core} name="Component" component={ChildrenScreen} />
    </ChildrenContext.Provider>
  );
  if (!frame) return body;
  const size = typeof frame === 'object' ? frame : {};
  return <PhoneFrame sheets={false} width={size.width} height={size.height}>{body}</PhoneFrame>;
}

// ── SheetHarness ─────────────────────────────────────────────────────────────

/** Anything with present() (BottomSheetModal and the app's *SheetRef types). */
export interface PresentableRef {
  present: (...args: any[]) => void;
}

export interface SheetHarnessProps<T> extends AuthSeed {
  /** Render the sheet with this ref: {(ref) => <LogoutConfirmSheet ref={ref} onConfirm={...} />} */
  children: (ref: React.RefObject<T | null>) => React.ReactNode;
  /** Wait before present() (gorhom needs the provider mounted). Default 300 ms. */
  delayMs?: number;
  /** Custom open call, for a ref that has no present(). Default ref.current.present(). */
  open?: (ref: T) => void;
  /** What sits behind the sheet. Default: empty app background. */
  backdrop?: React.ReactNode;
  /**
   * Mount Query + Auth + Navigation + LoginSheet around the sheet (needed when
   * the sheet calls useAuth / useQuery / useNavigation). Default: true when
   * `api` or `auth` is set, else false (plain PhoneFrame).
   */
  providers?: boolean;
  api?: ApiParams;
  auth?: HarnessAuth;
  beforeMount?: () => void;
}

function SheetOpener<T>({ children, delayMs = 300, open, backdrop }: Pick<SheetHarnessProps<T>, 'children' | 'delayMs' | 'open' | 'backdrop'>) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = ref.current;
      if (!r) return;
      if (open) open(r);
      else (r as unknown as PresentableRef).present?.();
    }, delayMs);
    return () => clearTimeout(t);
  }, [delayMs, open]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      {backdrop}
      {children(ref)}
    </View>
  );
}

/**
 * A gorhom sheet presented on mount inside a 390x844 frame.
 * <SheetHarness>{(ref) => <LogoutConfirmSheet ref={ref} onConfirm={() => {}} />}</SheetHarness>
 * Use parameters.layout 'fullscreen' or 'centered' on the story.
 */
export function SheetHarness<T = PresentableRef>({ children, delayMs, open, backdrop, providers, ...core }: SheetHarnessProps<T>) {
  const opener = <SheetOpener<T> delayMs={delayMs} open={open} backdrop={backdrop}>{children}</SheetOpener>;
  const wantProviders = providers ?? (core.api !== undefined || core.auth !== undefined);
  if (!wantProviders) return <PhoneFrame>{opener}</PhoneFrame>;
  return (
    <PhoneFrame sheets={false}>
      <ComponentHarness {...core} frame={false}>{opener}</ComponentHarness>
    </PhoneFrame>
  );
}
