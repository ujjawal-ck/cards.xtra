/**
 * DS-ADD(ds-expansion-1, 2026-11-17): the shell of one question per screen (back, StepProgress, skip, title, body slot, sticky footer).
 * 2026-11-18: optional onClose adds a close (x) action to the header row.
 * Rollback: delete this file and its DS-ADD export lines in src/organisms/index.ts.
 *
 * QuizStep — organism
 *
 * Header row: back, StepProgress ("2 of 6"), optional Skip. Then title + subtitle,
 * the body slot (scrolls), and the existing FooterButtons (single layout) pinned
 * at the bottom. The back arrow is the chevron-right glyph turned 180 degrees.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, Icon, StepProgress } from '../atoms';
import { FooterButtons } from './FooterButtons';
import { colors, spacing, iconSize, sizing } from '../tokens';

export interface QuizStepProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** When given, a close (x) action shows after Skip and leaves the quiz in one step. */
  onClose?: () => void;
  onSkip?: () => void;
  primary: { label: string; onPress: () => void; disabled?: boolean };
  children?: React.ReactNode;
}

export function QuizStep({ step, total, title, subtitle, onBack, onSkip, onClose, primary, children }: QuizStepProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[8],
        }}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: sizing.touchMin, height: sizing.touchMin, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon
            name="chevron-right"
            size={iconSize[24]}
            color={colors.icon.actions}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <StepProgress value={step} total={total} label={`Step ${step}`} />
        </View>
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            style={{ minHeight: sizing.touchMin, justifyContent: 'center' }}
          >
            <Text variant="body14SemiBold" color={colors.text.link}>
              Skip
            </Text>
          </Pressable>
        ) : null}
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ width: sizing.touchMin, height: sizing.touchMin, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={iconSize[24]} color={colors.icon.actions} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[16], gap: spacing[16] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing[4] }}>
          <Text variant="heading24Bold" color={colors.text.primary} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body14Regular" color={colors.text.secondary}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
      <FooterButtons
        buttons="single"
        primaryLabel={primary.label}
        primaryDisabled={primary.disabled}
        onPrimary={primary.onPress}
      />
    </View>
  );
}
