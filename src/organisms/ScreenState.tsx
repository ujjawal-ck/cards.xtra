/**
 * ScreenState — the one empty / error / no-results block for every screen.
 *
 * Figma section 27 pattern ("Connection lost" 4367:243565, "Something didn't
 * go as planned" 4367:243459, "No matching results" 4367:243584):
 *   illustration (optional) → Heading/18/SemiBold → Body/14/Regular secondary
 *   → optional accent button (44 tall).
 *
 * Replaces the ad-hoc one-line texts ("Couldn't load offers. Pull to retry.",
 * "No orders yet.", "Cashbacks being tracked show up here.") that each screen
 * styled differently and that offered no way forward.
 */
import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { Text, Button } from '../atoms';
import { colors, spacing } from '../tokens';

// Figma "Image/ScreenState" renders at 156 × 156.
const ILLUSTRATION = 156;

export interface ScreenStateProps {
  image?: ImageSourcePropType;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ScreenState({
  image,
  title,
  body,
  actionLabel,
  onAction,
  style,
}: ScreenStateProps) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingHorizontal: spacing[24],
          paddingVertical: spacing[32],
          gap: spacing[16],
        },
        style,
      ]}
    >
      {image ? (
        <Image
          source={image}
          style={{ width: ILLUSTRATION, height: ILLUSTRATION }}
          resizeMode="contain"
        />
      ) : null}
      <View style={{ alignItems: 'center', gap: spacing[4] }}>
        <Text variant="heading18SemiBold" color={colors.text.primary} align="center">
          {title}
        </Text>
        {body ? (
          <Text variant="body14Regular" color={colors.text.secondary} align="center">
            {body}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="solid"
          tone="second"
          size={44}
          onPress={onAction}
          // Centred under the copy (the Button atom defaults to flex-start).
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}
