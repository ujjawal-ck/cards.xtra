/**
 * HomeHeader — organism (Figma set 3037:255)
 *
 * Home-screen masthead. Two states via the `scrolled` prop.
 *
 *   scrolled=false (default) — transparent strip sitting over the dark
 *     blue masthead. Logo on the left (white-tone), message + bell icons
 *     on the right, all in white. Bell wears a small white circular
 *     notification badge with a dark digit.
 *
 *   scrolled=true — frosted pale-blue bar that sticks at the top once
 *     the page scrolls. We don't ship expo-blur, so the "frosted" look
 *     is a LinearGradient from cobalt-100 @ 0% alpha → 48% alpha.
 *     Logo + search icon on top, filter chips (Category / Filters /
 *     Eligibility toggle) below. Icons in dark.
 *
 * Logo asset: images.logos.lightBig (white tone, for dark masthead) /
 * images.logos.darkBig (dark tone, for the frosted bar). Both 114×56-ish.
 *
 * Hex → token:
 *   #ffffff → colors.surface.default / colors.text.inverse
 *   #262626 → colors.text.primary
 *   #d7e1fe → primitives.cobalt[100] (= #dce5fe — exact tone not in the
 *             primitives table; closest semantic match, drift <2 in any
 *             channel; alpha varies for the gradient stops)
 */
import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Icon, Chip, Switch } from '../atoms';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  iconSize,
  sizing,
} from '../tokens';
import { logos } from '../assets/logos';

export interface HomeHeaderProps {
  scrolled?: boolean;
  notificationCount?: number;
  /** Filter chip state — only consulted when scrolled=true. */
  filtersCategoryLabel?: string;
  /** Active-selection counts. When > 0 the chip flips into the pale-cobalt
   *  "selected with count" look (count badge beside the label) — mirrors the
   *  Home FilterRow so the scrolled bar reflects the same selected state. */
  categoryCount?: number;
  filtersCount?: number;
  eligibilityOn?: boolean;
  /** True once eligibility details are saved — reveals the attached edit
   *  pencil box (matches the Home FilterRow treatment). */
  eligibilityChecked?: boolean;
  onMessagePress?: () => void;
  onBellPress?: () => void;
  /** Tap handler for the get-help (headset) icon — only shown in the
   *  transparent (scrolled=false) state, beside the notification bell. */
  onHelpPress?: () => void;
  onSearchPress?: () => void;
  onCategoryPress?: () => void;
  onFiltersPress?: () => void;
  onEligibilityToggle?: () => void;
  onEligibilityEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Logo box — spec ~114×56. Image rendered with resizeMode 'contain' so
// either logos.lightBig or logos.darkBig fits regardless of its
// native aspect ratio.
const LOGO_W = 114;
const LOGO_H = 56;

// Notification badge — 12×12 with the caption10 digit inside.
const BADGE_SIZE = 12;
// The badge slightly overlaps the bell icon's top-right corner.
const BADGE_OVERLAP = -3;

// Helper for translucent cobalt gradient stops on the frosted bar.
function cobaltAlpha(alpha: number): string {
  // primitives.cobalt[100] = '#dce5fe' → '220, 229, 254'
  return `rgba(220, 229, 254, ${alpha})`;
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function Logo({ scrolled }: { scrolled: boolean }) {
  // Real SVG wordmarks (114×56) — light variant on the dark masthead,
  // dark variant on the frosted bar. Rendered via react-native-svg-
  // transformer, not as a raster <Image>.
  const Mark = scrolled ? logos.darkSmall : logos.lightSmall;
  return <Mark width={LOGO_W} height={LOGO_H} />;
}

function BellWithBadge({
  count,
  iconColor,
  onPress,
}: {
  count?: number;
  iconColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        count && count > 0
          ? `Notifications, ${count} unread`
          : 'Notifications'
      }
      hitSlop={spacing[8]}
      style={{ width: iconSize[24], height: iconSize[24] }}
    >
      <Icon name="bell-outline" size={iconSize[24]} color={iconColor} />
      {count && count > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: BADGE_OVERLAP,
            right: BADGE_OVERLAP,
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: radius.full,
            backgroundColor: colors.surface.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption10SemiBold" color={colors.text.primary}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function HomeHeader({
  scrolled = false,
  notificationCount,
  filtersCategoryLabel = 'Category',
  categoryCount = 0,
  filtersCount = 0,
  eligibilityOn = false,
  eligibilityChecked = false,
  onBellPress,
  onHelpPress,
  onSearchPress,
  onCategoryPress,
  onFiltersPress,
  onEligibilityToggle,
  onEligibilityEdit,
  style,
}: HomeHeaderProps) {
  const iconColor = scrolled
    ? colors.text.primary
    : colors.text.inverse;

  // -------------------------------------------------------------------------
  // scrolled=false — transparent row over the dark masthead
  // -------------------------------------------------------------------------
  if (!scrolled) {
    return (
      <View
        style={[
          {
            width: '100%',
            height: sizing.headerHeight, // 56
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing[16],
          },
          style,
        ]}
      >
        <Logo scrolled={false} />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[12],
          }}
        >
          <Pressable
            onPress={onHelpPress}
            accessibilityRole="button"
            accessibilityLabel="Get help"
            hitSlop={spacing[8]}
          >
            <Icon
              name="headset-outline"
              size={iconSize[24]}
              color={iconColor}
            />
          </Pressable>
          <BellWithBadge
            count={notificationCount}
            iconColor={iconColor}
            onPress={onBellPress}
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // scrolled=true — frosted bar with logo, search, and filter chips
  // -------------------------------------------------------------------------
  return (
    <View
      style={[
        {
          width: '100%',
          // Fixed-ish height per spec; padding + content land near 136.
          paddingTop: spacing[16],
          paddingBottom: spacing[24],
          paddingHorizontal: spacing[16],
          gap: spacing[8],
        },
        style,
      ]}
    >
      {/* Pale-blue gradient wash — stands in for the expo-blur
          frosted effect we don't have installed.
          Flipped vertically: solid (~48% alpha) at the TOP, fading to
          transparent at the BOTTOM. start=top, end=bottom so colors[0]
          (= 48% alpha) anchors at the top edge. */}
      <LinearGradient
        // Opaque lavender → white (Figma 1929:32667). The translucent cobalt
        // wash let the masthead and the inline filter row show through, so
        // two chip rows appeared stacked while scrolling.
        colors={[colors.background.lavender, colors.surface.default]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        pointerEvents="none"
      />

      {/* Top row — logo + search */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Logo scrolled />
        <Pressable
          onPress={onSearchPress}
          accessibilityRole="button"
          accessibilityLabel="Search"
          hitSlop={spacing[8]}
        >
          <Icon
            name="search-outline"
            size={iconSize[24]}
            color={iconColor}
          />
        </Pressable>
      </View>

      {/* Filter chips row — mirrors the Home FilterRow treatment:
          Category / Filters carry their trailing glyphs with the trailing
          padding halved (12 → 6); Eligibility + edit pencil read as one
          segmented unit. The only difference from the main row is colour:
          the pencil keeps the masthead's dark `iconColor`, not cobalt. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        // Scrolls instead of clipping when large OS text makes the chips
        // wider than the screen (Eligibility ran off the right edge).
        // flexGrow keeps Eligibility pinned right (marginLeft:'auto')
        // whenever the row does fit.
        contentContainerStyle={{
          flexGrow: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
        }}
      >
        <Chip
          label={filtersCategoryLabel}
          type="default"
          count={categoryCount > 0 ? categoryCount : undefined}
          trailingIcon="chevron-down"
          style={{ paddingRight: spacing[6] }}
          onPress={onCategoryPress}
        />
        <Chip
          label="Filters"
          type="default"
          count={filtersCount > 0 ? filtersCount : undefined}
          // Filter glyph matches the Orders list Filter control: outline by
          // default, filled when any filter is applied — NOT the sliders glyph.
          leadingIcon={filtersCount > 0 ? 'filter-filled' : 'filter-outline'}
          onPress={onFiltersPress}
        />

        {/* Eligibility toggle + attached edit pencil. Pinned right via
            marginLeft:'auto'. When details are saved the two halves butt
            together (square inner corners, gap 0, single shared hairline)
            exactly like the main FilterRow. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: eligibilityChecked ? 0 : spacing[8],
            marginLeft: 'auto',
          }}
        >
          <Pressable
            onPress={onEligibilityToggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: eligibilityOn }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[8],
              paddingHorizontal: spacing[12],
              paddingVertical: spacing[8],
              borderTopLeftRadius: radius.sm,
              borderBottomLeftRadius: radius.sm,
              borderTopRightRadius: eligibilityChecked ? 0 : radius.sm,
              borderBottomRightRadius: eligibilityChecked ? 0 : radius.sm,
              borderWidth: borderWidth.thin,
              borderRightWidth: eligibilityChecked ? 0 : borderWidth.thin,
              borderColor: colors.border.default,
              backgroundColor: colors.surface.default,
            }}
          >
            <View pointerEvents="none">
              <Switch value={eligibilityOn} size="sm" />
            </View>
            <Text variant="body12Regular" color={colors.text.primary}>
              Eligibility
            </Text>
          </Pressable>

          {eligibilityChecked ? (
            <Pressable
              onPress={onEligibilityEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit eligibility details"
              hitSlop={spacing[8]}
              style={{
                paddingVertical: spacing[8],
                paddingHorizontal: spacing[4],
                borderTopRightRadius: radius.sm,
                borderBottomRightRadius: radius.sm,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderWidth: borderWidth.thin,
                borderColor: colors.border.default,
                backgroundColor: colors.surface.default,
              }}
            >
              {/* Dark masthead icon colour, NOT cobalt — per spec. */}
              <Icon name="edit-outline" size={iconSize[16]} color={iconColor} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
