/**
 * ListRow — molecule (Figma set 3011:266686)
 *
 * One component, twelve render modes via `type`. Each variant has its
 * own alignment / typography / icon size — they're enumerated in the
 * row-renderer table below. All rows width-fill their parent (the spec
 * 328 = parent width minus 16px side padding on a 360-wide phone).
 *
 * Typography (all keys exist in src/tokens/typography.ts):
 *   Outfit Regular  10/14  → caption10Regular  (we use caption10SemiBold
 *                                                for the number bullet)
 *   Outfit Regular  12/16  → body12Regular
 *   Outfit Regular  14/20  → body14Regular
 *   Outfit Medium   12/16  → body12Medium
 *   Outfit Medium   14/20  → body14Medium
 *   Outfit Medium   15/21  → body15Medium
 *   Outfit SemiBold 14/20  → body14SemiBold
 *   Outfit Bold     16     → body16Bold       (used as the ExtraBold-ish
 *                                                "₹value" — heading16ExtraBold
 *                                                is the closest ExtraBold/16
 *                                                token, used here)
 *   Outfit Bold     20/28  → heading20Bold
 *
 * Token mapping for the colours called out in the spec:
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 *   #ff6d1d → colors.cashback.default        (Saffron-500)
 *   #0741ef → colors.action.accent.default   (Cobalt-500)
 *   #0036da → colors.text.link               (Cobalt-700)
 *   #ff8540 → colors.status.delayed.dot      (Saffron-400; the only
 *                                              semantic token that maps
 *                                              to this primitive)
 *   #fff    → colors.surface.default
 *
 * Chevrons: there's no chevron-right SVG in src/assets/icons, so the
 * chevron glyph is rendered as Unicode '›' via raw RN Text sized with
 * the iconSize token. Swap when a real chevron icon ships.
 */
import React from 'react';
import {
  View,
  Pressable,
  Image,
  Text as RNText,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Icon, StatusBadge } from '../atoms';
import type { IconName, StatusBadgeStatus } from '../atoms';
import { haptics } from '../lib/haptics';
import {
  colors,
  spacing,
  radius,
  iconSize,
} from '../tokens';

export type ListRowType =
  | 'number-bullet'
  | 'thumbnail-key-chevron'
  | 'icon-definition'
  | 'icon-caption-value'
  | 'bullet-point'
  | 'icon-caption'
  | 'amount-status'
  | 'caption-value'
  | 'caption-cta'
  | 'menu-option'
  | 'simple-bullet'
  | 'rate-description';

export interface ListRowProps {
  type: ListRowType;
  // Data — every prop is optional; the renderer reads only what its
  // type needs. Keeps the API ergonomic at the cost of TS-strictness.
  number?: number | string;
  description?: string;
  text?: string;
  caption?: string;
  value?: string;
  label?: string;
  rate?: string;
  title?: string;
  biline?: string;
  icon?: IconName;
  thumbnail?: ImageSourcePropType;
  status?: StatusBadgeStatus;
  onPress?: () => void;
  onCta?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ----------------------------------------------------------------------------
// Local consts — component-spec values not in the shared token scale.
// ----------------------------------------------------------------------------
const NUMBER_BULLET_DIA = 20;
const THUMBNAIL_SIZE = 48;
const RATE_BLOCK_W = 95;

// Vertical gap between value and biline in 'amount-status'. Spec says
// 10; nearest spacing token is 8.
const AMOUNT_STATUS_GAP = spacing[8];

// Chevron renderer — Unicode '›' sized with iconSize; tinted to
// text.secondary by default.
function Chevron({
  size = iconSize[24],
  color = colors.text.secondary,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <RNText style={{ fontSize: size, lineHeight: size, color }}>›</RNText>
  );
}

// Outer wrapper — sets full-width + lets callers pass `style` through.
function Row({
  style,
  children,
  ...rest
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
} & React.ComponentProps<typeof View>) {
  return (
    <View {...rest} style={[{ width: '100%' }, style]}>
      {children}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Per-type renderers
// ----------------------------------------------------------------------------

function NumberBullet({ number, description }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[8],
      }}
    >
      <View
        style={{
          width: NUMBER_BULLET_DIA,
          height: NUMBER_BULLET_DIA,
          borderRadius: radius.full,
          backgroundColor: colors.text.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption10SemiBold" color={colors.surface.default}>
          {number}
        </Text>
      </View>
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {description}
      </Text>
    </Row>
  );
}

function ThumbnailKeyChevron({
  thumbnail,
  text,
  onPress,
}: ListRowProps) {
  const content = (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: spacing[8],
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12], flex: 1 }}
      >
        {thumbnail ? (
          <Image
            source={thumbnail}
            style={{
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              borderRadius: radius.sm,
            }}
            resizeMode="cover"
          />
        ) : null}
        <Text
          variant="body15Medium"
          color={colors.text.primary}
          style={{ flex: 1 }}
        >
          {text}
        </Text>
      </View>
      <Chevron size={iconSize[24]} color={colors.text.secondary} />
    </Row>
  );
  return onPress ? (
    <Pressable
      onPress={() => {
        haptics.impact('light');
        onPress?.();
      }}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

function IconDefinition({ description }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[4],
      }}
    >
      <View style={{ paddingTop: spacing[2] }}>
        <Icon
          name="feat-dot-filled"
          size={iconSize[16]}
          color={colors.status.delayed.dot}
        />
      </View>
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {description}
      </Text>
    </Row>
  );
}

function IconCaptionValue({
  icon,
  caption,
  value,
}: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[8],
          flex: 1,
        }}
      >
        {icon ? (
          <Icon
            name={icon}
            size={iconSize[20]}
            color={colors.text.primary}
          />
        ) : null}
        <Text
          variant="body14Regular"
          color={colors.text.primary}
          style={{ flex: 1 }}
        >
          {caption}
        </Text>
      </View>
      <Text
        variant="body14Medium"
        color={colors.text.primary}
        align="right"
      >
        {value}
      </Text>
    </Row>
  );
}

function BulletPoint({ description }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[4],
      }}
    >
      <View style={{ paddingTop: spacing[2] }}>
        <Icon
          name="feat-dot-filled"
          size={iconSize[16]}
          color={colors.action.accent.default}
        />
      </View>
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {description}
      </Text>
    </Row>
  );
}

function IconCaption({ icon, caption }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[4],
      }}
    >
      {icon ? (
        <Icon
          name={icon}
          size={iconSize[16]}
          color={colors.text.secondary}
        />
      ) : null}
      <Text
        variant="body12Regular"
        color={colors.text.secondary}
        style={{ flex: 1 }}
      >
        {caption}
      </Text>
    </Row>
  );
}

function AmountStatus({ value, biline, status }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: AMOUNT_STATUS_GAP, flex: 1 }}>
        <Text variant="heading16ExtraBold" color={colors.text.primary}>
          {value}
        </Text>
        {biline ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            {biline}
          </Text>
        ) : null}
      </View>
      {status ? <StatusBadge status={status} size="pill" /> : null}
    </Row>
  );
}

function CaptionValue({ label, value }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        variant="body14SemiBold"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        align="right"
      >
        {value}
      </Text>
    </Row>
  );
}

function CaptionCta({ label, onCta }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        variant="body14SemiBold"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Pressable
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel="View"
        hitSlop={spacing[8]}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[4],
        }}
      >
        <Text variant="body14Medium" color={colors.text.link}>
          View
        </Text>
        <Chevron size={iconSize[20]} color={colors.text.link} />
      </Pressable>
    </Row>
  );
}

function MenuOption({ icon, title, onPress }: ListRowProps) {
  const content = (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[8],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          flex: 1,
        }}
      >
        {icon ? (
          <Icon
            name={icon}
            size={iconSize[24]}
            // Figma menu icons are icon/Features grey, not the text colour.
            color={colors.icon.features}
          />
        ) : null}
        <Text
          variant="body14Medium"
          color={colors.text.primary}
          style={{ flex: 1 }}
        >
          {title}
        </Text>
      </View>
      <Chevron size={iconSize[24]} color={colors.text.secondary} />
    </Row>
  );
  return onPress ? (
    <Pressable
      onPress={() => {
        haptics.impact('light');
        onPress?.();
      }}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

function SimpleBullet({ description }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <Text
        variant="body14Regular"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {description}
      </Text>
    </Row>
  );
}

function RateDescription({ rate, description }: ListRowProps) {
  return (
    <Row
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
      }}
    >
      <View
        style={{
          width: RATE_BLOCK_W,
          alignItems: 'center',
        }}
      >
        <Text
          variant="heading20Bold"
          color={colors.cashback.default}
          align="center"
        >
          {rate}
        </Text>
      </View>
      <Text
        variant="body12Medium"
        color={colors.text.primary}
        style={{ flex: 1 }}
      >
        {description}
      </Text>
    </Row>
  );
}

// ----------------------------------------------------------------------------
// Dispatcher
// ----------------------------------------------------------------------------
export function ListRow(props: ListRowProps) {
  switch (props.type) {
    case 'number-bullet':
      return <NumberBullet {...props} />;
    case 'thumbnail-key-chevron':
      return <ThumbnailKeyChevron {...props} />;
    case 'icon-definition':
      return <IconDefinition {...props} />;
    case 'icon-caption-value':
      return <IconCaptionValue {...props} />;
    case 'bullet-point':
      return <BulletPoint {...props} />;
    case 'icon-caption':
      return <IconCaption {...props} />;
    case 'amount-status':
      return <AmountStatus {...props} />;
    case 'caption-value':
      return <CaptionValue {...props} />;
    case 'caption-cta':
      return <CaptionCta {...props} />;
    case 'menu-option':
      return <MenuOption {...props} />;
    case 'simple-bullet':
      return <SimpleBullet {...props} />;
    case 'rate-description':
      return <RateDescription {...props} />;
  }
}
