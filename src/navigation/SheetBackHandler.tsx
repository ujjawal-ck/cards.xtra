/**
 * SheetBackHandler — Android hardware/gesture Back closes the top-most open
 * bottom sheet instead of navigating (or quitting the app).
 *
 * Before this, Back with any @gorhom BottomSheetModal open (login sheet,
 * Filters, Eligibility, card detail, …) fell through to React Navigation,
 * which popped the screen underneath or — on a root screen — exited the app.
 *
 * Renders nothing. Mount once inside BottomSheetModalProvider AND
 * NavigationContainer (see App.js).
 *
 * Ordering: Android calls Back listeners newest-first. NavigationContainer
 * registers its listener in its own mount effect, which runs AFTER its
 * children's effects — so this component registers on the next tick to end up
 * newer, i.e. asked first. It returns false when no sheet is open, letting
 * navigation handle Back as usual.
 */
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

export function SheetBackHandler() {
  const { dismiss } = useBottomSheetModal();

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    const timer = setTimeout(() => {
      // dismiss() closes the most recently presented sheet still open and
      // returns true; false when none is open.
      sub = BackHandler.addEventListener('hardwareBackPress', () => dismiss());
    }, 0);
    return () => {
      clearTimeout(timer);
      sub?.remove();
    };
  }, [dismiss]);

  return null;
}
