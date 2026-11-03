/**
 * StoreAboutBrand — organism (Figma 3832:31404, "Store/About Brand")
 *
 * The brand block on a store page: a BrandLogo chip, optionally followed
 * by a one-line, truncated brand description with an inline "View More"
 * link. Two states, controlled by `brandDescription`:
 *
 *   brandDescription={true}  → On  (node 3795:76794, 360×76) — logo + desc
 *   brandDescription={false} → Off (node 3832:31405, 360×48) — logo only
 *
 * Structure (matches Figma exactly):
 *   Root — column, alignItems:flex-start, width 360, gap Spacing/12.
 *          (the gap row only materialises in the On state, which has a
 *          second child.)
 *     Logo block — full-width row, horizontal padding Spacing/16, no
 *                   vertical padding. Reuses the BrandLogo molecule.
 *     Description block (On only) — full-width, horizontal padding
 *                   Spacing/16. The whole description + link area is one
 *                   tap target (Pressable) that toggles internal
 *                   `expanded` state (Figma "Brand Description" set
 *                   3752:60460, Collapsed ↔ Expanded). onViewMore, if
 *                   passed, also fires on every tap as an extra callback.
 *
 *       Collapsed (default) — horizontal row, alignItems center, gap
 *                   DESC_GAP. Description Text: flex 1, minWidth 0,
 *                   numberOfLines 1 (ellipsis). Link reads "View More".
 *       Expanded — vertical column, alignItems flex-start, gap DESC_GAP.
 *                   Description Text: full text, no truncation, wraps.
 *                   Link reads "View Less" on its own line below.
 *
 *       Only the label, layout direction, and truncation change between
 *       states — colours (text.secondary / text.link), gap (DESC_GAP),
 *       and typography (Body/12/Medium) are identical in both.
 *
 * Token map:
 *   gap (root)           → spacing[12]        (Spacing/12)
 *   px (both blocks)     → spacing[16]        (Spacing/16)
 *   description type     → typography.body12Medium (Body/12/Medium)
 *   description colour   → colors.text.secondary   (Text Inactive #5c5c5c)
 *   "View More" colour   → colors.text.link        (text/link #0036da)
 *   BrandLogo internals  → radius.sm, border.default, surface.default,
 *                          mediaSize[32] (all owned by the BrandLogo molecule)
 *
 * DESC_GAP (5) is a component-spec value from Figma (node 3752:60458),
 * not on the global spacing scale — named here with a comment rather
 * than inlined, mirroring the BrandLogo molecule's LOGO_W/IMAGE_W specs.
 */
import React, { useState } from 'react';
import {
  View,
  Pressable,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text } from '../atoms';
import { BrandLogo } from '../molecules';
import { colors, spacing, sizing } from '../tokens';

// Enable LayoutAnimation on Android (no-op on iOS, where it's always on)
// so the View More expand/collapse animates the height change smoothly.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Inner gap between the description text and "View More" — a Figma
// component spec (5px), not a spacing-scale step.
const DESC_GAP = 5;

const DEFAULT_DESCRIPTION =
  "India's 1st caffeinated personal brand which is 100% SLS paraffin free, and made to perfection.";

export interface StoreAboutBrandProps {
  /** On (true) shows the description row; Off (false) is logo-only. */
  brandDescription?: boolean;
  /** Logo image for the BrandLogo chip. */
  logo: ImageSourcePropType;
  /** One-line brand blurb (truncates with an ellipsis). */
  description?: string;
  /** Extra callback fired on every tap of the description row, in
   *  addition to the internal expand/collapse toggle. Optional. */
  onViewMore?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StoreAboutBrand({
  brandDescription = true,
  logo,
  description = DEFAULT_DESCRIPTION,
  onViewMore,
  style,
}: StoreAboutBrandProps) {
  // Collapsed by default (Figma "Collapsed" 3752:60458). Tapping the
  // description row toggles to "Expanded" (3752:60459) and back.
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    // Animate the height change so the description expands/collapses smoothly
    // rather than snapping between 1 line and full text.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    onViewMore?.();
  };

  return (
    <View
      style={[
        {
          width: sizing.containerMobile, // 360
          alignItems: 'flex-start',
          gap: spacing[12],
        },
        style,
      ]}
    >
      {/* Logo block — full-width, horizontal padding only */}
      <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
        <BrandLogo source={logo} accessibilityLabel="Brand logo" />
      </View>

      {/* Description block — On state only */}
      {brandDescription && (
        <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole="button"
            style={{
              // Collapsed → horizontal/center; Expanded → vertical/start.
              // Gap (DESC_GAP) is identical in both states.
              flexDirection: expanded ? 'column' : 'row',
              alignItems: expanded ? 'flex-start' : 'center',
              gap: DESC_GAP,
              width: '100%',
            }}
          >
            <Text
              variant="body12Medium"
              color={colors.text.secondary}
              // Collapsed: single-line ellipsis. Expanded: wrap all lines.
              numberOfLines={expanded ? 0 : 1}
              ellipsizeMode="tail"
              style={expanded ? { width: '100%' } : { flex: 1, minWidth: 0 }}
            >
              {description}
            </Text>
            <Text
              variant="body12Medium"
              color={colors.text.link}
              numberOfLines={1}
              style={{ flexShrink: 0 }}
            >
              {expanded ? 'View Less' : 'View More'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
