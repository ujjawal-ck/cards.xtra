/**
 * BottomSheet — organism (Figma 3834:42043)
 *
 * @gorhom/bottom-sheet modal. White surface, 24-px top corners. Pure
 * composition: BottomSheetHeader (handle + title + stroke) at the top,
 * BottomSheetBody (template-driven) inside a BottomSheetScrollView,
 * optional FooterButtons sticky at the bottom via BottomSheetFooter.
 *
 * Snap points ['58%', '96%']. Scroll-to-expand is handled
 * automatically by BottomSheetScrollView — drag up from the lower
 * snap and the sheet expands; drag down at the top of the scroll and
 * it collapses (the Blinkit / Zomato pattern, same as CardDetailSheet).
 *
 * @gorhom's default handle is hidden (`handleComponent={() => null}`)
 * — BottomSheetHeader owns the visual handle per spec.
 *
 * Token mapping:
 *   #ffffff   → colors.surface.default
 *   24 radius → radius['2xl']
 */
import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../tokens';
import { BottomSheetHeader } from './BottomSheetHeader';
import { BottomSheetBody } from './BottomSheetBody';
import { play } from '../lib/haptics';
import type {
  BottomSheetBodyProps,
  BottomSheetTemplate,
} from './BottomSheetBody';
import { FooterButtons } from './FooterButtons';
import type { FooterButtonsProps } from './FooterButtons';

export interface BottomSheetProps {
  title?: string;
  showStroke?: boolean;
  template: BottomSheetTemplate;
  /** Pass-through data for the body template (image, sections, etc.). */
  bodyProps?: Omit<BottomSheetBodyProps, 'template'>;
  /** When true, renders a sticky FooterButtons at the bottom of the sheet. */
  footer?: boolean;
  footerProps?: FooterButtonsProps;
}

// Headroom under the scroll view content so it isn't covered by the
// sticky footer when one is rendered. A FooterButtons single@44 is
// ~72 tall (padV 14 + button 44); add safe-area for notched devices.
const FOOTER_AREA_RESERVE = spacing[96];

// Minimum body height for ANY sheet — short content (e.g. a 2-line offer
// detail) still opens to a comfortable card rather than a thin sliver.
// Content taller than this grows the sheet as usual.
const MIN_SHEET_CONTENT_H = 360;

export const BottomSheet = forwardRef<BottomSheetModal, BottomSheetProps>(
  function BottomSheet(
    {
      title,
      showStroke,
      template,
      bodyProps,
      footer = false,
      footerProps,
    },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ['58%', '96%'], []);

    // Expand / minimise haptics. Fire only on snap transitions BETWEEN open
    // positions (e.g. 58% ⇄ 96%) — not on the initial open (−1→0, the opener
    // already gave feedback) or on close (→ −1).
    const lastIndex = useRef(0);
    const handleSheetChange = useCallback((index: number) => {
      const prev = lastIndex.current;
      if (index > prev && index > 0) play('sheetExpand');
      else if (index >= 0 && index < prev) play('sheetCollapse');
      lastIndex.current = index;
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => {
        if (!footer || !footerProps) return null;
        return (
          // bottomInset 0 pins FooterButtons FLUSH to the sheet's
          // bottom edge — no gap above the home indicator. Safe-area
          // padding is folded into FooterButtons' own paddingBottom
          // below so the CTA stays tappable on notched devices.
          <BottomSheetFooter {...props} bottomInset={0}>
            <FooterButtons
              {...footerProps}
              style={{ paddingBottom: insets.bottom }}
            />
          </BottomSheetFooter>
        );
      },
      [footer, footerProps, insets.bottom]
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        footerComponent={footer ? renderFooter : undefined}
        // Hide @gorhom's default handle — BottomSheetHeader renders
        // the visual handle per Figma spec.
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.surface.default,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingBottom: footer ? FOOTER_AREA_RESERVE : 0,
            minHeight: MIN_SHEET_CONTENT_H,
          }}
          showsVerticalScrollIndicator={false}
        >
          {title || showStroke ? (
            <BottomSheetHeader title={title} showStroke={showStroke} />
          ) : null}
          <BottomSheetBody template={template} {...bodyProps} />
          {/* Tiny safe area at the very bottom so the last item isn't
              flush with the curved edge when there's no footer. */}
          {!footer ? <View style={{ height: insets.bottom }} /> : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
