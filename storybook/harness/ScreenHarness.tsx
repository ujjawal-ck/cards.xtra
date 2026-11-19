/**
 * ScreenHarness — renders one real app screen the way App.js does, minus the network.
 * Providers mirror App.js: QueryClient (the app singleton, cleared per story), Auth,
 * SafeArea, BottomSheetModal, Navigation (independent container), LoginSheet.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, createNavigationContainerRef, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { queryClient } from '../../src/query/queryClient';
import { AuthProvider } from '../../src/auth/AuthContext';
import { LoginSheetProvider } from '../../src/auth/LoginSheetProvider';
import { installApiMock, type ApiParams } from './apiMock';

const Stack = createNativeStackNavigator();

export interface ScreenHarnessProps {
  name: string;
  component: React.ComponentType<any>;
  params?: Record<string, unknown>;
  api?: ApiParams;
  /** Phone frame width in dp. */
  width?: number;
}

export function ScreenHarness({ name, component, params, api, width = 390 }: ScreenHarnessProps) {
  const navRef = useMemo(() => createNavigationContainerRef<any>(), []);
  useMemo(() => { queryClient.clear(); installApiMock(api); }, [api]);
  return (
    <View style={{ width, height: 844, overflow: 'hidden', alignSelf: 'center' }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationIndependentTree>
            <NavigationContainer ref={navRef}>
              <LoginSheetProvider navigationRef={navRef as any}>
                <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
                  <Stack.Screen name={name} component={component} initialParams={params as any} />
                </Stack.Navigator>
              </LoginSheetProvider>
            </NavigationContainer>
          </NavigationIndependentTree>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}
