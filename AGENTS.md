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
npm test           # vitest unit tests (pure logic, no RN rendering)
npm run test:cov   # same with v8 coverage
```

## Development builds

- `expo-dev-client` is installed, so `npm run ios` / `npm run android`
  (`expo run:*`) build a **development build** with the Dev Launcher + Dev Menu:
  you can reload, inspect, and **reconnect to Metro** (enter/scan the URL) even
  after the dev server was closed. Without it the app would sit on the splash
  screen when Metro is unreachable.
- **Expo Go does not work** for this app (native modules: Skia, keyboard-controller,
  screen-orientation, worklets).
- `npm start` serves the dev build; the QR uses
  `com.maminco.mobile://expo-development-client/?url=…`. Press `s` to toggle
  between Expo Go and the development build.
- Adding/upgrading a native module (or `expo-dev-client` itself) requires a native
  rebuild: `npx expo run:ios --device` / `npx expo run:android`.

## Environment

- Copy `.env.example` to `.env`. `EXPO_PUBLIC_API_URL` is required for real use.
- Production builds need `https://` URLs (`app.config.ts` enforces it); set them as EAS env vars, see `docs/PERFORMANCE.md`.
- Dev-only defaults: Android emulator `http://10.0.2.2:3000`, iOS/web `http://localhost:3000`. Production
  builds throw if `EXPO_PUBLIC_API_URL` is unset (`app.config.ts` also enforces https).
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
- Visual identity: light-first (cream/charcoal/leaf green). `success`/`warning`/`danger` are solid
  fills, so text on them is white. `fonts.display` (Anton) is only for screen titles (uppercase,
  never body text). `Button variant="brand"` (amber gradient) only for login and payment "Cobrar".
- API access goes through `src/lib/api/*`; never call `fetch` directly. The JWT is stored with
  `expo-secure-store` via `src/lib/storage/session-storage.ts`, never in AsyncStorage.
- Long lists use `FlatList` with memoized items; POS order logic lives in `src/features/pos-order`.
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
