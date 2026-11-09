# Cards.xtra documentation

Cards.xtra (powered by CashKaro) is a React Native / Expo app for finding a credit card, applying through a cashback-tracked link, shopping partner stores for cashback, and withdrawing earnings. It talks to two production backends: the CashKaro mini-app API (`ckminapps.com`) and the BankKaro partner API.

## Start here

| Doc | Read it to… |
|---|---|
| [development.md](development.md) | Set up, run on a phone, type-check, build a shareable APK, ship; troubleshooting. |
| [decision.md](decision.md) | Understand why things are built the way they are, and which decisions are still open. |
| [architecture.md](architecture.md) | See what ships in the app vs what's fetched, how caching and offline work, and which Android permissions the app declares and needs. |
| [screen-flows.md](screen-flows.md) | See every screen, its entry/exit points and states, and the key paths with success and failure branches. |
| [api-reference.md](api-reference.md) | Look up any endpoint: request body, response fields read, error handling, screens that use it. |
| [auth-and-secrets.md](auth-and-secrets.md) | Follow login/signup/OTP end to end, the tokens the app holds, where secrets live, analytics identity and the signup IP field. |
| [production-readiness.md](production-readiness.md) | What the CK mini-app team and BankKaro must configure (stores, categories, tracking host, SMS, keys) so the live setup needs no remapping; home-screen ideas grounded in the APIs. |

## Audits and history

| Doc | Contents |
|---|---|
| [UI_UX_AUDIT_2026-11-09.md](UI_UX_AUDIT_2026-11-09.md) | Device audit on production: every fix by pass, what's open. |
| [GAP_AUDIT.md](GAP_AUDIT.md) | Figma vs code gap audit and phased roadmap (3 Nov 2026). |
| [android-card-interaction-issues.md](android-card-interaction-issues.md) | Android card-detail interaction issues and revamp plan. |
| [../INTEGRATION.md](../INTEGRATION.md) | Running log of backend integration work. |
| [../PROJECT_STATE.md](../PROJECT_STATE.md), [../HANDOFF.md](../HANDOFF.md), [../CHENNAI-HANDOFF.md](../CHENNAI-HANDOFF.md) | Earlier project snapshots and team handoffs (may be outdated; the docs above are current as of 9 Nov 2026). |
| [../CLAUDE.md](../CLAUDE.md), [../COMPONENT_SPECS.md](../COMPONENT_SPECS.md) | Code rules (tokens, naming, structure) and component specs from Figma. |

## Shareable pages

- **Cards.xtra Build Status:** what's been done, go-live checklist, modules, API flow and API map.
- **Cards.xtra Screen Flows:** visual screen-by-screen flow with success and failure paths.

## Quick facts

- Expo SDK 54 · React Native 0.81 (new architecture) · Android first (iOS not yet built).
- Package / bundle id: `com.cardsextra.miniapp`.
- Login is optional; the phone + OTP sheet lives in `src/screens/OnboardingScreen.tsx`.
- Every card/store click-out goes through `src/lib/useClickOut.tsx`.
- Design tokens in `src/tokens` are mandatory for colours, spacing and type.
