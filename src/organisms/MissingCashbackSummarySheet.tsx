/**
 * MissingCashbackSummarySheet — Figma 4129:23775
 * ("Ticket ID" detail sheet for an "Others" raised ticket).
 *
 * Opened from the Others tab's "View" link. Content-hugging gorhom sheet:
 * grabber → "Ticket ID: <id>" heading + "Raised on <date>" subtitle → a grouped
 * detail card (divider-separated label/value rows + a status badge) → a primary
 * "Okay, got it" button. Pure composition: Text + Divider + StatusBadge + Button.
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {
  BottomSheetModal as BottomSheetModalRef,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Button, Divider, StatusBadge } from '../atoms';
import { colors, spacing, radius } from '../tokens';
import type { OthersClaimCard } from '../api/missingCashbackMapper';

/** Divider-separated "label … value" row; value right-aligned, wraps if long. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[16],
          paddingVertical: spacing[12],
        }}
      >
        <Text variant="body14Regular" color={colors.text.secondary}>
          {label}
        </Text>
        <Text variant="body14SemiBold" color={colors.text.primary} align="right" style={{ flex: 1 }}>
          {value}
        </Text>
      </View>
      <Divider style="solid" />
    </View>
  );
}

export interface MissingCashbackSummarySheetProps {
  card: OthersClaimCard | null;
}

export const MissingCashbackSummarySheet = forwardRef<
  BottomSheetModalRef,
  MissingCashbackSummarySheetProps
>(function MissingCashbackSummarySheet({ card }, ref) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModalRef>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModalRef);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleComponent={() => null}
      backgroundStyle={{
        backgroundColor: colors.surface.default,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: spacing[20],
          paddingTop: spacing[12],
          paddingBottom: insets.bottom + spacing[24],
          gap: spacing[20],
        }}
      >
        {/* Grabber */}
        <View
          style={{
            alignSelf: 'center',
            width: spacing[40],
            height: spacing[4],
            borderRadius: radius.xs,
            backgroundColor: colors.border.default,
          }}
        />

        {card ? (
          <>
            {/* Heading + raise date */}
            <View style={{ gap: spacing[4] }}>
              <Text variant="heading20Bold" color={colors.text.primary}>
                Ticket ID: {card.ticketId}
              </Text>
              <Text variant="body12Regular" color={colors.text.secondary}>
                Raised on {card.date}
              </Text>
            </View>

            {/* Detail card */}
            <View
              style={{
                backgroundColor: colors.background.muted,
                borderRadius: radius.lg,
                paddingHorizontal: spacing[16],
              }}
            >
              <Row label="Merchant Name" value={card.retailer} />
              <Row label="Transaction Amount" value={card.orderAmount} />
              <Row label="Transaction Reference" value={card.orderReference} />
              <Row label="Details" value={card.orderReference} />
              <Row label="Date of Status Update" value={card.statusUpdateDate} />
              {/* Status — badge, no trailing divider */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing[16],
                  paddingVertical: spacing[12],
                }}
              >
                <Text variant="body14Regular" color={colors.text.secondary}>
                  Status
                </Text>
                <StatusBadge status={card.statusTone} size="pill" label={card.statusLabel} />
              </View>
            </View>
          </>
        ) : null}

        <Button
          label="Okay, got it"
          variant="solid"
          tone="second"
          size={52}
          fullWidth
          onPress={() => sheetRef.current?.dismiss()}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export type MissingCashbackSummarySheetRef = BottomSheetModalRef;
