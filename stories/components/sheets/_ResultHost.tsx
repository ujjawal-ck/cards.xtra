/**
 * Hosts a plain content component (EligibleSheet, MaybeSheet, IneligibleSheet) in a gorhom modal,
 * as HomeScreen does (src/screens/HomeScreen.tsx:2745): one snap point, scroll view, no handle.
 */
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFooter, BottomSheetScrollView, type BottomSheetBackdropProps, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheetHeader } from '../../../src/organisms/BottomSheetHeader';
import { colors, radius } from '../../../src/tokens';

const backdrop = (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />;

export const ResultHost = forwardRef<BottomSheetModal, { snap?: string; children: React.ReactNode }>(function ResultHost({ snap = '90%', children }, ref) {
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={[snap]}
      enablePanDownToClose
      backdropComponent={backdrop}
      handleComponent={() => null}
      backgroundStyle={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] }}
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>{children}</BottomSheetScrollView>
    </BottomSheetModal>
  );
});

/** Filters host, as HomeScreen and OrdersList do it: 70% snap, sticky header, menu, sticky footer. */
export const FilterHost = forwardRef<BottomSheetModal, { footer?: React.ReactNode; children: React.ReactNode }>(function FilterHost({ footer, children }, ref) {
  const renderFooter = React.useCallback((props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props} bottomInset={0}>{footer}</BottomSheetFooter>
  ), [footer]);
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={backdrop}
      footerComponent={footer ? renderFooter : undefined}
      handleComponent={() => null}
      backgroundStyle={{ backgroundColor: colors.surface.default, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] }}
    >
      <View style={{ flex: 1 }}>
        <BottomSheetHeader title="Filters" showStroke />
        {children}
      </View>
    </BottomSheetModal>
  );
});
