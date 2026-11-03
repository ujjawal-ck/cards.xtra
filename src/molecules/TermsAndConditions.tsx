/**
 * TermsAndConditions — molecule (Figma set 3686:26901)
 *
 * Consent row: optional Checkbox + body12Regular consent text with
 * inline cobalt link spans. Optional error line above. Two placements
 * (default / sticky) and two body wraps (multi-line / 1-line).
 *
 * Three render modes:
 *   checked = true | false → renders a Checkbox on the left
 *   checked = 'none'       → renders just the text (used for passive
 *                            "By continuing you agree…" copy)
 *
 * Links: pass `linkLabels` (e.g. ['Terms', 'Privacy Policy']) and the
 * matching substrings inside `label` get styled cobalt and made
 * tappable, firing `onPressLink(label)`. If you need richer composition,
 * pass `label` as a ReactNode instead and ignore linkLabels.
 *
 * Hex → token mapping:
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 *   #0036da → colors.text.link
 *   #d41000 → colors.feedback.error.default
 */
import React, { ReactNode } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Checkbox } from '../atoms';
import { colors, spacing, borderWidth } from '../tokens';

export type TermsChecked = boolean | 'none';
export type TermsPlacement = 'default' | 'sticky';
export type TermsBody = 'multi-line' | '1-line';
export type TermsState = 'default' | 'error';

export interface TermsAndConditionsProps {
  checked: TermsChecked;
  label: string | ReactNode;
  description?: string;
  /** Substrings within `label` to auto-style as cobalt links.
   *  Only consulted when `label` is a string. */
  linkLabels?: string[];
  onChange?: (next: boolean) => void;
  onPressLink?: (label: string) => void;
  placement?: TermsPlacement;
  body?: TermsBody;
  state?: TermsState;
  /** Overrides the default error message when state='error'. */
  errorText?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ERROR_MESSAGE = 'Please checkmark the box first.';

type PlacementSpec = {
  padTB: number;
  padLR: number;
  bg?: string;
  showTopBorder: boolean;
};

const PLACEMENT_CONFIG: Record<TermsPlacement, PlacementSpec> = {
  default: {
    padTB: spacing[8],
    padLR: spacing[24],
    showTopBorder: false,
  },
  sticky: {
    padTB: spacing[12],
    padLR: spacing[16],
    bg: colors.surface.default,
    showTopBorder: true,
  },
};

// Escape regex metachars so callers can pass plain strings as link labels.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderLabel(
  label: string | ReactNode,
  linkLabels: string[],
  onPressLink: ((l: string) => void) | undefined,
  body: TermsBody,
  muted: boolean
): ReactNode {
  const nl = body === '1-line' ? 1 : undefined;
  // Per Figma: passive/muted variants of this consent text use #5c5c5c.
  const baseColor = muted ? colors.text.secondary : colors.text.primary;

  // If label is not a string, render it as-is (caller composes manually).
  if (typeof label !== 'string') return label;

  if (linkLabels.length === 0) {
    return (
      <Text variant="body12Regular" color={baseColor} numberOfLines={nl}>
        {label}
      </Text>
    );
  }

  // Split label on any link-label match. Capturing group keeps the matches.
  const regex = new RegExp(`(${linkLabels.map(escapeRegex).join('|')})`, 'g');
  const parts = label.split(regex);

  return (
    <Text variant="body12Regular" color={baseColor} numberOfLines={nl}>
      {parts.map((part, i) =>
        linkLabels.includes(part) ? (
          <Text
            key={i}
            variant="body12Regular"
            color={colors.text.link}
            onPress={() => onPressLink?.(part)}
          >
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

export function TermsAndConditions({
  checked,
  label,
  description,
  linkLabels = [],
  onChange,
  onPressLink,
  placement = 'default',
  body = 'multi-line',
  state = 'default',
  errorText = DEFAULT_ERROR_MESSAGE,
  style,
}: TermsAndConditionsProps) {
  const showCheckbox = checked !== 'none';
  const isError = state === 'error';
  const config = PLACEMENT_CONFIG[placement];

  return (
    <View
      style={[
        {
          paddingTop: config.padTB,
          paddingBottom: config.padTB,
          paddingLeft: config.padLR,
          paddingRight: config.padLR,
          backgroundColor: config.bg,
          borderTopWidth: config.showTopBorder ? borderWidth.thin : 0,
          borderTopColor: config.showTopBorder
            ? colors.border.subtle3
            : undefined,
          gap: spacing[4],
          // Sticky placement gets a soft lift so it reads as a pinned bar.
          ...(placement === 'sticky'
            ? {
                shadowColor: colors.surface.dark,
                shadowOpacity: 0.06,
                shadowRadius: spacing[8],
                shadowOffset: { width: 0, height: -spacing[2] },
                elevation: 4,
              }
            : null),
        },
        style,
      ]}
    >
      {isError ? (
        <Text
          variant="body12Medium"
          color={colors.feedback.error.default}
        >
          {errorText}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing[8],
        }}
      >
        {showCheckbox ? (
          <Checkbox
            checked={checked === true}
            onChange={onChange}
            size="md"
          />
        ) : null}

        <View style={{ flex: 1, gap: spacing[2] }}>
          {renderLabel(
            label,
            linkLabels,
            onPressLink,
            body,
            checked === 'none'
          )}
          {description ? (
            <Text
              variant="body12Regular"
              color={colors.text.secondary}
              numberOfLines={body === '1-line' ? 1 : undefined}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
