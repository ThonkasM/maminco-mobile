# Charting

Manager dashboards use **Victory Native XL** on iOS/Android and a **plain-View fallback** on
Expo web. This mirrors the Homy app (`agent-pro` dashboard) and avoids shipping Skia's WASM
bundle to web.

## Files

- `components/charts/types.ts` — shared prop types.
- `components/charts/<chart>.tsx` — web fallback (plain `View`s, theme tokens).
- `components/charts/<chart>.native.tsx` — Victory Native XL (`CartesianChart` + `Bar`/`Line`).
- Used by `app/(manager)/metrics.tsx`, `app/(manager)/forecast.tsx`, `app/(manager)/ai.tsx`.

Metro resolves `.native.tsx` for iOS/Android and `.tsx` for web, so both variants must expose
the **same props**.

## Dependencies

- `victory-native@^42` and `@shopify/react-native-skia` (installed with `npx expo install`).
- Skia is a native module: the native charts require a **dev build / prebuild**; they do not run
  in stock Expo Go.

## Rules

- Theme from `useTheme()` tokens — never hardcode hex.
- The web app (`maminco-frontend`) uses **recharts** instead; charts share a data shape, not a
  library. See `maminco-frontend/docs/CHARTING.md` for the cross-platform rationale.
