/**
 * Shared withdraw building blocks — the payment-method row + card and the
 * two inline glyphs, used by both the method-select screen and the
 * gift-card chooser. Extracted so the two screens render identical rows.
 *
 * MethodRow: 48×48 bordered icon container + Body/15/Medium label +
 * chevron-right, the whole row tappable. The existing ListRow molecule's
 * `thumbnail-key-chevron` expects an Image (not an SVG inside a bordered
 * box), so the row is composed here from the Icon atom + Text + an inline
 * chevron drawn via react-native-svg.
 */
import React from 'react';
import { View, Pressable, Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text, Icon, Divider } from '../../atoms';
import type { IconName } from '../../atoms';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
  mediaSize,
  elevation,
} from '../../tokens';

// 48 × 48 thumbnail container — Figma fixed.
const METHOD_THUMB = 48;
const METHOD_THUMB_PAD = 10;
// Info-circle glyph drawn inline — `info-circle` SVG doesn't ship.
const INFO_GLYPH = 18;

/** Info-circle outline + i-bar, tinted via `color`. */
export function InfoCircleGlyph({ color }: { color: string }) {
  return (
    <Svg width={INFO_GLYPH} height={INFO_GLYPH} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={7.5} stroke={color} strokeWidth={borderWidth.thick} />
      <Path d="M9 8v5" stroke={color} strokeWidth={borderWidth.heavy} strokeLinecap="round" />
      <Circle cx={9} cy={5.5} r={1} fill={color} />
    </Svg>
  );
}

// Brand logos extracted from the pay-* SVGs (their embedded-PNG <pattern>
// fills don't render in react-native-svg). Composed below as two circles.
const LOGO_AMAZON = require('../../assets/icons/logo-amazon.png');
const LOGO_FLIPKART = require('../../assets/icons/logo-flipkart.png');

/**
 * Amazon / Flipkart gift-card glyph — two white bordered circles, each with a
 * brand logo, slightly overlapping (matches the Figma combined mark). Built
 * from raster logos because the equivalent SVGs use embedded-PNG patterns
 * that react-native-svg renders incorrectly.
 */
export function GiftCardGlyph() {
  const CIRCLE = 20; // diameter of each brand circle
  const LOGO = 12; // logo edge inside the circle
  const OVERLAP = 4; // how much the circles overlap

  const circle = {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.subtle3,
    backgroundColor: colors.surface.default,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={circle}>
        <Image
          source={LOGO_AMAZON}
          style={{ width: LOGO, height: LOGO }}
          resizeMode="contain"
        />
      </View>
      <View style={[circle, { marginLeft: -OVERLAP }]}>
        <Image
          source={LOGO_FLIPKART}
          style={{ width: LOGO, height: LOGO }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

/** Chevron-right caret, tinted via `color`. */
export function ChevronRightGlyph({ color }: { color: string }) {
  const s = iconSize[24];
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={borderWidth.heavy}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface MethodRowItem {
  /** SVG glyph from the Icon registry. Ignored when `image` is set. */
  icon?: IconName;
  /** PNG/raster thumbnail (require'd asset). Takes precedence over `icon` —
   *  used for brand/method art that ships as a bitmap, not an SVG. */
  image?: ImageSourcePropType;
  /** Custom node rendered inside the thumbnail box. Highest precedence —
   *  used for composed art like the Amazon/Flipkart two-circle glyph. */
  glyph?: React.ReactNode;
  /** Optional edge length for the SVG `icon`. Defaults to mediaSize[32].
   *  Used to fine-tune art whose intrinsic padding differs (e.g. bank
   *  transfer rendered smaller). */
  iconSize?: number;
  label: string;
  /** Tap handler — opens the next step of the chosen withdraw method. */
  onPress?: () => void;
  /** Not available yet: rendered muted with this note (e.g. "Coming soon")
   *  and no chevron, and not tappable — so it no longer looks like a
   *  working option that silently does nothing. */
  unavailableNote?: string;
}

export function MethodRow({ item }: { item: MethodRowItem }) {
  const unavailable = !!item.unavailableNote;
  return (
    <Pressable
      onPress={unavailable ? undefined : item.onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={unavailable ? `${item.label}, ${item.unavailableNote}` : item.label}
      accessibilityState={{ disabled: unavailable }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[8],
        opacity: pressed && !unavailable ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          flex: 1,
        }}
      >
        {/* 48 × 48 thumbnail — white surface, hairline border, radius.sm */}
        <View
          style={{
            width: METHOD_THUMB,
            height: METHOD_THUMB,
            borderRadius: radius.sm,
            borderWidth: borderWidth.thin,
            borderColor: colors.border.subtle3,
            backgroundColor: colors.surface.default,
            padding: METHOD_THUMB_PAD,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Bitmap thumbnail (bank-transfer / gift-card art) renders via
              <Image>; SVG glyphs via <Icon>. pay-* SVGs ship with baked
              brand colours, so `color` is a no-op for them. */}
          {item.glyph ? (
            item.glyph
          ) : item.image ? (
            <Image
              source={item.image}
              style={{ width: mediaSize[32], height: mediaSize[32] }}
              resizeMode="contain"
            />
          ) : item.icon ? (
            <Icon
              name={item.icon}
              size={item.iconSize ?? mediaSize[32]}
              color={colors.text.primary}
            />
          ) : null}
        </View>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text
            variant="body15Medium"
            color={unavailable ? colors.text.disabled : colors.text.primary}
          >
            {item.label}
          </Text>
          {unavailable ? (
            <Text variant="body12Regular" color={colors.text.disabled}>
              {item.unavailableNote}
            </Text>
          ) : null}
        </View>
      </View>
      {unavailable ? null : <ChevronRightGlyph color={colors.text.secondary} />}
    </Pressable>
  );
}

export function MethodCard({ rows }: { rows: MethodRowItem[] }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          paddingLeft: spacing[12],
          paddingRight: spacing[8],
          paddingVertical: spacing[12],
          gap: spacing[8],
        },
        // light.xs — soft ambient lift (low Android elevation) instead of the
        // harsher light.sm drop shadow, so the method tiles read calmly.
        elevation.light.xs,
      ]}
    >
      {rows.map((r, i) => (
        <React.Fragment key={r.label}>
          <MethodRow item={r} />
          {i < rows.length - 1 ? <Divider style="solid" /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}
