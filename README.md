# Maminco Mobile

Expo (SDK 57) + Expo Router mobile client for **Maminco**, a restaurant POS system.
A single app routes authenticated users to one of two experiences based on their
JWT `role` claim:

- **Manager experience** (`ADMINISTRATOR`, `MANAGER`): dashboard KPIs, metrics,
  AI sales forecast and table occupancy.
- **POS experience** (`CASHIER`, `WAITER`): area/table grid, order taking,
  payments and profile.

All identifiers and comments are in English; every user-facing string is in
Spanish. Currency is Bolivianos (Bs).

## Requirements

- Node.js 20+
- The `maminco-backend` NestJS API running on `http://localhost:3000` (source of truth)
- Expo Go / a development build for device testing

## Getting started

```bash
npm install
cp .env.example .env      # adjust EXPO_PUBLIC_API_URL if needed
npm start                 # Expo dev server
npm run android           # Android emulator
npm run ios               # iOS simulator
npm run web               # web
```

Quality gates:

```bash
npm run typecheck         # tsc --noEmit
npm run lint              # expo lint
```

## Environment

| Variable                 | Default                                         | Notes                                            |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`    | Android `http://10.0.2.2:3000`, else `localhost` | Backend base URL, no `/api` suffix               |
| `EXPO_PUBLIC_SOCKET_URL` | falls back to `EXPO_PUBLIC_API_URL`             | socket.io base URL (namespace `/orders`)         |

> Android emulators cannot reach the host via `localhost`; use `10.0.2.2`.

## Scripts

| Script              | Description                     |
| ------------------- | ------------------------------- |
| `npm start`         | Start the Expo dev server       |
| `npm run android`   | Start on Android                |
| `npm run ios`       | Start on iOS                    |
| `npm run web`       | Start on web                    |
| `npm run typecheck` | `tsc --noEmit`                  |
| `npm run lint`      | ESLint (Expo flat config)       |

## Project structure

```
src/
  app/                 # expo-router routes
    _layout.tsx        # providers + role-based redirect
    login.tsx          # Spanish login screen
    (manager)/         # manager tabs (dashboard, metrics, forecast, tables)
    (pos)/             # POS tabs (tables, order, payment, profile)
  components/ui/       # design-system primitives
  constants/theme.ts   # palette + spacing/radii/typography tokens
  hooks/               # use-theme, use-async, use-tables-realtime
  lib/api/             # typed API client + per-domain modules
  lib/realtime/        # socket.io factory and helpers
  providers/           # AuthProvider (JWT persisted in AsyncStorage)
docs/                  # DESIGN.md, ARCHITECTURE.md
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the navigation diagram and
[`docs/DESIGN.md`](docs/DESIGN.md) for the design-system rules.
