/**
 * SearchTopSheet — organism (Figma 4798:46697)
 *
 * App-wide search overlay that slides DOWN from the top of the screen
 * when the user taps any search bar / search icon. Built on top of
 * react-native's <Modal> + react-native-reanimated for the slide.
 *
 * Composition (no rebuilds):
 *   - <SearchBar> (molecule)  — state='filled' for 'suggestions',
 *                               state='focused' for 'history'.
 *   - <Chip>      (atom)      — recent-search tags in 'history'.
 *   - <BrandLogo> via SearchBar's result rows (internally) for
 *                               'suggestions' results.
 *
 * Behaviour:
 *   - `visible` flips → sheet translateY animates from off-screen-top
 *     (−SCREEN_H) to 0 over 250 ms, ease-out cubic. Tapping the dim
 *     backdrop OR the SearchBar's back arrow fires `onClose` and the
 *     sheet slides back up. The <Modal>'s `visible` is held true
 *     through the closing tween via a local `mounted` flag so the
 *     slide-up animation is actually seen.
 *
 * Two variants:
 *   - 'suggestions' — SearchBar in 'filled' state with sample sections
 *                     ("Banks", "Cards") provided via the `sections` prop.
 *   - 'history'     — SearchBar in 'focused' state + a wrap of Chips
 *                     for recent searches.
 *
 * Global trigger:
 *   - <SearchTopSheetProvider> wraps the app (or a subtree) and exposes
 *     `useSearchTopSheet()` which returns `{ open, close, isOpen }`.
 *     Any search entry point calls `useSearchTopSheet().open(variant)`.
 *
 * Hex → token (none in this file): every value sourced from src/tokens.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Chip, Text } from '../atoms';
import type { IconName } from '../atoms';
import { SearchBar, SearchResults } from '../molecules';
import type { SearchResultSection } from '../molecules';
import { colors, spacing, radius, opacity } from '../tokens';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type SearchTopSheetVariant = 'suggestions' | 'history';

export interface SearchTopSheetRecent {
  label: string;
  leadingIcon?: IconName;
  /** Trailing icon for dismissing the recent (e.g. close X). Optional. */
  trailingIcon?: IconName;
}

export interface SearchTopSheetProps {
  visible: boolean;
  variant?: SearchTopSheetVariant;
  /** Used when variant='suggestions'. */
  sections?: SearchResultSection[];
  /** Used when variant='history'. */
  recentSearches?: SearchTopSheetRecent[];
  value?: string;
  placeholder?: string;
  onClose: () => void;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  onRecentPress?: (recent: SearchTopSheetRecent, index: number) => void;
  onResultPress?: (
    row: SearchResultSection['rows'][number],
    sectionIndex: number,
    rowIndex: number
  ) => void;
  style?: StyleProp<ViewStyle>;
}

// Animation timing — kept local to this sheet.
const SLIDE_DURATION_MS = 250;

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function SearchTopSheet({
  visible,
  variant = 'suggestions',
  sections = [],
  recentSearches = [],
  value,
  placeholder,
  onClose,
  onChangeText,
  onClear,
  onRecentPress,
  onResultPress,
  style,
}: SearchTopSheetProps) {
  // Screen height — used as the off-screen translateY. Read once per
  // mount; if the user rotates we re-read on next open.
  const screenH = useRef(Dimensions.get('window').height).current;

  // Status-bar / notch buffer — the Modal renders edge-to-edge (it's
  // `statusBarTranslucent`), so without this padding the SearchBar
  // tucks under the iOS notch. The sheet's white bg extends UP into
  // this padding so the status bar reads as part of the sheet.
  const insets = useSafeAreaInsets();

  // Keep the <Modal> mounted across the closing tween so the slide-up
  // is actually rendered. Unmount only after the tween completes.
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(-screenH);
  const backdropAlpha = useSharedValue(0);

  // Keyboard height — the sheet is top-anchored and edge-to-edge, so
  // when the keyboard is up we cap the sheet's height at the keyboard
  // top. The results then live in a ScrollView that fills the space
  // ABOVE the keyboard, so every result is reachable by scrolling
  // (previously the list overflowed off-screen with no way to scroll).
  const [keyboardH, setKeyboardH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardH(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardH(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withTiming(0, {
        duration: SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropAlpha.value = withTiming(opacity[50], {
        duration: SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else if (mounted) {
      // Animate out, then unmount after the tween.
      translateY.value = withTiming(
        -screenH,
        {
          duration: SLIDE_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
      backdropAlpha.value = withTiming(0, {
        duration: SLIDE_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, mounted, screenH, translateY, backdropAlpha]);

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    backgroundColor: colors.surface.dark,
    opacity: backdropAlpha.value,
  }));

  // Explicit max height for the results scroll area. Relying on
  // flexShrink alone is unreliable here because the sheet is an
  // auto-height absolutely-positioned node — Yoga doesn't reliably
  // redistribute a max-height clamp down to flex children, so the
  // ScrollView would grow to its full content and get clipped by the
  // sheet's `overflow: 'hidden'` (no scroll). Computing the height
  // directly guarantees the list scrolls within the space between the
  // pinned bar and the keyboard top.
  //   screenH − keyboard − statusbar/notch − bar − inter-gaps − paddings
  const BAR_H = spacing[48];
  const scrollMaxH = Math.max(
    spacing[96],
    screenH -
      keyboardH -
      (insets.top + spacing[16]) - // sheet paddingTop
      BAR_H - // pinned search bar
      spacing[10] - // gap between bar and results
      spacing[16] - // sheet paddingBottom
      spacing[8] // breathing room above the keyboard
  );

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dark status-bar icons while the white panel is open (Home's are
          light for its blue hero, so the clock/battery vanished). Only while
          visible, so closing restores the screen's own style. */}
      {visible ? <StatusBar style="dark" /> : null}
      {/* Dim backdrop — tap to dismiss */}
      <Pressable
        accessibilityLabel="Close search"
        accessibilityRole="button"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              ...StyleSheetAbsoluteFill,
            },
            backdropAnim,
          ]}
        />
      </Pressable>

      {/* Top-anchored sheet — paddingTop = safe-area inset so the
          status bar / notch area is part of the sheet's white bg and
          the SearchBar sits below the notch. Bottom corners use
          radius['2xl'] (24) — the closest token to the spec's 20,
          and matches the BottomSheet's top corner curve for visual
          consistency across sheets. */}
      <Animated.View
        // pointerEvents is auto so the inner SearchBar + chips are tappable.
        // maxHeight caps the sheet at the keyboard top so the results
        // ScrollView below the bar can shrink + scroll instead of running
        // off-screen.
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            maxHeight: screenH - keyboardH,
            backgroundColor: colors.surface.default,
            paddingTop: insets.top + spacing[16],
            paddingBottom: spacing[16],
            borderBottomLeftRadius: radius['2xl'],
            borderBottomRightRadius: radius['2xl'],
            overflow: 'hidden',
            alignItems: 'center',
          },
          sheetAnim,
          style,
        ]}
      >
        <View
          style={{
            width: '100%',
            flexShrink: 1,
            paddingHorizontal: spacing[16],
            gap: spacing[10],
          }}
        >
          {variant === 'suggestions' ? (
            <>
              {/* Bar stays pinned (no `sections` → bar only). */}
              <SearchBar
                state="filled"
                value={value ?? ''}
                placeholder={placeholder}
                onBack={onClose}
                onChangeText={onChangeText}
                onClear={onClear}
              />
              {value?.trim() && sections.length > 0 ? (
                // Results scroll within the space above the keyboard.
                // keyboardShouldPersistTaps → a result tap registers
                // without first being swallowed to dismiss the keyboard.
                <ScrollView
                  style={{ maxHeight: scrollMaxH }}
                  contentContainerStyle={{ paddingBottom: spacing[8] }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  <SearchResults
                    sections={sections}
                    onResultPress={onResultPress}
                  />
                </ScrollView>
              ) : value?.trim() ? (
                /* Typed query with nothing matching — say so (the panel used
                   to collapse to just the bar, which read as broken), and
                   offer the quick suggestions as a way out. */
                <View style={{ gap: spacing[12] }}>
                  <View style={{ gap: spacing[4] }}>
                    <Text variant="body14SemiBold" color={colors.text.primary}>
                      No results for “{value.trim()}”
                    </Text>
                    <Text variant="body12Regular" color={colors.text.secondary}>
                      Try a bank name like HDFC or SBI, or a card name.
                    </Text>
                  </View>
                  <RecentSearchTags items={recentSearches} onPress={onRecentPress} />
                </View>
              ) : recentSearches.length > 0 ? (
                /* Empty query → quick suggestions (top banks + a card),
                   Figma 1985:36934. Once the user types, the results
                   above take over and these hide. */
                <View style={{ gap: spacing[8] }}>
                  <Text variant="body12Medium" color={colors.text.tertiary}>
                    Popular searches
                  </Text>
                  <RecentSearchTags items={recentSearches} onPress={onRecentPress} />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <SearchBar
                state="focused"
                placeholder={placeholder}
                onBack={onClose}
                onChangeText={onChangeText}
              />
              <ScrollView
                style={{ maxHeight: scrollMaxH }}
                contentContainerStyle={{ paddingBottom: spacing[8] }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <RecentSearchTags
                  items={recentSearches}
                  onPress={onRecentPress}
                />
              </ScrollView>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

// React Native's StyleSheet.absoluteFill is a frozen object; spreading
// it directly into our style array isn't ideal because the type doesn't
// flow nicely with `style` arrays. Inline the four props here so the
// type stays narrow and there's no extra import.
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ----------------------------------------------------------------------------
// Recent search chips
// ----------------------------------------------------------------------------
function RecentSearchTags({
  items,
  onPress,
}: {
  items: SearchTopSheetRecent[];
  onPress?: (item: SearchTopSheetRecent, index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing[8],
      }}
    >
      {items.map((it, i) => (
        <Chip
          key={`${it.label}-${i}`}
          label={it.label}
          type="default"
          size={32}
          leadingIcon={it.leadingIcon}
          trailingIcon={it.trailingIcon}
          onPress={onPress ? () => onPress(it, i) : undefined}
        />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Global trigger — provider + hook
// ----------------------------------------------------------------------------
type SheetController = {
  isOpen: boolean;
  variant: SearchTopSheetVariant;
  open: (variant?: SearchTopSheetVariant) => void;
  close: () => void;
};

const SearchTopSheetContext = createContext<SheetController | null>(null);

/**
 * useSearchTopSheet — call `.open(variant)` from any search entry
 * point. Throws if used outside a <SearchTopSheetProvider>.
 */
export function useSearchTopSheet() {
  const ctx = useContext(SearchTopSheetContext);
  if (!ctx) {
    throw new Error(
      'useSearchTopSheet must be used inside <SearchTopSheetProvider>.'
    );
  }
  return ctx;
}

export interface SearchTopSheetProviderProps {
  children: React.ReactNode;
  /** Sheet props that don't vary per call site. */
  defaultProps?: Partial<
    Omit<SearchTopSheetProps, 'visible' | 'variant' | 'onClose'>
  >;
}

/**
 * Wrap the app (or a subtree) so any descendant can open the sheet:
 *
 *   <SearchTopSheetProvider defaultProps={{ sections: [...] }}>
 *     <App />
 *   </SearchTopSheetProvider>
 *
 *   // inside any screen:
 *   const { open } = useSearchTopSheet();
 *   <Pressable onPress={() => open('history')}>...</Pressable>
 */
export function SearchTopSheetProvider({
  children,
  defaultProps,
}: SearchTopSheetProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<SearchTopSheetVariant>('suggestions');

  const controller = useMemo<SheetController>(
    () => ({
      isOpen,
      variant,
      open: (v) => {
        if (v) setVariant(v);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [isOpen, variant]
  );

  return (
    <SearchTopSheetContext.Provider value={controller}>
      {children}
      <SearchTopSheet
        {...defaultProps}
        visible={isOpen}
        variant={variant}
        onClose={() => setIsOpen(false)}
      />
    </SearchTopSheetContext.Provider>
  );
}
