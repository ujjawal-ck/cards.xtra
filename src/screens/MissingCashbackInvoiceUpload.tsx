/**
 * MissingCashbackInvoiceUpload — C1-"Other" / C2 groups: upload invoice
 * screenshot(s) → raise a ticket.
 *
 * NOT a standalone Figma frame (the attachment uploader lives only inside the
 * feedback form), so built on-brand from the component library + tokens; the
 * allowed-types/size caption matches the Figma uploader spec
 * (.jpg/.png/.jpeg/.pdf/.bmp, 2MB). Picks images via expo-image-picker.
 *
 * On submit: raiseTicket(exitDate, storeId, exitId, ticketData, files) →
 * MissingCashbackTicketSuccess. Hydrates a missing exit_id from the queue item
 * if needed (mirrors the prototype's pre-flight hydration).
 *
 * Imports: Header, Text, Button (atoms); expo-image-picker; actions hook.
 */
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, radius, borderWidth, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import { useMissingCashbackActions } from '../query/useMissingCashback';
import type { McTicketFile } from '../api/missingCashback';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackInvoiceUpload'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackInvoiceUpload'>;

const THUMB = 84;

function PlusGlyph({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MissingCashbackInvoiceUpload() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { raiseTicket, getItem, refreshClaims } = useMissingCashbackActions();

  const [files, setFiles] = useState<McTicketFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an invoice screenshot.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (res.canceled) return;
    const picked: McTicketFile[] = res.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName || `invoice_${Date.now()}_${i}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }));
    setFiles((prev) => [...prev, ...picked]);
    setError(null);
  };

  const removeAt = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please add at least one invoice screenshot.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Resolve the fields the ticket endpoint needs; hydrate exit_id/store_id
      // from the queue item if the draft is missing them.
      let { exitId, storeId, exitDate, orderId, orderAmount, queueId } = draft;
      if ((!exitId || !storeId) && queueId) {
        const claim = await getItem(queueId);
        if (claim) {
          exitId = exitId || claim.attributes.exit_id;
          storeId = storeId || (claim.attributes.store_id != null ? String(claim.attributes.store_id) : '');
          orderId = orderId || claim.attributes.order_id;
          orderAmount = orderAmount || claim.attributes.order_amount;
          exitDate = exitDate || claim.attributes.click_date;
        }
      }
      const cleanDate = (exitDate || '').slice(0, 10);
      if (!cleanDate || !exitId || !storeId || !orderId) {
        setError('Could not prepare the ticket. Please retry from your claims list.');
        setSubmitting(false);
        return;
      }
      const total = Number.parseFloat(String(orderAmount || '0')) || 0;
      const response = await raiseTicket(
        cleanDate,
        storeId,
        exitId,
        {
          transaction_id: orderId,
          transaction_details: orderId,
          total_amount_paid: total > 0 ? total : undefined,
          missing_txn_queue_id: queueId ? Number.parseInt(queueId, 10) : undefined,
          query_type: draft.group === 'C1' ? 'Other Category' : 'Missing Cashback',
          query_sub_type: 'Missing Cashback',
        },
        files,
      );
      analytics.track(Events.MISSING_CASHBACK_SUBMIT, {
        group: draft.group,
        kind: 'ticket',
        file_count: files.length,
      });
      refreshClaims();
      const ticketId = response?.data?.id || response?.data?.attributes?.ticket_id;
      navigation.navigate('MissingCashbackTicketSuccess', { ticketId: ticketId ? String(ticketId) : undefined });
    } catch (e) {
      setError((e as Error)?.message || 'Failed to upload the invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Header leading="back" title="Did You Shop?" onLeadingPress={() => navigation.goBack()} />

          <ScrollView contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}>
            <View style={{ gap: spacing[8] }}>
              <Text variant="body16Bold" color={colors.text.primary}>
                Upload your invoice
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                {`Add a screenshot of your ${draft.storeName} order invoice so we can verify and track your cashback.`}
              </Text>
            </View>

            {/* Upload drop-zone */}
            <Pressable
              accessibilityRole="button"
              onPress={pick}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing[8],
                paddingVertical: spacing[32],
                borderRadius: radius.lg,
                borderWidth: borderWidth.thick,
                borderColor: colors.border.default,
                borderStyle: 'dashed',
                backgroundColor: colors.background.muted,
              }}
            >
              <PlusGlyph color={colors.action.accent.default} />
              <Text variant="body14SemiBold" color={colors.action.accent.default}>
                Add screenshot
              </Text>
              <Text variant="body12Regular" color={colors.text.secondary}>
                Allowed: .jpg, .png, .jpeg, .pdf, .bmp · Max 2MB
              </Text>
            </Pressable>

            {/* Thumbnails */}
            {files.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
                {files.map((f, i) => (
                  <View key={`${f.uri}-${i}`} style={{ width: THUMB, height: THUMB }}>
                    <Image
                      source={{ uri: f.uri }}
                      style={{ width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: colors.background.muted }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => removeAt(i)}
                      hitSlop={spacing[8]}
                      style={{
                        position: 'absolute',
                        top: -spacing[4],
                        right: -spacing[4],
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.text.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="body12SemiBold" color={colors.text.inverse}>
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text variant="body12SemiBold" color={colors.feedback.error.default}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              {
                backgroundColor: colors.surface.default,
                paddingTop: spacing[8],
                paddingBottom: spacing[16],
                paddingHorizontal: spacing[16],
              },
              elevation.light.up,
            ]}
          >
            <Button
              label="Submit"
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              loading={submitting}
              disabled={submitting || files.length === 0}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
