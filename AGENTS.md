# AGENTS.md - maminco-mobile

Expo SDK 57 + Expo Router mobile app. Read the Expo v57 docs before changing
config or routing: https://docs.expo.dev

## Commands

```bash
npm install        # install dependencies (slow on first run)
npm start          # Expo dev server (press a/i/w)
npm run android    # Android emulator / device
npm run ios        # iOS simulator
npm run web        # web
npm run typecheck  # tsc --noEmit (must pass)
npm run lint       # expo lint
```

## Environment

- Copy `.env.example` to `.env`. `EXPO_PUBLIC_API_URL` is required for real use.
- Defaults: Android emulator `http://10.0.2.2:3000`, iOS/web `http://localhost:3000`.
- `EXPO_PUBLIC_SOCKET_URL` defaults to `EXPO_PUBLIC_API_URL`. socket.io uses the
  `/orders` namespace.

## Conventions

- English identifiers/comments; **Spanish** UI copy only.
- Routing is file-based under `src/app`. `(manager)` and `(pos)` are route groups
  (not part of the URL). `/tables` is intentionally a shared route between them.
- Always navigate within a group using a group-qualified href, e.g.
  `router.push('/(pos)/orders/<tableId>')`, so the correct layout is kept.
- Both role layouts are a **Stack whose first screen is the `(tabs)` group**, so
  detail screens push **above** the tabs and the tab bar is not shown there:
  - `(manager)`: tabs **Panel / Mesas / Perfil**; `metrics`, `forecast`, `ai`,
    `settings` are siblings of `(tabs)` (`router.push('/(manager)/metrics')`),
    reached from the dashboard and the profile tab.
  - `(pos)`: tabs **Mesas / Perfil**; `orders/[tableId]` and `payments/[tableId]`
    are siblings of `(tabs)` (`router.push('/(pos)/orders/<tableId>')`).
- Style with `StyleSheet` + semantic tokens from `useTheme()`; never hardcode hex
  values in screens. Tokens and rules live in `docs/DESIGN.md`.
- API access goes through `src/lib/api/*`; never call `fetch` directly.
- Money fields may be strings (Prisma Decimal) - coerce with `toNumber()`.
- Charts: manager screens (`(manager)/metrics|forecast|ai`) use Victory Native XL on native and a
  plain-View fallback on web (`components/charts/*.tsx` + `*.native.tsx`). See `docs/CHARTING.md`.
- Feedback: use `useFeedback()` from `providers/feedback-provider` for notifications and
  confirmations; use `useErrorNotification` for post-refresh errors.

## Backend contract

- The NestJS backend is the source of truth (default `http://localhost:3000`,
  routes under `/api`).
- `POST /api/auth/login` returns `{ accessToken, user }`; the `role` claim drives
  the redirect.
- `GET /api/tables` is ADMINISTRATOR-only; other roles receive table state over
  the `/orders` socket (`tables:state:snapshot`, `tables:status:changed`).
- AI forecast endpoints may 404 until deployed - treat 404 as "sin datos".

Do not modify sibling repositories (`maminco-backend`, `maminco-frontend`,
`maminco-ai`).
