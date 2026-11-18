# Card advisor avatar (Swipey)

## What it is

`CreditCardAdvisorAvatar` is the mascot of the card advisor: a friendly credit card with a face. It shows what the advisor is doing. It never decides that: the screen passes the state.

File: `src/organisms/CreditCardAdvisorAvatar.tsx`. Contract: `src/lib/advisorAvatar/types.ts`. Pose maths: `src/lib/advisorAvatar/pose.ts`.

Used in the card advisor chat: `src/screens/advisor/AdvisorScreen.tsx`.

## Props

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `state` | `AdvisorAvatarState` | required | What the advisor is doing. See the six states. |
| `size` | number (dp) | 96 | Width and height of the square. Reads as a card with a face from 48 to 300. |
| `audioLevel` | number 0 to 1 | none | While `state` is `speaking`, how far the mouth opens. Values outside 0 to 1 are clamped. |
| `accessibilityLabel` | string | "Swipey, your card advisor" plus the state in words | Read by a screen reader. |
| `style` | `StyleProp<ViewStyle>` | none | Style of the outer square. |

## The six states

The chat maps its signals to a state in `avatarStateFor` (`src/lib/advisor/transcript.ts`). The input is `AvatarSignals` in `src/lib/advisor/chatTypes.ts`.

| State | The user sees | The chat sets it when |
|---|---|---|
| `error` | Concerned face, one small shake. | The card catalogue failed to load, or the eligibility check failed. |
| `thinking` | Eyes up, moving brows, small sparkles. | The eligibility check is running. |
| `success` | Happy eyes, arms up, sparkles. | Cards just turned "likely to qualify". It lasts a moment. |
| `speaking` | Mouth moves, gentle bounce. | A new advisor message is arriving. |
| `listening` | Slight tilt, attentive eyes, soft glow. | A question waits for an answer. |
| `idle` | Gentle float, a blink every few seconds, a rare small wave. | None of the above. |

The list is in priority order: the first state that applies wins.

## How to use it

Chat header (48):

```tsx
<CreditCardAdvisorAvatar state={avatarState} size={48} />
```

Floating assistant (64 to 96, in an absolutely positioned view):

```tsx
<View style={{ position: 'absolute', right: spacing[16], bottom: spacing[16] }}>
  <CreditCardAdvisorAvatar state={avatarState} size={80} />
</View>
```

Onboarding mascot (160 to 300):

```tsx
<CreditCardAdvisorAvatar state="idle" size={240} />
```

## audioLevel

`audioLevel` sets how far the mouth opens while the state is `speaking`. When it is absent, the mouth runs its own loop.

A future text to speech or microphone source feeds it one number from 0 to 1, per frame or every 50 to 100 ms. Keep it in React state or a shared value and pass it down.

The app has NO text to speech and NO microphone today. This was not tested with real audio. The demo screen only simulates a voice with a timer.

## Change the look

- Colours: `colors.advisorAvatar.*` in `src/tokens/colors.ts`. The card body gradient is `gradients.premium` in `src/tokens/gradients.ts`.
- Motion: durations in `src/tokens/motion.ts`. Poses in `src/lib/advisorAvatar/pose.ts`.

## Accessibility

- The avatar has a label. Pass `accessibilityLabel` to change it.
- With reduce motion on, each state shows one still pose.
- On Android the avatar shows the still poses. This repo keeps Reanimated loops to iOS.

## Open the demo

- Development build: the dev route `AdvisorAvatarDemo` (registered only when `__DEV__` is true). The header avatar of the chat screen opens it on a long press in development builds.
- Storybook (web): `Organisms/CreditCardAdvisorAvatar` with the stories `Playground`, `AllStates` and `Sizes`.

## Limits and not done

- No text to speech, no microphone, no lip sync to real audio.
- Built with SVG and Reanimated for React Native, not CSS, because the app is React Native.
- Not checked on a device.
