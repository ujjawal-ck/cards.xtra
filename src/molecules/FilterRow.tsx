/**
 * FilterRow — molecule
 *
 * Home-screen row of filter controls:
 *   [Category ▼]  [⚙ Filters]  ………………  Eligibility (•‾‾)
 *
 * Category + Filters use the Chip atom. Eligibility uses RN's Switch,
 * with the on-track tinted Saffron via the action.primary semantic.
 */
import React from 'react';
import {
  View,
  Switch,
  Text as RNText,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Chip } from '../atoms';
import { colors, spacing, iconSize } from '../tokens';

export interface FilterRowProps {
  category?: string;
  onCategoryPress?: () => void;
  onFiltersPress?: () => void;
  /** When true, a cobalt dot shows before "Filters" (active filters applied). */
  filtersActive?: boolean;
  eligibilityOn?: boolean;
  onEligibilityChange?: (on: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export function FilterRow({
  category = 'Category',
  onCategoryPress,
  onFiltersPress,
  filtersActive = false,
  eligibilityOn = false,
  onEligibilityChange,
  style,
}: FilterRowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
        },
        style,
      ]}
    >
      {/* Chevron / filter glyphs dropped — Chip's leadingIcon /
          trailingIcon now take IconName from src/assets/icons, and
          neither a chevron-down nor a filter SVG ships there yet. */}
      <Chip label={category} onPress={onCategoryPress} />
      <Chip label="Filters" dot={filtersActive} onPress={onFiltersPress} />

      <View style={{ flex: 1 }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
        }}
      >
        <Text variant="body14Medium" color={colors.text.primary}>
          Eligibility
        </Text>
        <Switch
          value={eligibilityOn}
          onValueChange={onEligibilityChange}
          trackColor={{
            false: colors.surface.sunken,
            true: colors.action.primary.default,
          }}
          ios_backgroundColor={colors.surface.sunken}
          thumbColor={colors.surface.default}
        />
      </View>
    </View>
  );
}
