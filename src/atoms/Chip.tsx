/**
 * Chip — atom (Figma set 3234:2)
 *
 * One component, three render modes via the `type` prop:
 *
 *   'default' — filter chip
 *     Horizontal row of optional leading icon + label + optional trailing
 *     icon. Padding & label typography scale with `size` (20/24/28/32).
 *     Radius radius.sm (8) — radius.xs (4) at size 20.
 *     Colours:
 *       default  → fill colors.surface.default, border colors.border.default
 *       selected → fill colors.background.emphasis, border colors.chip.selectedBorder
 *
 *   'tab' — segmented pill (fixed geometry; `size` is ignored)
 *     Padding T6/B6/L16/R16, radius.full, label body14Medium, optional
 *     `count` badge. Cobalt palette:
 *       default  → fill action.secondary.default, label text.link,
 *                  count bg action.secondary.pressed (cobalt[200])
 *       selected → fill action.accent.default, label text.inverse,
 *                  count bg surface.default (count text text.primary)
 *
 *   'toggle' — compound: a chip containing a real Switch (sm) + label,
 *     plus a SEPARATE square edit button to its right with a small gap.
 *     The Switch is purely visual (pointerEvents=none so the parent
 *     Pressable owns the tap). State maps Switch's value: 'default' →
 *     OFF, 'selected' → ON. The edit button renders the edit-filled
 *     Icon in cobalt.
 *     Colours:
 *       default  → chip white + slate border
 *       selected → chip pale cobalt fill + cobalt-100 border
 *       disabled → chip accent.disabled (grey) fill + border
 *
 * Hex → token mapping:
 *   #fff     → colors.surface.default
 *   #d9e3ec  → colors.border.default
 *   #fff4eb  → colors.background.emphasis
 *   #ffe6d6  → colors.chip.selectedBorder            (NEW in colors.ts)
 *   #ebf0ff  → colors.action.secondary.default
 *   #0741ef  → colors.action.accent.default
 *   #0036da  → colors.text.link
 *   #aec3fd  → colors.action.secondary.pressed
 *   #dce5fe  → colors.border.subtle2
 *   #262626  → colors.text.primary
 */
import React from 'react';
import {
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, TextVariant } from './Text';
import { Icon, IconName } from './Icon';
import { Switch } from './Switch';
import { colors, spacing, radius, borderWidth, iconSize } from '../tokens';
import { haptics } from '../lib/haptics';

export type ChipType = 'default' | 'tab' | 'toggle';
export type ChipState = 'default' | 'selected' | 'disabled';
export type ChipSize = 20 | 24 | 28 | 32;

export interface ChipProps {
  label: string;
  type?: ChipType;
  state?: ChipState;
  /** Only applies to type='default' (and 'toggle' which reuses default sizing). */
  size?: ChipSize;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  /** Small accent (cobalt) dot before the label — e.g. an "active filters"
   *  indicator. Only rendered on the 'default' variant. */
  dot?: boolean;
  /** Count badge. On type='tab' it sits at the end of the row; on the
   *  default filter chip it renders beside the label (before any trailing
   *  icon) and switches the chip into the pale-cobalt "selected with count"
   *  look — the tab-default palette, at the default chip's own size. */
  count?: number;
  onPress?: () => void;
  /** Edit button handler on type='toggle'. */
  onEditPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DISABLED_OPACITY = 0.4;

// ---------------------------------------------------------------------------
// Per-size config for 'default' (and 'toggle')
// ---------------------------------------------------------------------------
type DefaultSizeConfig = {
  padY: number;
  padX: number;
  iconPx: number;
  labelVariant: TextVariant;
  radiusValue: number;
  gap: number;
};

const DEFAULT_SIZE_CONFIG: Record<ChipSize, DefaultSizeConfig> = {
  20: {
    padY: spacing[2],
    padX: spacing[8],
    iconPx: iconSize[12],
    labelVariant: 'caption10Regular',
    radiusValue: radius.xs,
    gap: spacing[4],
  },
  24: {
    padY: spacing[4],
    padX: spacing[8],
    iconPx: iconSize[12],
    labelVariant: 'caption10Regular',
    radiusValue: radius.sm,
    gap: spacing[4],
  },
  28: {
    padY: spacing[6],
    padX: spacing[12],
    iconPx: iconSize[16],
    labelVariant: 'body12Regular',
    radiusValue: radius.sm,
    gap: spacing[4],
  },
  32: {
    padY: spacing[8],
    padX: spacing[12],
    iconPx: iconSize[16],
    labelVariant: 'body12Regular',
    radiusValue: radius.sm,
    gap: spacing[4],
  },
};

// ---------------------------------------------------------------------------
// Fixed config for 'tab' (size prop ignored)
// ---------------------------------------------------------------------------
const TAB_CONFIG = {
  padY: spacing[6],
  padX: spacing[16],
  gap: spacing[8],
  labelVariant: 'body14Medium' as TextVariant,
  countBadgeMinW: iconSize[16],
  countBadgeH: iconSize[16],
};

// Gap between the chip part and the attached edit button in 'toggle'.
const TOGGLE_GAP = spacing[4];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Chip({
  label,
  type = 'default',
  state = 'default',
  size = 32,
  leadingIcon,
  trailingIcon,
  dot,
  count,
  onPress,
  onEditPress,
  style,
}: ChipProps) {
  const isDisabled = state === 'disabled';
  const isSelected = state === 'selected';

  // Tapping a chip changes a selection (filter / tab / toggle) → selection feel.
  const handlePress = onPress
    ? () => {
        haptics.selection();
        onPress();
      }
    : undefined;
  const handleEditPress = onEditPress
    ? () => {
        haptics.selection();
        onEditPress();
      }
    : undefined;

  // -------------------------------------------------------------------------
  // TAB
  // -------------------------------------------------------------------------
  if (type === 'tab') {
    const bg = isSelected
      ? colors.action.accent.default
      : colors.action.secondary.default;
    const fg = isSelected ? colors.text.inverse : colors.text.link;
    const countBg = isSelected
      ? colors.surface.default
      : colors.action.secondary.pressed;
    const countFg = isSelected ? colors.text.primary : colors.text.link;

    return (
      <Pressable
        onPress={isDisabled ? undefined : handlePress}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, selected: isSelected }}
        style={[
          {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: TAB_CONFIG.gap,
            paddingVertical: TAB_CONFIG.padY,
            paddingHorizontal: TAB_CONFIG.padX,
            borderRadius: radius.full,
            backgroundColor: bg,
            opacity: isDisabled ? DISABLED_OPACITY : 1,
          },
          style,
        ]}
      >
        {leadingIcon ? (
          <Icon name={leadingIcon} size={iconSize[16]} color={fg} />
        ) : null}
        <Text variant={TAB_CONFIG.labelVariant} color={fg}>
          {label}
        </Text>
        {trailingIcon ? (
          <Icon name={trailingIcon} size={iconSize[16]} color={fg} />
        ) : null}
        {typeof count === 'number' ? (
          <View
            style={{
              minWidth: TAB_CONFIG.countBadgeMinW,
              height: TAB_CONFIG.countBadgeH,
              paddingHorizontal: spacing[4],
              borderRadius: radius.sm,
              backgroundColor: countBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption10SemiBold" color={countFg}>
              {count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  // -------------------------------------------------------------------------
  // TOGGLE — chip containing a Switch + label, plus an attached square
  // edit button with a small gap between the two.
  // -------------------------------------------------------------------------
  if (type === 'toggle') {
    const config = DEFAULT_SIZE_CONFIG[size];

    // Chip colours per state — disabled wins over selected.
    const chipBg = isDisabled
      ? colors.action.accent.disabled
      : isSelected
      ? colors.action.secondary.default
      : colors.surface.default;
    const chipBorder = isDisabled
      ? colors.action.accent.disabled
      : isSelected
      ? colors.border.subtle2
      : colors.border.default;
    const fg = isDisabled ? colors.text.disabled : colors.text.primary;

    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignSelf: 'flex-start',
            // Centre the shorter 24×24 edit button next to the chip
            // (which is taller than 24 at default sizes). Previously
            // alignItems:'stretch' stretched the button to chip height,
            // leaving the 12px edit icon swimming in a 32+ frame.
            alignItems: 'center',
            gap: TOGGLE_GAP,
          },
          style,
        ]}
      >
        {/* Chip with Switch + label */}
        <Pressable
          onPress={isDisabled ? undefined : handlePress}
          accessibilityRole="switch"
          accessibilityState={{ disabled: isDisabled, checked: isSelected }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[8],
            paddingVertical: config.padY,
            paddingHorizontal: config.padX,
            borderRadius: config.radiusValue,
            borderWidth: borderWidth.thin,
            borderColor: chipBorder,
            backgroundColor: chipBg,
          }}
        >
          {/* Switch is display-only inside the chip — taps go to the
              parent Pressable. The Switch atom honours `disabled`
              independently so its track also greys out. */}
          <View pointerEvents="none">
            <Switch value={isSelected} size="sm" disabled={isDisabled} />
          </View>

          <Text variant={config.labelVariant} color={fg}>
            {label}
          </Text>
        </Pressable>

        {/* Edit button — fixed 24×24 white frame containing the real
            `edit-filled` SVG at exactly 12×12, centred. Earlier this
            was `aspectRatio: 1` with parent `alignItems: 'stretch'`,
            so the button blew up to chip-height (32+) and the 12px
            icon read as lost. */}
        <Pressable
          onPress={isDisabled ? undefined : handleEditPress}
          accessibilityRole="button"
          accessibilityLabel="Edit"
          style={{
            width: iconSize[24],
            height: iconSize[24],
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: config.radiusValue,
            borderWidth: borderWidth.thin,
            borderColor: isDisabled
              ? colors.action.accent.disabled
              : colors.border.default,
            backgroundColor: isDisabled
              ? colors.action.accent.disabled
              : colors.surface.default,
          }}
        >
          <Icon
            name="edit-filled"
            size={iconSize[12]}
            color={
              isDisabled
                ? colors.text.disabled
                : colors.action.accent.default
            }
          />
        </Pressable>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // DEFAULT filter chip
  //
  // Passing a `count` flips the chip into the "Default Selected with Count"
  // look: the pale-cobalt fill + cobalt label/icon of the `tab` default
  // palette, plus a count badge rendered BESIDE the label (before any
  // trailing icon) — all at this chip's own geometry/size, NOT the larger
  // tab pill. Used by the Home FilterRow's Category / Filters chips when a
  // selection is active.
  // -------------------------------------------------------------------------
  const config = DEFAULT_SIZE_CONFIG[size];
  const hasCount = typeof count === 'number';
  const bg = hasCount
    ? colors.action.secondary.default
    : isSelected
    ? colors.background.emphasis
    : colors.surface.default;
  const border = hasCount
    ? colors.border.subtle2
    : isSelected
    ? colors.chip.selectedBorder
    : colors.border.default;
  const fg = hasCount ? colors.text.link : colors.text.primary;

  return (
    <Pressable
      onPress={isDisabled ? undefined : handlePress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: config.gap,
          paddingVertical: config.padY,
          paddingHorizontal: config.padX,
          borderRadius: config.radiusValue,
          borderWidth: borderWidth.thin,
          borderColor: border,
          backgroundColor: bg,
          opacity: isDisabled ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: spacing[6],
            height: spacing[6],
            borderRadius: spacing[6] / 2,
            backgroundColor: colors.action.accent.default,
          }}
        />
      ) : null}
      {leadingIcon ? (
        <Icon name={leadingIcon} size={config.iconPx} color={fg} />
      ) : null}
      <Text variant={config.labelVariant} color={fg}>
        {label}
      </Text>
      {/* Count badge sits immediately beside the label — same treatment as
          the tab variant's badge (cobalt-200 fill, cobalt text). */}
      {hasCount ? (
        <View
          style={{
            minWidth: iconSize[16],
            height: iconSize[16],
            paddingHorizontal: spacing[4],
            borderRadius: radius.sm,
            backgroundColor: colors.action.secondary.pressed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption10SemiBold" color={colors.text.link}>
            {count}
          </Text>
        </View>
      ) : null}
      {trailingIcon ? (
        <Icon name={trailingIcon} size={config.iconPx} color={fg} />
      ) : null}
    </Pressable>
  );
}
