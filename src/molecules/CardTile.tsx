/**
 * CardTile — molecule  [spec 1929:31104]  *** hero
 *
 * Vertical layout inside a padded rounded card:
 *   1. Card image + (name, cashback pill)
 *   2. Optional INVITE ONLY badge
 *   3. Category tags row
 *   4. Benefits column (icon + text rows)
 *   5. Base strip: fees [Joining | Annual] + Apply Now button
 *
 * Image is a placeholder coloured rectangle with the bank's short name
 * (e.g. "AXIS"). The colour key on each card maps to a semantic token;
 * we never accept raw hex from data. Replace the placeholder with a real
 * <Image source={...} /> once card art lands.
 */
import React from 'react';
import {
  View,
  Pressable,
  Text as RNText,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  colors,
  spacing,
  radius,
  borderWidth,
  iconSize,
} from '../tokens';
import { Text, Tag, Button } from '../atoms';
import type { IconName } from '../atoms';

// Card placeholder image dimensions. These are content-image sizes (not
// theme tokens), so they live here as named consts with a clear name.
const CARD_IMAGE_W = 132;
const CARD_IMAGE_H = 84;

export type CardPlaceholderColor =
  | 'dark'
  | 'cobalt'
  | 'saffron'
  | 'ruby'
  | 'fern'
  | 'violet';

export const cardPlaceholderBgMap: Record<CardPlaceholderColor, string> = {
  dark: colors.surface.inverse,
  cobalt: colors.action.accent.default,
  saffron: colors.action.primary.default,
  ruby: colors.feedback.error.default,
  fern: colors.feedback.success.default,
  violet: colors.promotional.violet,
};

export interface CardBenefit {
  icon: string; // emoji
  text: string;
}

/** One row in the CardDetailSheet eligibility list (icon + caption + value). */
export interface CardEligibilityRow {
  icon: IconName;
  caption: string;
  value: string;
}

/** Fields the Home filter sheet matches against (all client-side). Present
 *  on API-mapped cards; absent on legacy sample cards (excluded by filters). */
export interface CardFilterMeta {
  /** BankKaro card_alias — used to match eligibility-API results to cards. */
  cardAlias?: string;
  bankId?: number;
  /** Resolved bank display name (from the init-bundle bank directory, with a
   *  static name fallback). */
  bankName?: string;
  /** Bank logo URL (from init-bundle bank_data; absent for unknown banks). */
  bankLogo?: string;
  /** Card network — card_type, e.g. "Visa" / "Mastercard" / "RuPay". */
  network: string;
  /** Category tag ids the card belongs to (tags[].id). */
  categoryIds: number[];
  /** Numeric annual fee in ₹ (0 when free / unknown). */
  annualFeeValue: number;
  /** True when both joining and annual fees are ₹0. */
  isFree: boolean;
}

/** Real, card-specific data for the CardDetailSheet body sections. Optional
 *  on CardModel — sample cards omit it and the sheet falls back to defaults. */
export interface CardDetail {
  fee: {
    annual: { label: string; amount: string; sub: string };
    joining: { label: string; amount: string; sub: string };
    bullets: string[];
  };
  eligibilitySalaried: CardEligibilityRow[];
  eligibilitySelfEmployed: CardEligibilityRow[];
}

export interface CardModel {
  id: string;
  /** Full card name, e.g. "AXIS MyZone Credit Card" */
  name: string;
  /** Short label inside the legacy placeholder image, e.g. "AXIS" */
  shortName: string;
  placeholderColor: CardPlaceholderColor;
  /** Real card art used by the organism CardTile. */
  cardImage: ImageSourcePropType;
  /** Full string for the legacy tile / detail sheet, e.g. "Upto ₹1,200 Cashback". */
  cashback: string;
  /** Just the value, e.g. "₹1,200" — used by the organism's CashbackBadge. */
  cashbackValue: string;
  /** Which fee strip the organism renders. */
  feeType: 'lifetime-free' | 'discontinued' | 'with-fees';
  /** 2-3 category labels */
  tags: string[];
  /** Emoji-icon benefits, used by the legacy molecule + CardDetailSheet. */
  benefits: CardBenefit[];
  /** SVG-icon benefits, used by the organism CardTile (feat-* outline icons).
   *  `title` is the punchy lede (USP header, e.g. "Get 5% Cashback on Dining");
   *  `description` is the optional qualifier/fine print, rendered muted beneath.
   *  `tagId` is the benefit's category (product_usps tag_id) — drives the
   *  category-aware "show the points for the selected category" behaviour. */
  tileBenefits: Array<{
    icon: IconName;
    title: string;
    description?: string;
    tagId?: number;
  }>;
  /** "₹1,501" or "Free" */
  joiningFee: string;
  annualFee: string;
  inviteOnly?: boolean;
  /** Card-specific detail for the CardDetailSheet body (fees / eligibility).
   *  Present on API-mapped cards; absent on legacy sample cards. */
  detail?: CardDetail;
  /** Fields the Home filters match against. Present on API-mapped cards. */
  filterMeta?: CardFilterMeta;
  /** CashKaro store id (BankKaro `ck_store_id`) — the click-out tracking id and
   *  the key for the CashKaro reward lookup. */
  cashkaroStoreId?: number;
  /** Apply / click-out URL ("Apply Now"). The CashKaro
   *  `…/visitretailer/app/<ck_store_id>?id=` tracker (BankKaro network_url
   *  fallback); the empty id= slot is filled with the user id at click time. */
  applyUrl?: string;
}

export interface CardTileProps {
  card: CardModel;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function CardImagePlaceholder({ card }: { card: CardModel }) {
  return (
    <View
      style={{
        width: CARD_IMAGE_W,
        height: CARD_IMAGE_H,
        borderRadius: radius.md,
        backgroundColor: cardPlaceholderBgMap[card.placeholderColor],
        padding: spacing[8],
        justifyContent: 'space-between',
      }}
    >
      <Text variant="caption10SemiBold" style={{ color: colors.text.inverse }}>
        VISA
      </Text>
      <Text variant="body14SemiBold" style={{ color: colors.text.inverse }}>
        {card.shortName}
      </Text>
    </View>
  );
}

function CashbackPill({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[12],
        borderRadius: radius.full,
        backgroundColor: colors.cashback.subtle,
      }}
    >
      <Text variant="body12SemiBold" style={{ color: colors.cashback.default }}>
        {label}
      </Text>
    </View>
  );
}

function InviteOnlyBadge() {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[8],
        borderRadius: radius.xs,
        backgroundColor: colors.feedback.warning.subtle,
      }}
    >
      <Text
        variant="caption10SemiBold"
        style={{ color: colors.feedback.warning.text }}
      >
        INVITE ONLY
      </Text>
    </View>
  );
}

function FeeBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption10Medium" color={colors.text.tertiary}>
        {label}
      </Text>
      <Text variant="body14SemiBold" color={colors.text.primary}>
        {value}
      </Text>
    </View>
  );
}

export function CardTile({ card, onPress, style }: CardTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.cashback}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface.default,
          borderRadius: radius.xl,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.subtle3,
          padding: spacing[12],
          gap: spacing[12],
          opacity: pressed ? 0.96 : 1,
        },
        style,
      ]}
    >
      {/* 1. Card image + info column */}
      <View style={{ flexDirection: 'row', gap: spacing[12] }}>
        <CardImagePlaceholder card={card} />
        <View style={{ flex: 1, gap: spacing[6], justifyContent: 'center' }}>
          <Text variant="body16SemiBold" color={colors.text.primary} numberOfLines={2}>
            {card.name}
          </Text>
          <CashbackPill label={card.cashback} />
        </View>
      </View>

      {/* 2. Optional INVITE ONLY badge */}
      {card.inviteOnly ? <InviteOnlyBadge /> : null}

      {/* 3. Category tags */}
      {card.tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }}>
          {card.tags.map((t) => (
            <Tag
              key={t}
              label={t}
              tone="info"
              size="md"
              appearance="gradient"
            />
          ))}
        </View>
      ) : null}

      {/* 4. Benefits */}
      {card.benefits.length > 0 ? (
        <View style={{ gap: spacing[8] }}>
          {card.benefits.map((b, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[8],
              }}
            >
              <RNText style={{ fontSize: iconSize[16] }}>{b.icon}</RNText>
              <Text variant="body12Regular" color={colors.text.secondary} style={{ flex: 1 }}>
                {b.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 5. Base strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          padding: spacing[8],
          borderRadius: radius.sm,
          backgroundColor: colors.surface.sunken,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flex: 1,
            alignItems: 'center',
            gap: spacing[8],
          }}
        >
          <FeeBlock label="Joining" value={card.joiningFee} />
          <View
            style={{
              width: borderWidth.thin,
              alignSelf: 'stretch',
              backgroundColor: colors.border.subtle,
            }}
          />
          <FeeBlock label="Annual" value={card.annualFee} />
        </View>

        {/* Button's old rightIcon (ReactNode) prop is gone. The new
            API takes an `icon='trailing'` + `iconName` (IconName) pair,
            and there's no chevron-right SVG in src/assets/icons today,
            so the chevron is dropped for now. */}
        <Button
          label="Apply Now"
          variant="solid"
          tone="main"
          size={36}
          onPress={onPress}
        />
      </View>
    </Pressable>
  );
}
