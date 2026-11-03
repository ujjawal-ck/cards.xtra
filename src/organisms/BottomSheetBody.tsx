/**
 * BottomSheetBody — organism (Figma 2837:201368)
 *
 * One body container, ten templates. Every template COMPOSES existing
 * atoms/molecules (Image, Text, Input, Choice, ListRow, StatusBadge) —
 * no new primitives, no recreated components.
 *
 * Caller picks via the `template` prop and (optionally) overrides any
 * piece of sample content via the data props. The defaults make the
 * verification render realistic content without needing 50 props.
 *
 * Hex → token:
 *   #262626 → colors.text.primary
 *   #5c5c5c → colors.text.secondary
 *   #ff6d1d → colors.action.primary.default (also colors.cashback.default)
 *   #ffffff → colors.surface.default
 */
import React, { useState } from 'react';
import {
  View,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, StatusBadge, Input, Divider, Icon } from '../atoms';
import type { StatusBadgeStatus, IconName } from '../atoms';
import { Choice, ListRow, DiscBulletList } from '../molecules';
import { colors, spacing, radius } from '../tokens';

export type BottomSheetTemplate =
  | 'image-only'
  | 'eligibility-checker'
  | 'cashback-status'
  | 'month-picker'
  | 'text-only'
  | 'image-heading-body'
  // 156×156 illustration (Figma "Image/ScreenState") + optional heading +
  // body, centered. Used by the store-page info sheets (app-orders /
  // tracking / confirmation). Pass the illustration via `image`.
  | 'icon-heading-body'
  | 'money-status'
  | 'reward-rates'
  // List body (Figma offers/brand/bottomsheet): saffron rate rows with
  // dashed separators, and an intro line + disc bullets.
  | 'rate-list'
  | 'terms-list'
  // Intro line + NUMBERED-pill rows (same number-bullet ListRow the store
  // page's Benefits block uses on-page) — so "See Offer Details" reads
  // identically inside the sheet and outside it.
  | 'numbered-list'
  | 'selector'
  | 'filters';

export interface BottomSheetBodyProps {
  template: BottomSheetTemplate;
  image?: ImageSourcePropType;
  /** Legacy fallback for `icon-heading-body` when no `image` is supplied. */
  icon?: IconName;
  heading?: string;
  body?: string;
  note?: string;
  text?: string;
  amount?: string;
  description?: string;
  status?: StatusBadgeStatus;
  /** For amount-status sections (`cashback-status`). */
  sections?: Array<{
    title: string;
    items: Array<{
      value: string;
      biline: string;
      status: StatusBadgeStatus;
    }>;
  }>;
  /** For `reward-rates` / `rate-list`. */
  rewardRates?: Array<{ rate: string; description: string }>;
  /** For `terms-list` — disc bullets below the intro line (`text`). */
  bullets?: string[];
  /** For `month-picker` / `selector`. */
  options?: string[];
  /**
   * For `month-picker`: controlled selected index. When provided together
   * with `onSelect`, MonthPicker becomes controlled and propagates taps to
   * the host (so a screen can re-filter on month change). Omit both to keep
   * the legacy uncontrolled behaviour (internal state, idx 0 default).
   */
  selectedIndex?: number;
  /** For `month-picker`: fires the tapped index (controlled mode). */
  onSelect?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Image dimensions for image-only / image-heading-body — not in
// spacing scale; component-spec local consts.
const IMAGE_ONLY_HEIGHT = 220;
const ILLUSTRATION_SIZE = 156;

// ----------------------------------------------------------------------------
// Default sample data — used when the caller doesn't override
// ----------------------------------------------------------------------------
const DEFAULT_CASHBACK_SECTIONS: NonNullable<
  BottomSheetBodyProps['sections']
> = [
  {
    title: 'Confirmed',
    items: [
      { value: '₹1,240', biline: 'Cashback on Amazon order #A1284', status: 'confirmed' },
      { value: '₹680', biline: 'Cashback on Flipkart order #F9921', status: 'confirmed' },
      { value: '₹450', biline: 'Cashback on Myntra order #M5532', status: 'confirmed' },
    ],
  },
  {
    title: 'Pending',
    items: [
      { value: '₹920', biline: 'Cashback on Tata Cliq order #T4421', status: 'pending' },
      { value: '₹560', biline: 'Cashback on Foxtale order #X8810', status: 'pending' },
      { value: '₹340', biline: 'Cashback on Reliance Digital #R7755', status: 'pending' },
    ],
  },
];

const DEFAULT_MONTHS = ['This month', 'Last month', 'Last 3 months', 'Last 6 months'];

const DEFAULT_REWARD_RATES: NonNullable<
  BottomSheetBodyProps['rewardRates']
> = [
  { rate: '5%', description: 'on Amazon, Flipkart, and 100+ online stores.' },
  { rate: '3%', description: 'on dining at partner restaurants.' },
  { rate: '2%', description: 'on fuel at HPCL, BPCL, IOC stations.' },
  { rate: '1%', description: 'on all other spends.' },
  { rate: '5%', description: 'on Amazon Pay merchants for Prime members.' },
  { rate: '0%', description: 'foreign-currency markup on Atlas card.' },
];

const DEFAULT_SELECTOR_OPTIONS = ['Shopping', 'Travel', 'Dining', 'Fuel'];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function BottomSheetBody({
  template,
  image,
  icon,
  heading = 'Heading',
  body = 'Body copy for the bottom sheet.',
  note = 'Note: smaller supporting text.',
  text = 'Text content placeholder.',
  amount = '₹920',
  description = 'Cashback on Reliance Digital order #R7755',
  status = 'pending',
  sections = DEFAULT_CASHBACK_SECTIONS,
  rewardRates = DEFAULT_REWARD_RATES,
  bullets = [],
  options,
  selectedIndex,
  onSelect,
  style,
}: BottomSheetBodyProps) {
  switch (template) {
    // -------------------------------------------------------------------
    case 'image-only':
      return (
        <View style={[{ width: '100%' }, style]}>
          {image ? (
            <Image
              source={image}
              style={{
                width: '100%',
                height: IMAGE_ONLY_HEIGHT,
                backgroundColor: colors.surface.sunken,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: IMAGE_ONLY_HEIGHT,
                backgroundColor: colors.surface.sunken,
              }}
            />
          )}
        </View>
      );

    // -------------------------------------------------------------------
    case 'eligibility-checker':
      return (
        <View
          style={[
            { paddingHorizontal: spacing[16], gap: spacing[8] + spacing[2] },
            style,
          ]}
        >
          <Input label="Monthly income" placeholder="Enter your income" keyboardType="number-pad" />
          <Input label="City" placeholder="Enter your city" />
          <View style={{ gap: spacing[8] }}>
            <Text variant="body12Medium" color={colors.text.secondary}>
              Income type
            </Text>
            <EligibilityIncomeType />
          </View>
        </View>
      );

    // -------------------------------------------------------------------
    case 'cashback-status':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[24],
              gap: spacing[32],
            },
            style,
          ]}
        >
          {sections.map((section, sIdx) => (
            <View key={sIdx} style={{ gap: spacing[12] }}>
              <Text variant="heading18SemiBold" color={colors.text.primary}>
                {section.title}
              </Text>
              <View style={{ gap: spacing[16] }}>
                {section.items.map((item, iIdx) => (
                  <React.Fragment key={iIdx}>
                    <ListRow
                      type="amount-status"
                      value={item.value}
                      biline={item.biline}
                      status={item.status}
                    />
                    {iIdx < section.items.length - 1 ? (
                      <Divider style="solid" />
                    ) : null}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}
        </View>
      );

    // -------------------------------------------------------------------
    case 'month-picker':
      return (
        <MonthPicker
          options={options ?? DEFAULT_MONTHS}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          style={style}
        />
      );

    // -------------------------------------------------------------------
    case 'text-only':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[24],
            },
            style,
          ]}
        >
          <Text variant="body16Regular" color={colors.text.primary}>
            {text}
          </Text>
        </View>
      );

    // -------------------------------------------------------------------
    case 'image-heading-body':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[20],
              alignItems: 'center',
            },
            style,
          ]}
        >
          {image ? (
            <Image
              source={image}
              style={{
                width: ILLUSTRATION_SIZE,
                height: ILLUSTRATION_SIZE,
              }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                width: ILLUSTRATION_SIZE,
                height: ILLUSTRATION_SIZE,
                borderRadius: radius.lg,
                backgroundColor: colors.surface.sunken,
              }}
            />
          )}
          <Text
            variant="heading20SemiBold"
            color={colors.text.primary}
            align="center"
          >
            {heading}
          </Text>
          <Text
            variant="body16Regular"
            color={colors.text.primary}
            align="center"
          >
            {body}
          </Text>
          <Text
            variant="body12Regular"
            color={colors.text.secondary}
            align="center"
          >
            {note}
          </Text>
        </View>
      );

    // -------------------------------------------------------------------
    // Figma "Image/ScreenState" body (store-page timeline info sheets):
    // a 156×156 illustration, then a tightly-grouped heading + body.
    // Layout: illustration —gap 20— [heading —gap 4— body]. The heading
    // is optional (tracking / confirmation sheets are body-only).
    case 'icon-heading-body':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[20],
              alignItems: 'center',
            },
            style,
          ]}
        >
          {image ? (
            <Image
              source={image}
              style={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
              resizeMode="contain"
            />
          ) : icon ? (
            <Icon name={icon} size={ILLUSTRATION_SIZE} />
          ) : null}
          <View style={{ width: '100%', gap: spacing[4], alignItems: 'center' }}>
            {heading ? (
              <Text
                variant="heading20SemiBold"
                color={colors.text.primary}
                align="center"
              >
                {heading}
              </Text>
            ) : null}
            {body ? (
              <Text
                variant="body16Regular"
                color={colors.text.primary}
                align="center"
              >
                {body}
              </Text>
            ) : null}
          </View>
        </View>
      );

    // -------------------------------------------------------------------
    case 'money-status':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[20],
            },
            style,
          ]}
        >
          <Text variant="display32Bold" color={colors.text.primary}>
            {amount}
          </Text>
          <StatusBadge status={status} size="pill" />
          <Text variant="body17Regular" color={colors.text.primary}>
            {description}
          </Text>
        </View>
      );

    // -------------------------------------------------------------------
    case 'reward-rates':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[16],
              gap: spacing[12],
            },
            style,
          ]}
        >
          {rewardRates.map((r, i) => (
            <ListRow
              key={i}
              type="rate-description"
              rate={r.rate}
              description={r.description}
            />
          ))}
        </View>
      );

    // -------------------------------------------------------------------
    // Template A (List body) — Figma offers/brand/bottomsheet/rewards-rate.
    // 95px saffron value (ListRow rate-description) + flex label, dashed
    // Divider between rows. List padding px16/py20, gap8.
    case 'rate-list':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[8],
            },
            style,
          ]}
        >
          {rewardRates.map((r, i) => (
            <React.Fragment key={i}>
              <ListRow
                type="rate-description"
                rate={r.rate}
                description={r.description}
              />
              {i < rewardRates.length - 1 ? <Divider style="dashed" /> : null}
            </React.Fragment>
          ))}
        </View>
      );

    // -------------------------------------------------------------------
    // Template A (List body) — Figma offers/brand/bottomsheet/terms-conditions.
    // Intro line (`text`) + disc bullets (`bullets`). List px16/py20, gap8.
    case 'terms-list':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[8],
            },
            style,
          ]}
        >
          <Text variant="body14Regular" color={colors.text.primary}>
            {text}
          </Text>
          <DiscBulletList items={bullets} />
        </View>
      );

    // -------------------------------------------------------------------
    // Intro line (`text`) + numbered-pill rows (`bullets`) — REUSES the
    // ListRow `number-bullet` row so the sheet matches the on-page Benefits
    // list exactly (20px #262626 circle + number, body14 text).
    case 'numbered-list':
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[20],
              gap: spacing[12],
            },
            style,
          ]}
        >
          {text ? (
            <Text variant="body14Regular" color={colors.text.primary}>
              {text}
            </Text>
          ) : null}
          <View style={{ gap: spacing[8] }}>
            {bullets.map((item, i) => (
              <ListRow
                key={i}
                type="number-bullet"
                number={i + 1}
                description={item}
              />
            ))}
          </View>
        </View>
      );

    // -------------------------------------------------------------------
    case 'selector':
      return (
        <SelectorList
          options={options ?? DEFAULT_SELECTOR_OPTIONS}
          style={style}
        />
      );

    // -------------------------------------------------------------------
    case 'filters':
      // STUB — the _FilterMenu component isn't built yet. Spec: this
      // body slot will host that menu (multi-section filter UI with
      // chips, ranges, etc.) once it's spec'd. Until then, render a
      // labelled placeholder so screens that select template='filters'
      // don't render an empty body.
      return (
        <View
          style={[
            {
              paddingHorizontal: spacing[16],
              paddingVertical: spacing[24],
              gap: spacing[8],
            },
            style,
          ]}
        >
          <Text variant="heading18SemiBold" color={colors.text.primary}>
            Filters
          </Text>
          <Text variant="body14Regular" color={colors.text.secondary}>
            TODO: _FilterMenu component not built yet. This template
            will host the multi-section filter UI once that organism
            ships.
          </Text>
        </View>
      );
  }
}

// ----------------------------------------------------------------------------
// Small stateful sub-components — owning their own selection state so
// the parent BottomSheetBody can stay declarative + caller-friendly.
// ----------------------------------------------------------------------------

function EligibilityIncomeType() {
  const [v, setV] = useState<'salaried' | 'self-employed'>('salaried');
  return (
    <View style={{ gap: spacing[12] }}>
      <Choice
        type="radio"
        checked={v === 'salaried'}
        label="Salaried"
        onChange={() => setV('salaried')}
      />
      <Choice
        type="radio"
        checked={v === 'self-employed'}
        label="Self-employed"
        onChange={() => setV('self-employed')}
      />
    </View>
  );
}

function MonthPicker({
  options,
  selectedIndex,
  onSelect,
  style,
}: {
  options: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  // Controlled when the caller passes both selectedIndex + onSelect;
  // otherwise fall back to internal state (legacy default-selected idx 0).
  const isControlled = selectedIndex != null && onSelect != null;
  const [internal, setInternal] = useState(0);
  const selected = isControlled ? selectedIndex : internal;
  const handleSelect = (i: number) =>
    isControlled ? onSelect(i) : setInternal(i);
  return (
    <View
      style={[
        {
          paddingHorizontal: spacing[20],
          paddingVertical: spacing[24],
          gap: spacing[24],
        },
        style,
      ]}
    >
      {options.map((label, i) => (
        <Choice
          key={label}
          type="radio"
          checked={selected === i}
          label={label}
          onChange={() => handleSelect(i)}
        />
      ))}
    </View>
  );
}

function SelectorList({
  options,
  style,
}: {
  options: string[];
  style?: StyleProp<ViewStyle>;
}) {
  // Default: first option checked, rest unchecked.
  const [checked, setChecked] = useState<boolean[]>(() =>
    options.map((_, i) => i === 0)
  );
  return (
    <View
      style={[
        {
          paddingHorizontal: spacing[20],
          paddingVertical: spacing[24],
          gap: spacing[24],
        },
        style,
      ]}
    >
      {options.map((label, i) => (
        <Choice
          key={label}
          type="checkbox"
          checked={checked[i]}
          label={label}
          onChange={(next) =>
            setChecked((prev) => prev.map((v, idx) => (idx === i ? next : v)))
          }
        />
      ))}
    </View>
  );
}
