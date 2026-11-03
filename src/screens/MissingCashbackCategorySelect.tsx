/**
 * MissingCashbackCategorySelect — C1 group, post-submit category step.
 *
 * NOT in the Figma (the C1 "category varies" flow was never drawn as a screen),
 * so built on-brand from the component library + tokens. Content is the
 * prototype's CATEGORY_OPTIONS_C1 (Mobile Recharge / not-eligible bundle /
 * All other categories).
 *
 * Behaviour (mirrors the web prototype's handleC1CategorySubmit):
 *   • "All other categories" (value "Other Category") → invoice upload → ticket.
 *   • Any other category → PUT /queue category → result (tracked / queued).
 *
 * Imports: Header, Text, Button (atoms); useMissingCashbackActions; mapper.
 */
import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Button } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing, radius, borderWidth, elevation } from '../tokens';
import { analytics, Events } from '../analytics';
import { useMissingCashbackActions } from '../query/useMissingCashback';
import { CATEGORY_OPTIONS_C1, decideSubmitOutcome } from '../api/missingCashbackMapper';
import { resultParamsFromOutcome } from './missingCashbackResultParams';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MissingCashbackCategorySelect'>;
type Rt = RouteProp<RootStackParamList, 'MissingCashbackCategorySelect'>;

export function MissingCashbackCategorySelect() {
  const navigation = useNavigation<Nav>();
  const { draft } = useRoute<Rt>().params;
  const { update, refreshClaims } = useMissingCashbackActions();

  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) {
      setError('Please select a category.');
      return;
    }
    // "Other Category" → invoice upload (ticket flow); never a PUT.
    if (selected === 'Other Category') {
      navigation.navigate('MissingCashbackInvoiceUpload', { draft });
      return;
    }
    if (!draft.queueId) {
      setError('Missing claim reference. Please retry from your claims list.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await update(draft.queueId, { category: selected });
      analytics.track(Events.MISSING_CASHBACK_SUBMIT, { group: draft.group, kind: 'category' });
      refreshClaims();
      navigation.navigate('MissingCashbackResult', resultParamsFromOutcome(decideSubmitOutcome(res, draft.group)));
    } catch (e) {
      setError((e as Error)?.message || 'Could not update the category. Please try again.');
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
                {`What did you buy on ${draft.storeName}?`}
              </Text>
              <Text variant="body14Regular" color={colors.text.secondary}>
                Your cashback rate depends on the category you shopped in.
              </Text>
            </View>

            <View style={{ gap: spacing[12] }}>
              {CATEGORY_OPTIONS_C1.map((opt) => {
                const isSel = selected === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSel }}
                    onPress={() => setSelected(opt.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: spacing[12],
                      padding: spacing[16],
                      borderRadius: radius.lg,
                      borderWidth: isSel ? borderWidth.thick : borderWidth.thin,
                      borderColor: isSel ? colors.action.accent.default : colors.border.default,
                      backgroundColor: colors.surface.default,
                    }}
                  >
                    {/* radio */}
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: borderWidth.thick,
                        borderColor: isSel ? colors.action.accent.default : colors.border.default,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: spacing[2],
                      }}
                    >
                      {isSel ? (
                        <View
                          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.action.accent.default }}
                        />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, gap: spacing[4] }}>
                      <Text variant="body14SemiBold" color={colors.text.primary}>
                        {opt.label}
                      </Text>
                      <Text variant="body12Regular" color={colors.text.secondary}>
                        {opt.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

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
              label={selected === 'Other Category' ? 'Continue' : 'Submit'}
              variant="solid"
              tone="second"
              size={52}
              fullWidth
              loading={submitting}
              disabled={submitting}
              onPress={handleContinue}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
