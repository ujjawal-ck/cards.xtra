/**
 * AmountActionRow — molecule (Figma earnings/landing 4878:48463)
 *
 * Single-row card with an icon, a caption + value text stack on the
 * left, and a trailing <Button> on the right. None of the existing
 * <ListRow> types fit because none combine the 48-px icon slot with
 * a trailing CTA; built as its own molecule per spec.
 *
 * Composition:
 *   - <Icon> atom for SVG glyphs (iconName) — covers desc-withdrawcash,
 *     desc-pendingcash, etc.
 *   - <Image> for PNG sources (iconSource) — falls back path for raster
 *     icons not in the SVG registry.
 *   - <Text> atom (caption + value).
 *   - <Button> atom for the trailing CTA — caller passes label / variant /
 *     tone / onPress.
 *
 * Layout (matches Figma):
 *   card: bg surface.default, radius.lg (12), padding spacing[12],
 *         elevation.light.xs (#000 6% y1 blur2), flexDirection row,
 *         alignItems center, justifyContent space-between, width 328
 *         (or fluid via the `style` prop).
 *   left: row, gap = 10 px (raw, not on the spacing scale — see note),
 *         alignItems center.
 *     icon container: 48 × 48 (mediaSize[48] / Icon/48), radius.sm (8),
 *         center the Icon/Image inside.
 *     text stack: gap spacing[4], align start.
 *       caption: body12Regular text.primary
 *       value:   body16Bold     text.primary
 *   right: <Button size={36} ...>
 *
 * Hex → token: every value via src/tokens — no inline hex / px aside
 * from the documented `LEFT_GAP_RAW = 10` (Figma spec uses a raw 10
 * that's not on the spacing scale; left as a literal with a comment).
 */
import React from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Icon, Button, AmountSkeleton } from '../atoms';
import type { IconName, ButtonVariant, ButtonTone } from '../atoms';
import {
  colors,
  spacing,
  radius,
  mediaSize,
  elevation,
} from '../tokens';

// Card width — fluid (was a fixed 328 from Figma; that worked on a
// 360-wide canvas with 16-pad gutters but left a gap on the right on
// any device wider than 360 and rendered inconsistently between iOS
// and Android. '100%' lets the row fill whatever 16-pad wrapper it
// sits inside.
// Figma raw: 10 px — not on the spacing scale (closest steps 8/12 drift
// visibly), left as a literal here.
const LEFT_GAP_RAW = 10;

// Trailing CTA min width — Figma 3614:171678 sizes the button at 112 px.
// Used as a MIN (not fixed) width: short labels ("Withdraw") pad out to
// 112 so the buttons line up as a column, while a longer label
// ("Know Why?") grows to fit on one line instead of wrapping.
const BUTTON_MIN_W = 112;

export interface AmountActionRowProps {
  /** Caption text (top line). */
  caption: string;
  /** Value text (bottom line). */
  value: string;
  /** While true, the value shows a pulsing skeleton instead of text —
   *  for amounts still loading from the API. */
  loading?: boolean;
  /** Leading icon — pass `iconName` for an SVG from the registry, or
   *  `iconSource` for a PNG (e.g. via the PNG icon index). Either one
   *  works; if both are provided, the SVG wins. */
  iconName?: IconName;
  iconSource?: ImageSourcePropType;
  /** Trailing button props (REUSED <Button> atom). */
  buttonLabel: string;
  buttonVariant?: ButtonVariant;
  buttonTone?: ButtonTone;
  /** Overrides the CTA's default label colour (e.g. an outline button
   *  whose text should match its stroke). Pass a semantic token. */
  buttonLabelColor?: string;
  onButtonPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AmountActionRow({
  caption,
  value,
  loading = false,
  iconName,
  iconSource,
  buttonLabel,
  buttonVariant = 'solid',
  buttonTone = 'main',
  buttonLabelColor,
  onButtonPress,
  style,
}: AmountActionRowProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
          borderRadius: radius.lg,
          padding: spacing[12],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        elevation.light.xs,
        style,
      ]}
    >
      {/* Left — icon + caption/value stack */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          // Figma raw 10 (not on the spacing scale).
          gap: LEFT_GAP_RAW,
        }}
      >
        <View
          style={{
            width: mediaSize[48],
            height: mediaSize[48],
            borderRadius: radius.sm,
            // White (invisible on the white card) per Figma 3614:171673 —
            // the coloured descriptor icon reads directly on the card, not
            // inside a grey chip.
            backgroundColor: colors.surface.default,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {iconName ? (
            // desc-* icons bake their own colours (the `color` prop is
            // ignored). Sized to fill the 48-px slot so the illustration
            // reads at the Figma scale rather than a small centred glyph.
            <Icon
              name={iconName}
              size={mediaSize[48]}
              color={colors.text.primary}
            />
          ) : iconSource ? (
            <Image
              source={iconSource}
              style={{ width: mediaSize[48], height: mediaSize[48] }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <View style={{ gap: spacing[4], alignItems: 'flex-start' }}>
          <Text variant="body12Regular" color={colors.text.primary}>
            {caption}
          </Text>
          {loading ? (
            // body16Bold line ≈ 24px tall; ~90px reads as a money figure.
            <AmountSkeleton width={90} height={20} tone="default" />
          ) : (
            <Text variant="body16Bold" color={colors.text.primary}>
              {value}
            </Text>
          )}
        </View>
      </View>

      {/* Right — trailing Button atom. minWidth (not fixed width) keeps the
          CTAs aligned as a column without clipping/wrapping a longer label. */}
      <Button
        label={buttonLabel}
        variant={buttonVariant}
        tone={buttonTone}
        labelColor={buttonLabelColor}
        size={36}
        onPress={onButtonPress}
        // alignSelf:'center' overrides the Button's default 'flex-start'
        // (which otherwise pins the CTA to the top of the taller row).
        style={{ minWidth: BUTTON_MIN_W, alignSelf: 'center' }}
      />
    </View>
  );
}
