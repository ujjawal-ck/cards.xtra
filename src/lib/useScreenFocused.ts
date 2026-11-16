/**
 * useScreenFocused — true while the screen that renders the caller is focused.
 *
 * Tab screens stay mounted when you switch tabs, so a looping timer on Home
 * (the promo carousel, the rolling search placeholder) kept firing while the
 * user was on Offers or Profile, waking the JS thread and running animations
 * nobody could see. Gate those loops on this hook.
 *
 * Safe outside a navigator (Storybook, FoundationCheck, portals): with no
 * navigation context it always returns true, so nothing stops animating there.
 */
import { useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';

export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return focused;
}
