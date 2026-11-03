/**
 * PaymentRecordCard — molecule
 *
 * ⚠️ NEW component, created because there is NO `List` molecule in src yet
 * (only `ListRow`). The payment-history Figma calls these "List" cards; this
 * is the composition wrapper the spec assumed existed. Merge/rename when a
 * real `List` molecule lands.
 *
 * A bordered card stacking caption-value rows with horizontal dividers, and
 * an optional final "Info / View" link row.
 *
 * ── Figma reconcile (file P7UcoZYBnfyefmJIA8wcM7, node 3416:62137 "List") ──
 * FLAG 1 (layout/tokens/typography vs the Figma "List" card): ✏️ FIXED.
 *   Verified against node 3416:62137 (get_design_context + get_variable_defs).
 *   Figma vars: border/default #d9e3ec, Border/hairline 0.5, Radius/xl 16,
 *   Spacing/16, Spacing/12, border/subtle-3 #eee, rows = Body/14/Semi Bold
 *   (letterSpacing Wide 0.4, text.primary) label + Body/14/Regular value,
 *   right-aligned, separated by a solid horizontal divider per row.
 *   - bg surface.default, radius xl, padding 16, gap 12, divider subtle3,
 *     caption-value rows: ✅ all confirmed exact.
 *   - card BORDER WIDTH: was borderWidth.thin (1px); Figma is Border/hairline
 *     (0.5px) and the token borderWidth.hairline exists → changed to it. ✏️
 * FLAG 2 (is a generic reusable `List` intended?): ✅ CONFIRMED — yes.
 *   The Figma node is literally named "List" (an instance of a shared
 *   component), not a payment-specific card. RECOMMENDATION: promote this to
 *   a generic `List` molecule (rows + optional cta), of which a payment record
 *   is one usage. NOT renamed in this pass per instructions — flag only.
 *   Note: the live Figma "List" shows NO trailing "Info / View" row on the
 *   details card; the onView/caption-cta path is an additive spec extension,
 *   kept (other history screens use it) but absent from node 3416:62137.
 *
 * Token map (per property):
 *   card bg      → colors.surface.default            (Figma #fff)
 *   card border  → borderWidth.hairline / colors.border.default (#d9e3ec)
 *   card radius  → radius.xl (16)
 *   card padding → spacing[16]
 *   card gap     → spacing[12]
 *   row          → <ListRow type="caption-value"> (label body14SemiBold —
 *                  letterSpacing wide baked — / value body14Regular, right)
 *   divider      → <Divider style="solid" color={colors.border.subtle3}>
 *   view row     → <ListRow type="caption-cta"> (label + "View" body14Medium
 *                  text.link + chevron) — chevron is ListRow's Unicode glyph
 *
 * Imports: ListRow, Divider.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Divider } from '../atoms';
import { ListRow } from './ListRow';
import { colors, spacing, radius, borderWidth } from '../tokens';

export interface PaymentRecordRow {
  label: string;
  value: string;
}

export interface PaymentRecordCardProps {
  rows: PaymentRecordRow[];
  /** When provided, renders the final "Info / View" link row. */
  onView?: () => void;
  /** Caption on the View row. Default "Info". */
  infoLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function PaymentRecordCard({
  rows,
  onView,
  infoLabel = 'Info',
  style,
}: PaymentRecordCardProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface.default,
          borderWidth: borderWidth.hairline,
          borderColor: colors.border.default,
          borderRadius: radius.xl,
          padding: spacing[16],
          gap: spacing[12],
        },
        style,
      ]}
    >
      {rows.map((r, i) => (
        <React.Fragment key={`${r.label}-${i}`}>
          <ListRow type="caption-value" label={r.label} value={r.value} />
          {i < rows.length - 1 || onView ? (
            <Divider style="solid" color={colors.border.subtle3} />
          ) : null}
        </React.Fragment>
      ))}

      {onView ? (
        <ListRow type="caption-cta" label={infoLabel} onCta={onView} />
      ) : null}
    </View>
  );
}
