# cards.xtra BFF

A thin server between the app and the partner APIs. The app holds no partner key. This server adds the keys.

| App calls | Server forwards to | Server adds |
|---|---|---|
| `/ck/<path>` | `CK_BASE_URL/<path>` (CashKaro mini apps) | `x-api-key`; the site token when the app sends no `Authorization` |
| `/bk/<path>` | `BK_BASE_URL/<path>` (BankKaro CardGenius) | `partner-token` (partner JWT) |
| `/health` | - | Config check, no values |

## Rules
- Only the paths in `src/routes.js` are forwarded. All other paths return 404. `/token` is never exposed.
- A user token from the app (`Authorization: Bearer ...`) is forwarded unchanged. A 401 goes back to the app, and the app refreshes.
- The server sets `ip_address` on `/signupV1` from `x-forwarded-for`.
- OTP routes (`loginotp`, `signupotp`, `users/sendotp`) are rate limited in memory: 30 per IP and 5 per mobile number in 10 minutes. Each running copy keeps its own count. Move to a shared store before launch.
- Request bodies over 4.4 MB return 413 (Vercel limit 4.5 MB). Responses stream, so the response limit does not apply.
- Logs hold method, route, status and time only. Never bodies or tokens.

## Run locally
1. Copy `.env.example` to `.env.local` and fill the keys. The file is git-ignored.
2. `npm run dev`. The server listens on `http://127.0.0.1:8787`.
3. In the app `.env`, set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787`, then restart Expo with `--clear`.

## Test
`npm test` (Node built-in test runner, no dependencies).

## Deploy (Vercel)
- Prototype: https://cards-xtra-bff.vercel.app (personal Hobby account, project `cards-xtra-bff`). Move to a company team before launch.
- Root Directory: `bff`. Region: `bom1` (`vercel.json`). Max duration: 60 s.
- Set the variables from `.env.example` as sensitive environment variables.
- Point the app at the deployment URL with `EXPO_PUBLIC_API_BASE_URL`.
