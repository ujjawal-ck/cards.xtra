/**
 * Sheet hosts for the flow stories. Not a story file.
 * Copies of the hosts HomeScreen uses (src/screens/HomeScreen.tsx:2745) so a plain content
 * organism (EligibleSheet, MaybeSheet, IneligibleSheet, FilterMenu) can show in a gorhom modal.
 */
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFooter, BottomSheetScrollView, type BottomSheetBackdropProps, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { colors, radius } from '../../../src/tokens';

const backdrop = (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />;
const background = { backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] };

/** One snap point, scroll view, no handle: the Home result sheets. */
export const ResultHost = forwardRef<BottomSheetModal, { snap?: string; children: React.ReactNode }>(function ResultHost({ snap = '90%', children }, ref) {
  return (
    <BottomSheetModal ref={ref} snapPoints={[snap]} enablePanDownToClose backdropComponent={backdrop} handleComponent={() => null} backgroundStyle={background}>
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>{children}</BottomSheetScrollView>
    </BottomSheetModal>
  );
});

/** Filters host, as Home does it: 70% snap, sticky header, menu, sticky footer. */
export const FilterHost = forwardRef<BottomSheetModal, { footer?: React.ReactNode; children: React.ReactNode }>(function FilterHost({ footer, children }, ref) {
  const renderFooter = React.useCallback((props: BottomSheetFooterProps) => <BottomSheetFooter {...props} bottomInset={0}>{footer}</BottomSheetFooter>, [footer]);
  return (
    <BottomSheetModal ref={ref} snapPoints={['70%']} enableDynamicSizing={false} enablePanDownToClose backdropComponent={backdrop} footerComponent={footer ? renderFooter : undefined} handleComponent={() => null} backgroundStyle={background}>
      <View style={{ flex: 1 }}>
        <BottomSheetHeader title="Filters" showStroke />
        {children}
      </View>
    </BottomSheetModal>
  );
});
