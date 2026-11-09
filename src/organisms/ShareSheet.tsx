/**
 * ShareSheet — organism (Figma node 3976:56803)
 *
 * Screen-CENTRED modal (NOT a bottom sheet). Uses RN's <Modal>
 * with `transparent + animationType='fade'`. The card detail sits
 * mounted underneath (it's a separate gorhom modal); pressing the
 * Share glyph on its header calls `shareSheetRef.current?.present()`
 * on THIS modal and it appears centred on top.
 *
 * Geometry — the floating card sits with spacing[20] (20 px) of
 * padding from EVERY screen edge. Vertical & horizontal centring is
 * driven by flex on the backdrop container.
 *
 * Body (inside a vertical ScrollView so very small phones can still
 * reach the CTA if the content overflows):
 *   1. "Found on CashKaro" preview card (full-width up to 312, 413
 *       tall, sunken bg, thin border, radius 2xl, overflow:hidden)
 *        - Title "Found on CashKaro" centered
 *        - Credit card image (242×154, radius xl) — flat
 *        - CashbackBadge (REUSED atom, size md, prefix "Upto",
 *          alignSelf:'center' override so it sits in the column centre)
 *        - Card name + subtitle
 *        - Footer text "Apply via CashKaro to earn cashback"
 *   2. Share-options row — 4 column tiles
 *   3. CTA — Solid Button (REUSED atom)
 *
 * Ref API:
 *   The forwarded ref exposes { present(): void; dismiss(): void }
 *   so call-site wiring matches the gorhom-modal pattern used by the
 *   sibling sheets:  shareSheetRef.current?.present()
 *
 * Components reused:
 *   • <CashbackBadge>  atom
 *   • <Button>         atom
 *   • <Text>           atom
 *   • <Icon>           atom (social-* glyphs)
 *   • <Image>          RN built-in (matches CardTile's pattern)
 *   • RN <Modal>       (animation + lifecycle)
 *   • RN <Pressable>   (backdrop dismiss)
 *
 * Hex → token:
 *   #f5f7f9     → colors.surface.sunken
 *   #ffffff     → colors.surface.default
 *   scrim       → alpha.black[50]
 *   border 1px  → borderWidth.thin + colors.border.default
 *   #ff6d1d     → colors.action.primary.default (Solid Button main)
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text, Button, CashbackBadge, Icon } from '../atoms';
import {
  colors,
  primitives,
  spacing,
  radius,
  borderWidth,
  alpha,
  iconSize,
} from '../tokens';

/** Imperative API exposed via the forwarded ref. Mirrors the
 *  gorhom-modal call-site shape so HomeScreen's wiring is unchanged. */
export interface ShareSheetRef {
  present: () => void;
  dismiss: () => void;
}

export interface ShareSheetProps {
  cardImage?: ImageSourcePropType;
  cardName?: string;
  cardSubtitle?: string;
  /** Full cashback string, e.g. "₹1200 Cashback". */
  cashbackValue?: string;
  onShare?: () => void;
  /** Fires after the close animation completes and the RN Modal has
   *  unmounted. Used by the caller to bring back any underlying sheet
   *  that was hidden when this modal was presented (so the share
   *  flow feels like a momentary detour, not a full dismiss). */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ---- Layout constants (per Figma 3976:56803). ----------------------
// Spec frame dims — not in the reusable spacing scale.
const PREVIEW_W = 312;
const PREVIEW_H = 413;
const PREVIEW_CARD_W = 242;
const PREVIEW_CARD_H = 154;
const PREVIEW_TITLE_TOP = 35;
const PREVIEW_FOOTER_TOP = 385;

const SOCIAL_TILE = 40;

// ---- Single share tile (icon + label) ------------------------------
// Every tile opens the system share sheet (the tiles used to be inert
// Views). Targeting a specific app needs per-app deep-link support that
// Expo Go can't guarantee; the OS sheet lists WhatsApp / Instagram /
// Facebook directly.
function ShareTile({
  iconName,
  label,
  bg,
  tint,
  onPress,
}: {
  iconName: 'social-whatsapp-filled' | 'social-instagram-filled' | 'social-facebook-filled';
  label: string;
  bg?: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Share via ${label}`}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: spacing[4],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: SOCIAL_TILE,
          height: SOCIAL_TILE,
          borderRadius: radius.md,
          backgroundColor: bg ?? 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Icon name={iconName} size={iconSize[40]} color={tint} />
      </View>
      <Text variant="caption10Medium" color={colors.text.tertiary} align="center">
        {label}
      </Text>
    </Pressable>
  );
}

function MoreTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="More share options"
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: spacing[4],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: SOCIAL_TILE,
          height: SOCIAL_TILE,
          borderRadius: radius.md,
          backgroundColor: primitives.saffron[200],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="body16Bold" color={colors.action.primary.default}>
          •••
        </Text>
      </View>
      <Text variant="caption10Medium" color={colors.text.tertiary} align="center">
        More
      </Text>
    </Pressable>
  );
}

// ---- ShareSheet body (the white card content) ----------------------
function ShareSheetBody({
  cardImage,
  cardName = 'AXIS Bank Neo Credit Card',
  cardSubtitle = 'Great for Shopping & Dining',
  cashbackValue = '₹1200 Cashback',
  onShare,
}: ShareSheetProps) {
  const handleShare = useCallback(() => {
    if (onShare) return onShare();
    Share.share({
      message: `Found ${cardName} on Cards.xtra by CashKaro — earn ${cashbackValue} on activation.`,
    }).catch(() => undefined);
  }, [onShare, cardName, cashbackValue]);

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        paddingTop: spacing[8],
        paddingBottom: spacing[8],
        gap: spacing[24],
      }}
    >
      {/* 1. Preview card ---------------------------------------- */}
      <View
        style={{
          width: '100%',
          maxWidth: PREVIEW_W,
          height: PREVIEW_H,
          backgroundColor: colors.surface.sunken,
          borderWidth: borderWidth.thin,
          borderColor: colors.border.default,
          borderRadius: radius['2xl'],
          overflow: 'hidden',
          position: 'relative',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: PREVIEW_TITLE_TOP,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Text variant="heading18SemiBold" color={colors.text.primary} align="center">
            Found on CashKaro
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing[16],
            paddingHorizontal: spacing[16],
            paddingTop: spacing[32],
          }}
        >
          {cardImage ? (
            <Image
              source={cardImage}
              style={{
                width: PREVIEW_CARD_W,
                height: PREVIEW_CARD_H,
                borderRadius: radius.xl,
                backgroundColor: colors.surface.default,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: PREVIEW_CARD_W,
                height: PREVIEW_CARD_H,
                borderRadius: radius.xl,
                backgroundColor: colors.surface.default,
              }}
            />
          )}

          {/* CashbackBadge centred. The atom defaults to
              alignSelf:'flex-start' so it would hug the left edge of
              the column flex container; override to centre it. */}
          <CashbackBadge
            showPrefix
            prefix="Upto"
            value={cashbackValue}
            size="md"
            style={{ alignSelf: 'center' }}
          />

          <View style={{ alignItems: 'center', gap: spacing[4] }}>
            <Text variant="body16SemiBold" color={colors.text.primary} align="center">
              {cardName}
            </Text>
            <Text variant="body12Regular" color={colors.text.secondary} align="center">
              {cardSubtitle}
            </Text>
          </View>
        </View>

        <View
          style={{
            position: 'absolute',
            top: PREVIEW_FOOTER_TOP,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Text variant="body12Regular" color={colors.text.secondary} align="center">
            Apply via CashKaro to earn cashback
          </Text>
        </View>
      </View>

      {/* 2. Share options row ----------------------------------- */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          gap: spacing[8],
          justifyContent: 'center',
          paddingHorizontal: spacing[24],
        }}
      >
        <ShareTile iconName="social-whatsapp-filled" label="WhatsApp" onPress={handleShare} />
        <ShareTile iconName="social-instagram-filled" label="Instagram" onPress={handleShare} />
        <ShareTile
          iconName="social-facebook-filled"
          label="Facebook"
          bg={primitives.cobalt[450]}
          tint={colors.text.inverse}
          onPress={handleShare}
        />
        <MoreTile onPress={handleShare} />
      </View>

      {/* 3. CTA --------------------------------------------------- */}
      <View style={{ width: '100%', paddingHorizontal: spacing[12] }}>
        <Button
          label="Share"
          variant="solid"
          tone="main"
          size={44}
          fullWidth
          onPress={handleShare}
        />
      </View>
    </View>
  );
}

// ---- Outer modal — RN Modal, centred, scrim backdrop ---------------
// Animation choreography (driven by a single shared value `progress`,
// 0 = hidden, 1 = fully shown):
//
//   Enter — withSpring(1, { damping 14, stiffness 180, mass 0.8 })
//     • Backdrop fades 0 → 1   (linear-via-clamp; reads ~280 ms)
//     • Card opacity 0 → 1     (clamped to backdrop curve)
//     • Card scale 0.92 → 1    (springy — finishes with a hair of
//                               overshoot for a delightful pop)
//     • Card translateY +16 → 0 (gentle rise from below centre)
//
//   Exit — withTiming(0, { 220 ms, Easing.in(Easing.cubic) })
//     • Card falls + shrinks back, backdrop fades; on completion
//       runOnJS flips `visible` to false to unmount the modal.
//
// Why a shared `progress` value drives BOTH backdrop and card: the
// two layers stay in lockstep, and the spring curve naturally
// coordinates them — no separate sequence to chase.
const SPRING_IN = { damping: 14, stiffness: 180, mass: 0.8 };
const TIMING_OUT = { duration: 220, easing: Easing.in(Easing.cubic) };

export const ShareSheet = forwardRef<ShareSheetRef, ShareSheetProps>(
  (props, ref) => {
    const { onDismiss } = props;
    const [visible, setVisible] = useState(false);
    const progress = useSharedValue(0);
    // Guards against double-fire when dismiss() is called repeatedly
    // (or a tap-outside happens twice in 220 ms). Cleared on present().
    const dismissing = useRef(false);

    // Runs on the JS thread once the exit animation finishes —
    // actually unmounts the RN Modal.
    const finalizeClose = useCallback(() => {
      setVisible(false);
      dismissing.current = false;
    }, []);

    // Kicks off the close animation AND fires `onDismiss`
    // IMMEDIATELY (not at animation end) so the caller can start
    // their parallel animation — e.g. re-presenting the underlying
    // CardDetailSheet — in lockstep with our exit. This eliminates
    // the perceived gap between "share modal closing" and "card
    // detail re-appearing."
    const startClose = useCallback(() => {
      if (dismissing.current) return;
      dismissing.current = true;
      onDismiss?.();
      progress.value = withTiming(0, TIMING_OUT, (finished) => {
        if (finished) runOnJS(finalizeClose)();
      });
    }, [progress, onDismiss, finalizeClose]);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          dismissing.current = false;
          setVisible(true);
          progress.value = 0;
          progress.value = withSpring(1, SPRING_IN);
        },
        dismiss: () => startClose(),
      }),
      [progress, startClose]
    );

    const handleClose = startClose;

    // Backdrop opacity clamped to [0, 1] so the spring's overshoot
    // doesn't push it past full opacity.
    const backdropStyle = useAnimatedStyle(() => ({
      opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    }));

    // Card transform — interpolate ranges go slightly past the spring
    // landing point so the overshoot reads as a soft "land" rather
    // than a clipped snap.
    const cardStyle = useAnimatedStyle(() => ({
      opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [16, 0]) },
        { scale: interpolate(progress.value, [0, 1], [0.92, 1]) },
      ] as unknown as { translateY: number }[],
    }));

    return (
      <Modal
        visible={visible}
        transparent
        // Animation is reanimated-driven; let the RN Modal mount/
        // unmount instantly so our curves own the entire feel.
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* Backdrop: full-screen scrim. Tap dismisses. spacing[20]
            on every side insets the card from the screen edges per
            the request. `justifyContent: center` vertically centres
            the floating card. */}
        <Animated.View
          style={[
            {
              flex: 1,
              // Darker scrim (alpha.black[80] = 0.8) — was 0.5. Makes
              // the floating modal pop and reads as "the page behind
              // is dimmed for focus" rather than "lightly veiled".
              backgroundColor: alpha.black[80],
            },
            backdropStyle,
          ]}
        >
          <Pressable
            onPress={handleClose}
            style={{
              flex: 1,
              padding: spacing[20],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Inner Animated.View runs the spring; nested Pressable
                with a no-op onPress swallows taps so pressing the
                card itself doesn't bubble up to the backdrop. */}
            <Animated.View
              style={[
                {
                  width: '100%',
                  // Cap width so on wider screens (or even iPhone
                  // Pro Max) the modal sits as a clearly floating
                  // card centred on the screen, rather than stretching
                  // edge-to-edge minus the 20-px backdrop padding.
                  // 360 px = preview card (312) + a bit of chrome.
                  maxWidth: 360,
                  maxHeight: '100%',
                  backgroundColor: colors.surface.default,
                  borderRadius: radius['2xl'],
                  overflow: 'hidden',
                },
                cardStyle,
              ]}
            >
              <Pressable onPress={() => undefined}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingVertical: spacing[16],
                    paddingHorizontal: spacing[16],
                  }}
                >
                  <ShareSheetBody {...props} />
                </ScrollView>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    );
  }
);

ShareSheet.displayName = 'ShareSheet';
