/**
 * FooterButtons — organism (Figma 3707:36416)
 *
 * Sticky bottom action bar. Pure composition — every button is the
 * Button atom, every strip is the existing molecule. No new
 * primitives.
 *
 * Container:
 *   vertical, full-width, bg colors.surface.default
 *   shadow='on'  → elevation.light.up (#000 @ 10%, y=-4, blur=16 —
 *                  exact match to spec; negative-Y because the bar
 *                  sits at the bottom of the screen and the shadow
 *                  rises above it)
 *   shadow='off' → no shadow
 *
 * Optional `strip` slot ABOVE the action row:
 *   'caption' → <StripAlert layout="center" text={stripText} />
 *   'tnc'     → <TermsAndConditions placement="sticky" checked="none"
 *                  label={stripText} linkLabels={['Terms','Privacy Policy']} />
 *   'none'    → nothing
 *
 * Action row geometry:
 *   horizontal, gap spacing[12], paddingHorizontal spacing[16],
 *   paddingVertical spacing[14]. Lands at 72px (size=44 + 28) or
 *   80px (size=52 + 28) total — matches Figma.
 *
 * Buttons:
 *   'single'       → one full-width solid button
 *   'dual'         → outline (hug) + solid (fill remaining)
 *   'dual-outline' → both outline, second one fills remaining
 *
 * Colour → primary Button tone:
 *   'main'   → tone='main'   (saffron primary)
 *   'second' → tone='second' (cobalt primary)
 *   'mixed'  → tone='main'   (saffron primary alongside the outline secondary,
 *                              whose label colour is the cobalt-700 from
 *                              the Button atom's outline palette)
 *
 * Hex → token:
 *   #ffffff → colors.surface.default
 *   shadow stops → elevation.light.up
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../atoms';
import type { ButtonIcon, IconName } from '../atoms';
import { StripAlert, TermsAndConditions } from '../molecules';
import type { ToneName } from '../tokens';
import {
  colors,
  radius,
  spacing,
  elevation,
} from '../tokens';

// Continuous L→R shine sweep on the primary CTA (same nudge as the credit-
// card Apply Now bar). Soft white band that crosses the button, pauses, repeats.
const SHIMMER_BAND_W = 110;
const SHIMMER_SWEEP_MS = 1500;
const SHIMMER_PAUSE_MS = 1500;

export type FooterButtonsLayout = 'single' | 'dual' | 'dual-outline';
export type FooterButtonsSize = 44 | 52;
export type FooterButtonsColor = 'main' | 'second' | 'mixed';
export type FooterButtonsShadow = 'on' | 'off';
export type FooterButtonsStrip = 'none' | 'caption' | 'tnc';

export interface FooterButtonsProps {
  buttons: FooterButtonsLayout;
  size?: FooterButtonsSize;
  shadow?: FooterButtonsShadow;
  strip?: FooterButtonsStrip;
  color?: FooterButtonsColor;
  primaryLabel: string;
  secondaryLabel?: string;
  stripText?: string;
  /** Tone of the 'caption' strip. Default 'info' (cobalt). */
  stripTone?: ToneName;
  /** Checkbox state for strip='tnc'. */
  tncChecked?: boolean;
  /** Fired when the T&C checkbox toggles. */
  onTncToggle?: (next: boolean) => void;
  /** Substrings in `stripText` to render as cobalt links (strip='tnc').
   *  Default ['Terms', 'Privacy Policy']. */
  stripLinkLabels?: string[];
  /** Fired when a strip link is tapped (strip='tnc'). */
  onStripLinkPress?: (label: string) => void;
  /** Optional icon on the PRIMARY button (forwarded to the Button atom).
   *  e.g. icon='trailing' + iconName='chevron-right' for a "go" affordance
   *  on a click-out CTA. Default 'none'. */
  primaryIcon?: ButtonIcon;
  primaryIconName?: IconName;
  /** Disable the primary button (greyed, non-tappable). Forwarded to the
   *  Button atom's own disabled handling. */
  primaryDisabled?: boolean;
  /** Show a spinner on the primary button (also blocks taps). */
  primaryLoading?: boolean;
  /** Run a continuous L→R shine across the primary button — the same
   *  attention nudge as the credit-card "Apply Now" CTA. Single layout only.
   *  Default false. */
  shine?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ROW_PAD_V = spacing[14];
const ROW_PAD_H = spacing[16];
const ROW_GAP = spacing[12];

export function FooterButtons({
  buttons,
  size = 44,
  shadow = 'on',
  strip = 'none',
  color = 'main',
  primaryLabel,
  secondaryLabel = 'Cancel',
  stripText,
  stripTone = 'info',
  tncChecked = false,
  onTncToggle,
  stripLinkLabels = ['Terms', 'Privacy Policy'],
  onStripLinkPress,
  primaryIcon = 'none',
  primaryIconName,
  primaryDisabled = false,
  primaryLoading = false,
  shine = false,
  onPrimary,
  onSecondary,
  style,
}: FooterButtonsProps) {
  // Tone resolution per spec:
  //   'main'   → both buttons saffron (Color=Main)
  //   'second' → both cobalt (Color=Second)
  //   'mixed'  → secondary cobalt + primary saffron (Dual only)
  const primaryTone = color === 'second' ? 'second' : 'main';
  const secondaryTone = color === 'main' ? 'main' : 'second';

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
        },
        shadow === 'on' ? elevation.light.up : null,
        style,
      ]}
    >
      {/* Optional strip above the action row */}
      {strip === 'caption' && stripText ? (
        <StripAlert tone={stripTone} layout="center" text={stripText} />
      ) : null}
      {strip === 'tnc' && stripText ? (
        // Real checkbox + multi-line body, default placement (FooterButtons
        // already provides its own bg/shadow, so we don't want the
        // sticky variant's extra top border + lift on top of that).
        <TermsAndConditions
          checked={tncChecked}
          onChange={onTncToggle}
          label={stripText}
          linkLabels={stripLinkLabels}
          onPressLink={onStripLinkPress}
          body="multi-line"
          placement="default"
        />
      ) : null}

      {/* Action row */}
      <View
        style={{
          flexDirection: 'row',
          gap: ROW_GAP,
          paddingHorizontal: ROW_PAD_H,
          paddingVertical: ROW_PAD_V,
        }}
      >
        {buttons === 'single' ? (
          // One full-width solid button (flex:1 wrapper so the Button's
          // fullWidth alignSelf:stretch fills the row's main-axis). The
          // wrapper clips an optional shine sweep to the button's rounded rect.
          <View
            style={{ flex: 1, borderRadius: radius.lg, overflow: shine ? 'hidden' : 'visible' }}
          >
            <Button
              label={primaryLabel}
              variant="solid"
              tone={primaryTone}
              size={size}
              fullWidth
              icon={primaryIcon}
              iconName={primaryIconName}
              disabled={primaryDisabled}
              loading={primaryLoading}
              onPress={onPrimary}
            />
            {shine && !primaryDisabled && !primaryLoading ? (
              <PrimaryShine />
            ) : null}
          </View>
        ) : null}

        {buttons === 'dual' ? (
          <>
            <Button
              label={secondaryLabel}
              variant="outline"
              tone={secondaryTone}
              size={size}
              onPress={onSecondary}
            />
            <View style={{ flex: 1 }}>
              <Button
                label={primaryLabel}
                variant="solid"
                tone={primaryTone}
                size={size}
                fullWidth
                onPress={onPrimary}
              />
            </View>
          </>
        ) : null}

        {buttons === 'dual-outline' ? (
          <>
            <Button
              label={secondaryLabel}
              variant="outline"
              tone={secondaryTone}
              size={size}
              onPress={onSecondary}
            />
            <View style={{ flex: 1 }}>
              <Button
                label={primaryLabel}
                variant="outline"
                tone={primaryTone}
                size={size}
                fullWidth
                onPress={onPrimary}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// PrimaryShine — the sweeping white highlight over the primary CTA. Same
// motion as the credit-card Apply-Now bar, extracted here so the store-page
// click-out CTA nudges identically. Self-contained: measures its own width,
// loops forever, and is pointer-transparent so taps still reach the Button.
// ----------------------------------------------------------------------------
function PrimaryShine() {
  const [w, setW] = useState(0);
  const progress = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (w <= 0) return;
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SHIMMER_SWEEP_MS, easing: Easing.out(Easing.cubic) }),
        withDelay(SHIMMER_PAUSE_MS, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [w, progress]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-SHIMMER_BAND_W, w + SHIMMER_BAND_W],
          Extrapolation.CLAMP
        ),
      },
    ] as unknown as { translateX: number }[],
  }));

  return (
    <View
      onLayout={onLayout}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
    >
      {w > 0 ? (
        <Animated.View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, width: SHIMMER_BAND_W },
            bandStyle,
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
