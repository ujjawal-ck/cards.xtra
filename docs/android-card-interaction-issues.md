# Home Screen Card Interaction — Issues & Android Revamp Plan

> **Branch:** `android-card-interaction-revamp` (forked off `accessibility-experiment`)
> **Status:** iOS is locked and ships as-is. This doc tracks the Android problems and the plan to replace the Android interaction with something smoother, more appealing, and scalable.
> **Rule going in:** Do **not** touch the iOS path. Android gets its own interaction. Both must feel premium.

---

## 1. What the interaction is supposed to do

Tapping a `CardTile` on the Home screen opens `CardDetailSheet` (a `@gorhom/bottom-sheet` modal). The intended behaviour:

1. **Open** as a partial sheet (snap point `75%`).
2. **Drag/scroll up** → expands to full screen (`100%`) — the Blinkit / Zomato pattern.
3. **Swipe left/right** → pages horizontally between cards (FlatList pager), neighbour cards peeking on the sides.
4. While paging, the active card animates (grows, corner radius morphs, footer pins), and on iOS the card floats *above* the sheet edge with gyro tilt + glare.

On **iOS this works perfectly and looks great.** On **Android it is jittery, laggy, and the "card floating above the sheet" composition is fundamentally unreliable** — so it has already been disabled and replaced with a contained fallback that "works but looks plainer."

---

## 2. Architecture today (for reference)

| File | Role |
|------|------|
| [src/screens/HomeScreen.tsx](../src/screens/HomeScreen.tsx) | Card list, scroll-driven header, stagger entrance, image prefetch |
| [src/organisms/CardDetailSheet.tsx](../src/organisms/CardDetailSheet.tsx) | The bottom sheet, horizontal card pager, `FloatingCardRail` (iOS), all snap/gesture config |
| [src/organisms/CardDetailMasthead.tsx](../src/organisms/CardDetailMasthead.tsx) | Collapsing hero (card art + peach bg) |
| [src/organisms/CardArt.tsx](../src/organisms/CardArt.tsx) | Card image, gyro tilt (iOS only), glare, shadow, image cache |

**Key config in `CardDetailSheet.tsx`:**
- `snapPoints = ['75%', '100%']`
- Spring snap: `damping=38, stiffness=320, mass=1, overshootClamping=true`
- Pan gates: `activeOffsetY = [-12, 12]`, `failOffsetX = [-8, 8]` (so vertical pan yields to horizontal pager)
- Pager: `AnimatedFlatList`, `snapToInterval = CARD_W + CARD_GAP`, `decelerationRate='fast'`, `windowSize=5`
- Platform flags:
  ```js
  const IS_ANDROID  = Platform.OS === 'android';
  const ANDROID_FLOAT = false;                  // floating-rail experiment, disabled
  const CONTAIN_CARD  = IS_ANDROID && !ANDROID_FLOAT;  // true on Android
  const SHOW_RAIL     = !IS_ANDROID || ANDROID_FLOAT;  // false on Android
  ```

---

## 3. Issues faced on Android (chronological / by symptom)

### 3.1 Floating card above the sheet is fragile — **DISABLED**
The iOS approach renders the card art in a `FullWindowOverlay` (native, unclipped) that floats above the sheet's rounded top edge and tracks the pager via a shared value.

On Android `FullWindowOverlay` does not exist. The workaround was to teleport the rail into gorhom's `@gorhom/portal` host above the sheet (see memory `android-overlay-above-gorhom-sheet`) and mirror the native scroll offset through a shared value. Problems observed:
- The mirrored `scrollX` **drifts** from the real native scroll offset.
- Drift caused **desync**: the wrong card painted over another card's data.
- **Blank / "no card" slots** mid-fling.
- **Black flashes** during the portal mount/unmount.

> Conclusion at the time: contain the card **inside** the masthead on Android (`CONTAIN_CARD = true`, `SHOW_RAIL = false`). This is reliable but visually plainer — no float, no parallax, no lift.

### 3.2 Jitter / lag on the vertical expand (75% → 100%)
The sheet spring snap + the pager's scroll-driven interpolations + the masthead height collapse all run together. On Android this combined work drops frames — the expand is **not buttery**, it stutters. iOS holds 60fps; Android visibly hitches.

### 3.3 Horizontal swipe vs. vertical pan gesture conflict
Without `failOffsetX`, the gorhom pan **ate horizontal swipes** on Android, so paging between cards barely worked. Adding `failOffsetX = [-8, 8]` helped but the hand-off between "I'm expanding the sheet" and "I'm swiping cards" still feels less crisp than iOS.

### 3.4 Content lift clips on Android
The iOS "content lift" (masthead + benefits translate up `-44px` at partial peek, back to `0` at full) **clips the card** on Android, so it is skipped (`CONTAIN_CARD` guards it). Net effect: the Android layout is more static and less dynamic.

### 3.5 Gyro tilt / parallax / glare disabled on Android
`CardArt` only subscribes to the accelerometer on iOS. Android cards are forced flat (`tiltX/Y → 0`). So the premium "lean + specular glare + dynamic shadow" effect is iOS-only. Android cards look static.

### 3.6 Image flicker on remount / swipe (mitigated)
Cards flickered (skeleton → image) on remount and swipe. Mitigated by prefetching all card images into the `expo-image` cache on Home and skipping the skeleton/fade when the URI is already decoded (`decodedImageUris` set). This is **shared** and should be kept for the Android revamp.

### 3.7 First-open paint bug (fixed, keep the fix)
Seeding `animatedIndex`/`animatedPosition` at `(0,0)` made the rail read "peek snap, top edge at y=0" on first present — painting the card at the screen top with the in-sheet art gated to opacity 0. Fixed by seeding at the **closed** rest state (`animatedIndex = -1`, `animatedPosition = SCREEN_H`). Keep this.

---

## 4. Root-cause summary

| # | Root cause | Consequence on Android |
|---|-----------|------------------------|
| A | No `FullWindowOverlay` equivalent; portal scroll-mirror drifts | Floating card unreliable → disabled |
| B | Too many simultaneous UI-thread interpolations during expand | Frame drops / jitter on 75%→100% |
| C | Nested vertical-pan + horizontal-pager gesture arbitration | Less crisp swipe hand-off |
| D | Contained card + skipped content lift | Static, less premium look |
| E | Accelerometer effects gated off | No tilt/glare/parallax |

---

## 5. Goals for the Android revamp

The Android interaction does **not** have to copy iOS. It must be:

1. **Smooth** — hold 60fps; zero jitter on expand and swipe. UI-thread only (Reanimated worklets), no JS-bridge per-frame work.
2. **Reliable** — no desync, no blank slots, no black flashes, no wrong-card-over-data. Single source of truth for scroll position (don't mirror native offset into a shared value).
3. **Appealing** — looks intentional and premium for Android, not a stripped-down fallback.
4. **Scalable** — clean, token-bound, structured to grow with more cards / more detail content.

---

## 6. Candidate approaches (to evaluate on-device)

> Pick by testing on a real mid-range Android device, not the emulator.

### Option A — Contained card, done beautifully (lowest risk)
Keep the card **inside** the sheet (no float). Invest in the in-sheet motion instead:
- Smooth corner-radius morph + card scale tied directly to `animatedIndex`.
- A subtle, cheap "tilt" driven by **pager scroll position** (not the accelerometer) so swiping leans the card — UI-thread, deterministic, no sensor jitter.
- Polished crossfade between cards.
- **Pros:** reliable, no portal, builds on what already works. **Cons:** no above-the-sheet float.

### Option B — Card-stack / deck swipe (most differentiated)
Replace the horizontal FlatList pager on Android with a **stacked deck** interaction (active card on top, next cards peeking behind, swipe to advance). Vertical drag still expands the sheet.
- **Pros:** very appealing, modern, distinctly Android. **Cons:** more gesture arbitration to get right; needs careful perf budgeting.

### Option C — Shared-element transition
Animate the tapped `CardTile` into the sheet hero (Material-style container transform) instead of a plain sheet present.
- **Pros:** premium open animation. **Cons:** complex; doesn't by itself fix the paging jitter.

**Recommendation to start:** **Option A** as the reliable baseline, then layer the scroll-driven tilt and (optionally) prototype **Option B** behind a flag to compare on-device.

---

## 7. Hard constraints (from CLAUDE.md + memory)

- **Tokens are law** — every color/spacing/radius/type from `src/tokens`. No hardcoded values.
- **Expo Go compatible** for the demo path; gyro/native-only effects stay gated.
- **Do not regress iOS.** Gate every Android change behind `Platform.OS === 'android'` or the existing `IS_ANDROID`/`CONTAIN_CARD` flags. iOS code paths must be byte-for-byte unchanged where possible.
- Android edge-to-edge breaks gorhom `keyboardBehavior` (memory `gorhom-keyboard-edge-to-edge`) — relevant if any input lands in the sheet.
- Entrance/stagger animations are already iOS-only (memory `entrance-animations-ios-only`); decide deliberately whether Android gets them in the revamp.

---

## 8. Open questions

1. Should Android keep the **horizontal pager** at all, or move to a **deck/stack**? (Affects the whole gesture model.)
2. Is the **above-the-sheet float** worth another attempt with a different technique, or do we commit to contained-only on Android?
3. Do we want a **scroll-driven fake tilt** on Android (cheap, deterministic) as the replacement for the disabled accelerometer tilt?
4. Target device floor for the 60fps bar (which Android model is "must be smooth on")?

---

## 9. Changelog of this doc

- _2026-06-25_ — Initial capture of all known Home-screen card interaction issues on Android; branch `android-card-interaction-revamp` created off `accessibility-experiment`.
