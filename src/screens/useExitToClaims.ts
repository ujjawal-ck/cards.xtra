/**
 * useExitToClaims — leaving a missing-cashback RESULT screen (ticket raised /
 * claim submitted / tracked) returns to the claims list, never to the form
 * that was just submitted. Header back, Android back and "Continue" all use
 * it; plain goBack() used to land on the filled-in form, inviting duplicate
 * tickets.
 */
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';

export function useExitToClaims() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // popTo drops every screen above the existing claims list (the form steps);
  // if the list isn't in the stack it is pushed instead.
  const exit = useCallback(() => {
    navigation.popTo('MissingCashbackDidYouShop', { backTo: 'back' });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        exit();
        return true;
      });
      return () => sub.remove();
    }, [exit])
  );

  return exit;
}
