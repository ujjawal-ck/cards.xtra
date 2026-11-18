/**
 * DS-ADD(ds-figma-1, 2026-11-17): "how much do you spend on <brand> per month" card with a - / value / + stepper and a ruler.
 * Figma: Q7235KVU3sU3HOTiibOXhv node 1480:1271291 (SpendCard compact) and 1480:1271302 (Large). Metrics from Figma values (2026-11-17):
 * compact = radius 16, 1 px border, padding 16 / 16 / 8 / 16, gap 16, onLight/sm shadow; stepper box radius 8, padding 8 / 6, hairline;
 * tick 8 long, tick pitch 10; tick label under every 5th tick; selected value in a blue chip (radius 4) under the centre mark.
 * Large = radius 32, 1.5 border, padding 16, gap 18, centred title (18), stepper box padding 12 / 10 (48 high).
 * 2026-11-18: optional title (large size), optional unit 'count' (no rupee sign), and the live value is committed if the card unmounts mid-drag.
 * 2026-11-19: optional typed entry (`typedEntry`, `typedMax`, `useBottomSheetInput`). The value text becomes a field; the ruler
 * stops at `max` (the ruler end) and a typed value above it pins the ruler at its end. Default look and behaviour are unchanged.
 * Rollback: delete this file, src/lib/spendRuler.ts (+ test), and its DS-ADD export lines in src/molecules/index.ts.
 *
 * SpendCard — molecule. New part. Overlaps AmountInput (see docs/ds-additions.md): AmountInput types an
 * amount, SpendCard picks one by dragging. Ruler = horizontal ScrollView with snapToInterval, no slider package.
 * The value under the centre mark is the value; tick maths lives in src/lib/spendRuler.ts. Limits and the
 * number format come from src/lib/amountInput.ts. Not run on a device: check drag feel and the end-of-ruler behaviour.
 * Accessibility: the ruler is one adjustable element (swipe up / down to step); the - / + buttons draw at 16 and keep a 44 dp hit area.
 * Type (nearest Outfit): title body14SemiBold (Figma sf-pro 600 14), subtitle caption10Regular (Figma 11, we have no 11),
 * value body16Bold (Figma Outfit 700 16), tick label caption10Regular (Figma 11), chip caption10Medium.
 * Not built: the image holder that overlaps the Large card top edge (the logo shows above the title instead).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  Pressable,
  ImageSourcePropType,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Text } from '../atoms';
import { colors, spacing, radius, borderWidth, sizing, mediaSize, elevation, typography } from '../tokens';
import { formatINR } from '../lib/money';
import { formatAmount, parseAmount, clampAmount } from '../lib/amountInput';
import {
  tickCount,
  valueToOffset,
  offsetToValue,
  stepValue,
  stepTyped,
  rulerStep,
  isLabelTick,
  type RulerConfig,
} from '../lib/spendRuler';

export interface SpendCardProps {
  name: string;
  logo?: ImageSourcePropType;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** A label shows under every Nth tick. Default 5 (Figma). */
  labelEvery?: number;
  period?: string;
  /** 'compact' (default): name left, stepper right. 'large': centred question title above the stepper. */
  size?: 'compact' | 'large';
  /** Large size only. Replaces the built title "{name} spends {period}?". An empty string shows no title. */
  title?: string;
  /** 'rupees' (default) shows ₹ amounts. 'count' shows plain whole numbers, e.g. visits. */
  unit?: 'rupees' | 'count';
  /**
   * Off by default. When true the value is a field the user can type in. `max` stays the ruler end;
   * a typed value above it keeps the ruler pinned at its end and the typed value is shown.
   */
  typedEntry?: boolean;
  /** Typed entry only: the highest amount the user can type. Default `max`. */
  typedMax?: number;
  /** Typed entry only: set when the card is inside a gorhom bottom sheet. */
  useBottomSheetInput?: boolean;
}

const formatCount = (n: number) => String(Math.round(n));

// Figma: tick pitch 10, tick length 8.
const TICK_GAP = spacing[10];
const TICK_LEN = spacing[8];
const LABEL_ROW = spacing[24];
// Figma Large gap is 18, which is not on the spacing scale: 16 + 2.
const LARGE_GAP = spacing[16] + spacing[2];

export function SpendCard({
  name,
  logo,
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 500,
  labelEvery = 5,
  period = 'per month',
  size = 'compact',
  title,
  unit = 'rupees',
  typedEntry = false,
  typedMax,
  useBottomSheetInput = false,
}: SpendCardProps) {
  const large = size === 'large';
  const formatValue = unit === 'count' ? formatCount : formatINR;
  const formatTick = unit === 'count' ? formatCount : formatAmount;
  // The ruler draws at most about 300 ticks; the buttons and typed entry use the real step.
  const cfg: RulerConfig = { min, max, step: rulerStep(min, max, step), tickGap: TICK_GAP };
  const stepCfg: RulerConfig = { ...cfg, step };
  const limit = typedEntry ? Math.max(typedMax ?? max, max) : max;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const dragStartValue = useRef(min);
  // Set only by a real finger drag. An animated scrollTo (value prop change) also fires
  // onMomentumScrollEnd; that one must not change the value.
  const userDragged = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [live, setLive] = useState(value);
  const dragging = useRef(false);
  const ticks = tickCount(cfg);

  // Commit the latest live value if the card unmounts before the ruler settles (drag, then Next at once).
  const liveRef = useRef(value);
  const committedRef = useRef(value);
  const onChangeRef = useRef(onChange);
  liveRef.current = live;
  onChangeRef.current = onChange;
  useEffect(() => {
    committedRef.current = value;
  }, [value]);
  useEffect(
    () => () => {
      if (liveRef.current !== committedRef.current) onChangeRef.current(liveRef.current);
    },
    [],
  );

  // Keep the ruler in step with the value prop (stepper, preset, parent change).
  useEffect(() => {
    if (dragging.current) return;
    setLive(value);
    scrollRef.current?.scrollTo({ x: valueToOffset(value, cfg), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, step, width]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (dragging.current) setLive(offsetToValue(e.nativeEvent.contentOffset.x, cfg));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step],
  );

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    if (!userDragged.current) return;
    userDragged.current = false;
    const v = offsetToValue(e.nativeEvent.contentOffset.x, cfg);
    // A typed value above the ruler end: a touch that does not move the ruler keeps the typed value.
    if (value > max && v === max && dragStartValue.current === max) {
      setLive(value);
      return;
    }
    setLive(v);
    if (v !== value) {
      committedRef.current = v;
      onChange(v);
    }
  };

  const bump = (dir: 1 | -1) => {
    const next = typedEntry ? stepTyped(live, dir, stepCfg, limit) : stepValue(live, dir, cfg);
    setLive(next);
    if (editing) setDraft(next > 0 ? formatAmount(next) : '');
    committedRef.current = next;
    onChange(next);
  };

  const atMin = live <= min;
  const atMax = live >= limit;

  const onType = (text: string) => {
    const parsed = parseAmount(text);
    const n = parsed == null ? 0 : clampAmount(parsed, min, limit);
    setDraft(parsed == null ? '' : formatAmount(n));
    setLive(n);
    committedRef.current = n;
    onChange(n);
  };

  const ValueField = useBottomSheetInput ? BottomSheetTextInput : TextInput;

  // Figma draws the buttons at 16; hitSlop keeps the touch area at 44 dp.
  const stepper = (label: string, glyph: string, dir: 1 | -1, disabled: boolean) => (
    <Pressable
      onPress={() => bump(dir)}
      disabled={disabled}
      hitSlop={(sizing.touchMin - spacing[16]) / 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        width: spacing[16],
        height: spacing[16],
        borderRadius: radius.lg,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border.subtle3,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="caption10SemiBold" color={disabled ? colors.text.disabled : colors.text.link}>
        {glyph}
      </Text>
    </Pressable>
  );

  const stepperBox = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        paddingHorizontal: large ? spacing[10] : spacing[6],
        paddingVertical: large ? spacing[12] : spacing[8],
        borderRadius: radius.sm,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border.subtle2,
        backgroundColor: colors.background.lavender,
      }}
    >
      {stepper(`Decrease ${name} spend`, '−', -1, atMin)}
      {typedEntry ? (
        <ValueField
          value={editing ? draft : formatValue(live)}
          onChangeText={onType}
          onFocus={() => {
            setDraft(live > 0 ? formatAmount(live) : '');
            setEditing(true);
          }}
          onBlur={() => setEditing(false)}
          placeholder="0"
          placeholderTextColor={colors.text.placeholder}
          selectionColor={colors.action.accent.default}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={String(limit).length + Math.ceil(String(limit).length / 2)}
          accessibilityLabel={`${name} amount`}
          style={[
            typography.body16Bold,
            { color: colors.text.link, textAlign: 'center', minWidth: spacing[64], padding: 0 },
          ]}
        />
      ) : (
        <Text variant="body16Bold" color={colors.text.link} style={{ minWidth: spacing[48] }} align="center">
          {formatValue(live)}
        </Text>
      )}
      {stepper(`Increase ${name} spend`, '+', 1, atMax)}
    </View>
  );

  return (
    <View
      style={[
        {
          borderRadius: large ? radius['3xl'] : radius.xl,
          borderWidth: large ? borderWidth.thick : borderWidth.thin,
          borderColor: colors.border.subtle2,
          backgroundColor: colors.surface.default,
          paddingTop: spacing[16],
          paddingHorizontal: spacing[16],
          paddingBottom: large ? spacing[16] : spacing[8],
          gap: large ? LARGE_GAP : spacing[16],
          overflow: 'hidden',
        },
        elevation.light.sm,
      ]}
    >
      {large ? (
        <View style={{ alignItems: 'center', gap: spacing[12] }}>
          {logo ? (
            <Image
              source={logo}
              accessibilityIgnoresInvertColors
              style={{ width: mediaSize[56], height: mediaSize[56], resizeMode: 'contain', borderRadius: radius.sm }}
            />
          ) : null}
          {title === '' ? null : (
            <Text variant="heading18SemiBold" color={colors.text.primary} align="center">
              {title ?? `${name} spends ${period}?`}
            </Text>
          )}
          {stepperBox}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}>
          {logo ? (
            <Image
              source={logo}
              accessibilityIgnoresInvertColors
              style={{ width: mediaSize[40], height: mediaSize[40], resizeMode: 'contain', borderRadius: radius.sm }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text variant="body14SemiBold" color={colors.text.primary} numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption10Regular" color={colors.text.secondary}>
              {period}
            </Text>
          </View>
          {stepperBox}
        </View>
      )}

      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${name} spend ${period}`}
        accessibilityValue={{ min, max: limit, now: live, text: formatValue(live) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={{ marginHorizontal: -spacing[16] }}
      >
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_GAP}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScrollBeginDrag={(e) => {
              dragging.current = true;
              userDragged.current = true;
              dragStartValue.current = offsetToValue(e.nativeEvent.contentOffset.x, cfg);
            }}
            onScroll={onScroll}
            onScrollEndDrag={(e) => {
              // A drag that stops with no momentum settles here; with momentum, onMomentumScrollEnd does.
              if (e.nativeEvent.velocity && Math.abs(e.nativeEvent.velocity.x) > 0.05) return;
              settle(e);
            }}
            onMomentumScrollEnd={settle}
            contentContainerStyle={{ paddingHorizontal: width / 2 }}
          >
            {Array.from({ length: ticks }, (_, i) => {
              const major = isLabelTick(i, labelEvery);
              return (
                <View key={i} style={{ width: TICK_GAP, alignItems: 'center' }}>
                  <View
                    style={{
                      width: borderWidth.hairline,
                      height: TICK_LEN,
                      backgroundColor: major ? colors.border.strong : colors.border.default,
                    }}
                  />
                  <View style={{ height: LABEL_ROW, justifyContent: 'center' }}>
                    {major ? (
                      <Text
                        variant="caption10Regular"
                        color={colors.text.secondary}
                        numberOfLines={1}
                        style={{ width: spacing[64], textAlign: 'center' }}
                      >
                        {formatTick(min + i * cfg.step)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
        {/* Centre mark and selected-value chip: fixed over the ruler. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: width / 2 - borderWidth.thin,
            width: borderWidth.thin * 2,
            height: TICK_LEN * 2,
            backgroundColor: colors.action.accent.default,
          }}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: TICK_LEN, left: 0, right: 0, height: LABEL_ROW, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              minWidth: spacing[24],
              paddingHorizontal: spacing[4],
              paddingVertical: borderWidth.thin,
              borderRadius: radius.xs,
              backgroundColor: colors.action.accent.default,
              alignItems: 'center',
            }}
          >
            <Text variant="caption10Medium" color={colors.text.inverse}>
              {formatTick(live)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
