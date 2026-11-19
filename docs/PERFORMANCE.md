# Performance, security and realtime changes

## Session storage

The JWT lives in `expo-secure-store` (`src/lib/storage/session-storage.ts`); AsyncStorage keeps only the
non-sensitive profile (`maminco.auth.profile`). A legacy `maminco.auth` AsyncStorage session is migrated on first
boot and then deleted. On web (no SecureStore) the token falls back to AsyncStorage. `expo-secure-store` and
`@react-native-community/netinfo` are native modules: rebuild the dev client (`npx expo run:ios|android`).

## Lists

`tables` (POS), manager occupancy, kitchen and the POS catalog use `FlatList` with `keyExtractor`, `numColumns`
(tables/products), memoized items (`TableTile`, `ProductTile`, `KitchenOrderCard`, `AreaCard`, `OrderItemRow`)
and stable callbacks. `getItemLayout` is not used: multi-column lists and variable-height cards make it
unreliable. `use-tables-realtime` keeps `{ byId, ids }` and replaces only the changed table (unchanged tables keep
object identity, sorting only when a table is added or renumbered).

## POS order screen

`src/app/(pos)/orders/[tableId].tsx` went from 803 to 201 lines. Logic moved to
`src/features/pos-order/hooks` (`use-pos-order`, `use-catalog-filter`) and UI to
`src/features/pos-order/components` (`order-panel`, `catalog-header`, `product-tile`).

## Realtime and network

`socket.ts`: infinite reconnection (1 s -> 15 s backoff, jitter), typed events, reconnect on `AppState`
`active` and when NetInfo reports connectivity again. `useRealtimeResume` refetches on foreground and on every
socket reconnect (tables, kitchen, POS order). `OfflineBanner` shows when NetInfo reports no connection.
`apiFetch` retries GET requests (network errors, 502/503/504) up to 3 times with 400/1200/2800 ms backoff + jitter.

## Accessibility

Table tiles, product tiles, category/area chips, quantity steppers and back buttons expose
`accessibilityRole`, descriptive `accessibilityLabel` (status written out, not only colored) and
`accessibilityState` (`selected`, `busy`).

## EAS and environments

`eas.json`: each profile has `channel`, `environment` and `APP_ENV`. `EXPO_PUBLIC_API_URL` /
`EXPO_PUBLIC_SOCKET_URL` are not stored in the repo: create them as EAS environment variables, e.g.
`eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<api-host> --visibility plaintext`
(`<api-host>` is a placeholder). `app.config.ts` extends `app.json`: in `production` it fails the build when the URL
is missing or not `https://`, and disables Android cleartext traffic and iOS `NSAllowsArbitraryLoads`
(both stay enabled in development/preview for LAN testing).

## Assets (lossless; no quantization tools were available)

| File | Before | After |
|---|---|---|
| `assets/icon.png` | 899,863 B | 827,705 B |
| `assets/splash-icon.png` | 279,551 B | 273,687 B |
| `assets/favicon.png` (512 -> 192 px) | 279,551 B | 50,228 B |
| bundled login logo (`icons/maminco-logo-192.png`) | 279,551 B | 60,347 B |

`icon.png` is high-entropy; a larger saving needs lossy quantization (pngquant/Squoosh) of the 1024 px source.
