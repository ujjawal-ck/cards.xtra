/**
 * StoreFaq — organism (store-page FAQ floor)
 *
 * "Frequently Asked Questions" for a store/brand page. PURE COMPOSITION,
 * mirroring the credit-card sheet's FAQ block (CardDetailSheet → FaqSection):
 * a title + a stack of REUSED `Accordion` rows with single-open behaviour
 * (first row open by default), separated by the REUSED solid `Divider`.
 *
 * Data-driven via `items` (from the offers API's `faq[]`). Renders nothing
 * when there are no items, so the screen's surrounding floors collapse
 * cleanly on stores without an FAQ.
 *
 * Token map:
 *   root        → column, gap spacing[8], width 100%
 *   title       → typography.body16SemiBold, colors.text.primary, px spacing[16]
 *   rows        → Accordion state="default" (bakes its own px spacing[16])
 *   separators  → Divider style="solid", px spacing[16] (aligns with the
 *                 Accordion's internal 16-px padding)
 */
import React, { useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text, Divider } from '../atoms';
import { Accordion } from '../molecules';
import { colors, spacing } from '../tokens';

export interface StoreFaqItem {
  question: string;
  answer: string;
}

export interface StoreFaqProps {
  items: StoreFaqItem[];
  /** Heading. Default "Frequently Asked Questions". */
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export function StoreFaq({
  items,
  title = 'Frequently Asked Questions',
  style,
}: StoreFaqProps) {
  // First accordion open by default (same as the card sheet's FAQ).
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <View
      style={[
        { width: '100%', flexDirection: 'column', gap: spacing[8], alignItems: 'flex-start' },
        style,
      ]}
    >
      <Text
        variant="body16SemiBold"
        color={colors.text.primary}
        style={{ paddingHorizontal: spacing[16] }}
      >
        {title}
      </Text>

      {/* Stack of single-open Accordions. state="default" bakes the 16-px
          horizontal padding, so each row's tap area spans the full width
          and its text sits 16-px in from each edge. */}
      <View style={{ width: '100%' }}>
        {items.map((item, i) => (
          <React.Fragment key={`${item.question}-${i}`}>
            <Accordion
              title={item.question}
              body={item.answer}
              expanded={i === expandedIndex}
              onToggle={(next) => setExpandedIndex(next ? i : null)}
              state="default"
            />
            {i < items.length - 1 ? (
              <View style={{ paddingHorizontal: spacing[16] }}>
                <Divider style="solid" />
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
