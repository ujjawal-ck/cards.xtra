/**
 * StoreTermsConditions — organism (Figma 3795:84158, "Store/Terms & Conditions")
 *
 * A store page's "Important Terms & Conditions" block. One prop:
 *
 *   property1 (default "Card View"):
 *     "Card View" → title + horizontal carousel of T&C cards + "View All
 *        T&C" link (node 3795:76814, 360×152).
 *     "List View" → title + disc-bulleted text list + "View All T&C" link
 *        (node 3795:84157, 360×212).
 *
 * REUSE:
 *   - Carousels `HowItWorks` variant (node 3107:47355) for the Card View
 *     scroller. Its card matches the node exactly: white bg, 1px
 *     border.default (#d9e3ec), elevation.light.md (Shadow/Light/MD),
 *     radius.lg (12), px spacing[16] / py spacing[12], 214-wide
 *     body12Medium text + 72px tile (surface.sunken #f5f7f9, 1px
 *     border.default).
 *   - ForwardArrowGlyph (./HowToGetOfferCard) for the 12px link arrow.
 *
 * SUBSTITUTION (sanctioned by the requester): the Figma card tile holds a
 * PNG (hand-with-loudspeaker-megaphone…) that does NOT exist in
 * src/assets/images, and the HowItWorks tile renders an SVG `Icon`
 * (IconName) — not a raster image. Per the requester's instruction the
 * tile icon is substituted with the in-set `feat-celebration-outline`
 * glyph (closest announcement/promo match). Everything else is faithful.
 *
 * Token map (per property):
 *   root            → column, gap spacing[8], width sizing.containerMobile
 *                     (360), overflow hidden
 *   title wrapper   → px spacing[16]
 *   title           → typography.body16SemiBold, colors.text.primary
 *   carousel        → HowItWorks (px spacing[16], gap spacing[12] —
 *                     owns its own layout); card per REUSE above
 *   list wrapper    → px spacing[16]
 *   list gap        → spacing[8] (between items)
 *   bullet indent   → BULLET_INDENT (21, component spec — Figma ms-[21px])
 *   list item       → typography.body14Regular, colors.text.primary
 *   View All row    → px spacing[16], gap spacing[2]; label body12Medium /
 *                     text.link; arrow iconSize[12] tinted text.link
 */
import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from '../atoms';
import type { IconName } from '../atoms';
import { DiscBulletList } from '../molecules';
import { HowItWorks } from './Carousels';
import { ForwardArrowGlyph } from './HowToGetOfferCard';
import { colors, spacing, iconSize, sizing } from '../tokens';

export type StoreTermsView = 'Card View' | 'List View';

// Icon substituted for the missing megaphone PNG (see header note).
const SUBSTITUTE_ICON: IconName = 'feat-celebration-outline';

const SAMPLE_CARD_TEXT =
  'Add Products to your cart / wishlist / Save for later only after clicking out from CashKaro';

export interface StoreTermsCard {
  text: string;
  icon: IconName;
}

const DEFAULT_TITLE = 'Important Terms & Conditions';

const DEFAULT_CARDS: StoreTermsCard[] = [
  { text: SAMPLE_CARD_TEXT, icon: SUBSTITUTE_ICON },
  { text: SAMPLE_CARD_TEXT, icon: SUBSTITUTE_ICON },
  { text: SAMPLE_CARD_TEXT, icon: SUBSTITUTE_ICON },
];

const DEFAULT_ITEMS: string[] = [
  'No Cashback on Gold/Silver Coins, Bars, Jewellery and Idols',
  'Your Cashback might track at a different rate but will be corrected at the time of confirmation',
  'Cashback is calculated on order amount excluding what is paid via wallet, credits or gift vouchers',
];

export interface StoreTermsConditionsProps {
  /** "Card View" (carousel) or "List View" (bullets). Default "Card View". */
  property1?: StoreTermsView;
  /** Heading. Default "Important Terms & Conditions". */
  title?: string;
  /** Card View cards. Defaults to the three Figma samples. */
  cards?: StoreTermsCard[];
  /** List View items. Defaults to the three Figma samples. */
  items?: string[];
  /** Fired when "View All T&C" is tapped. */
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

function ViewAllRow({ onViewAll }: { onViewAll?: () => void }) {
  return (
    <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
      <Pressable
        onPress={onViewAll}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
      >
        <Text variant="body12Medium" color={colors.text.link}>
          View All T&C
        </Text>
        <ForwardArrowGlyph size={iconSize[12]} color={colors.text.link} />
      </Pressable>
    </View>
  );
}

export function StoreTermsConditions({
  property1 = 'Card View',
  title = DEFAULT_TITLE,
  cards = DEFAULT_CARDS,
  items = DEFAULT_ITEMS,
  onViewAll,
  style,
}: StoreTermsConditionsProps) {
  const isCardView = property1 === 'Card View';

  return (
    <View
      style={[
        {
          width: sizing.containerMobile, // 360
          alignItems: 'flex-start',
          gap: spacing[8],
          // NOTE: no `overflow: 'hidden'` — the inner HowItWorks carousel
          // cards carry a drop shadow that would otherwise be clipped at
          // the bottom. The carousel scrolls within its own width fine.
        },
        style,
      ]}
    >
      {/* Title */}
      <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
        <Text variant="body16SemiBold" color={colors.text.primary} style={{ width: '100%' }}>
          {title}
        </Text>
      </View>

      {isCardView ? (
        // Card View — reuse the HowItWorks carousel (owns its px16 + gap12)
        <HowItWorks
          steps={cards.map((c, i) => ({ id: String(i), text: c.text, icon: c.icon }))}
          style={{ width: '100%' }}
        />
      ) : (
        // List View — disc-bulleted text list (px16), shared molecule
        <DiscBulletList items={items} style={{ paddingHorizontal: spacing[16] }} />
      )}

      <ViewAllRow onViewAll={onViewAll} />
    </View>
  );
}
