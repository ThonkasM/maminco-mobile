# Maminco Mobile

Expo (SDK 57) + Expo Router mobile client for **Maminco**, a restaurant POS system.
A single app routes authenticated users to one of two experiences based on their
JWT `role` claim:

- **Manager experience** (`ADMINISTRATOR`, `MANAGER`): dashboard KPIs, metrics,
  AI sales forecast and table occupancy.
- **POS experience** (`CASHIER`, `WAITER`): area/table grid, order taking,
  payments and profile.
- **Kitchen experience** (`COOK`): live kitchen order board.

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
npm test                  # vitest unit tests (npm run test:cov for coverage)
```

## Environment

| Variable                 | Default                                         | Notes                                            |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`    | Dev only: Android `http://10.0.2.2:3000`, else `localhost`. Required in production | Backend base URL, no `/api` suffix               |
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

## Notificaciones

Every role (manager, POS and kitchen) has an inbox backed by `GET /api/notifications/mine`
(the server filters by role/user) plus Expo push.

- **Inbox:** shared screen `src/features/notifications/notifications-screen.tsx`.
  Manager and POS have an **Avisos** tab with an unread badge; kitchen has a bell in the
  header that opens the inbox as a modal. State lives in `NotificationsProvider`
  (mounted in `src/app/_layout.tsx`).
- **Push registration:** after login, on a physical device only, the app asks for permission,
  gets the Expo push token and calls `POST /api/notifications/push/subscriptions`
  (`{ kind: 'EXPO', endpoint: <token> }`). Logout calls `DELETE` for that token. Android uses
  the high-importance channel `default`. Foreground notifications show a banner and refresh the inbox.
- **Tap:** the push `data.url` is mapped per role (`src/features/notifications/navigation.ts`);
  unknown paths open the inbox.

### Configuration

| Item | Where |
| --- | --- |
| EAS project id | `EXPO_PUBLIC_EAS_PROJECT_ID` (or `extra.eas.projectId` via `npx eas init`). Without it the token is not requested. |
| Android (FCM) | Firebase project, `google-services.json` referenced from `app.json` (`android.googleServicesFile`) and the **FCM v1** service account key uploaded to EAS (`npx eas credentials`). |
| iOS (APNs) | Apple Developer push key; EAS manages it (`npx eas credentials`) for the bundle id `com.maminco.mobile`. |

### How to test

1. A **physical device** is required (simulators and emulators do not get push tokens).
2. The plugin `expo-notifications` changes native code: reinstall a development build with
   `npx expo run:ios --device` (or `npx expo run:android`) - Metro alone is not enough.
3. Set `EXPO_PUBLIC_API_URL` to a LAN/public URL the device can reach and
   `EXPO_PUBLIC_EAS_PROJECT_ID`, then sign in and accept the permission prompt.
4. Send a test:
   - Real flow: `POST /api/notifications` as `ADMINISTRATOR`/`MANAGER`
     with `{ "title": "...", "body": "...", "roles": ["WAITER"] }`.
   - Expo tool: https://expo.dev/notifications with the device token
     and data `{"url": "/pos/tables"}`.

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
  providers/           # AuthProvider (JWT in expo-secure-store; memory only if unavailable)
docs/                  # DESIGN.md, ARCHITECTURE.md
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the navigation diagram and
[`docs/DESIGN.md`](docs/DESIGN.md) for the design-system rules.

### Estado de la configuración de push (Android)

- Firebase: proyecto `maminco-pos-2026`, app Android `com.maminco.mobile`. El `google-services.json` no se versiona (está en `.gitignore`); descárgalo de la consola de Firebase o pásalo con la variable `GOOGLE_SERVICES_JSON`.
- EAS: proyecto `@thonkasm/maminco` (`extra.eas.projectId` en `app.json`), con la clave de cuenta de servicio **FCM v1** ya subida a EAS para `com.maminco.mobile`.
- APK de prueba con compilación local (perfil `preview`, apunta a `https://maminco.lat`):

```bash
GOOGLE_SERVICES_JSON=/ruta/a/google-services.json npx eas build --local --profile preview --platform android
```

- Para comprobar el envío: abre sesión en la app, acepta el permiso y envía una notificación desde el panel web o con `https://expo.dev/notifications` usando el token; el recibo de Expo debe indicar `ok`.
