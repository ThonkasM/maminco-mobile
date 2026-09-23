# Maminco Mobile - Architecture

## Overview

```
Root layout (providers + role-based redirect)
  ├── AuthProvider          JWT persisted in AsyncStorage (`maminco.auth`)
  ├── GestureHandlerRootView
  ├── SafeAreaProvider
  └── Stack
        ├── /login
        ├── (manager)  -> Tabs   (ADMINISTRATOR / MANAGER)
        └── (pos)      -> Tabs   (CASHIER / WAITER)
```

- `src/lib/api/client.ts` prefixes `EXPO_PUBLIC_API_URL`, attaches
  `Authorization: Bearer <token>`, normalises errors to `ApiError` and forces a
  logout on `401`.
- `src/lib/realtime/socket.ts` exposes the authenticated `/orders` socket
  (`join:table`, `subscribe:tables:status`) and cleanup helpers.
- Route groups `(manager)` and `(pos)` do not appear in the URL. `/tables` is a
  shared route: in-app navigation is always group-qualified
  (`/(pos)/tables`, `/(manager)/tables`) so the correct layout is preserved.

## Navigation

```mermaid
flowchart TD
  Boot([App start]) --> Root{Root layout}
  Root -->|loading| Splash[Loading screen]
  Root -->|no session| Login[/login/]
  Root -->|session + manager role| ManagerGroup[(manager) Tabs]
  Root -->|session + service role| PosGroup[(pos) Tabs]

  Login -->|signIn email + password| Auth{role claim}
  Auth -->|ADMINISTRATOR / MANAGER| ManagerGroup
  Auth -->|CASHIER / WAITER| PosGroup

  subgraph Manager["Manager experience"]
    ManagerGroup --> MTabs["(tabs)<br/>Panel / Mesas / Perfil"]
    MTabs --> MDash[Dashboard<br/>/api/reports/today]
    MTabs --> MTables[Tables<br/>socket snapshot]
    MTabs --> MProfile[Profile<br/>logout + settings]
    ManagerGroup --> MMetrics[Metrics<br/>pushed above tabs]
    ManagerGroup --> MForecast[Forecast<br/>pushed above tabs]
    ManagerGroup --> MAi[AI<br/>pushed above tabs]
    ManagerGroup --> MSettings[Settings<br/>pushed above tabs]
  end

  subgraph POS["POS experience"]
    PosGroup --> PTabs["(tabs)<br/>Mesas / Perfil"]
    PTabs --> PTables[Tables<br/>areas + 3-col grid]
    PTables -->|tap table| POrder[Order<br/>/(pos)/orders/:tableId]
    POrder -->|Cobrar (CASHIER+)| PPay[Payment<br/>/(pos)/payments/:tableId]
    PPay -->|Pago completado| PTables
    PTabs --> PProfile[Profile<br/>logout]
  end
```

### Tab bars

Each role uses its own tab navigator (`(manager)` and `(pos)`), split by platform:

- **iOS:** `NativeTabs` (`expo-router/unstable-native-tabs`) renders the system
  tab bar, so iOS 26 applies the Liquid Glass treatment automatically. Icons use
  SF Symbols and are tinted with the brand color.
- **Android / web:** `Tabs` (`expo-router/js-tabs`) with a custom
  `FloatingTabBar` (`src/components/floating-tab-bar.tsx`) — a rounded pill bar
  whose active pill slides between tabs with a spring (Reanimated). Icons use
  Ionicons.

POS detail screens (`orders/[tableId]`, `payments/[tableId]`) live inside the
`tables` tab as a nested `Stack`. Keeping them out of the tab list this way is
required because native tabs cannot navigate to hidden routes.

## Data flow

| Concern     | Source                                                              |
| ----------- | ------------------------------------------------------------------- |
| Auth        | `POST /api/auth/login`, `GET /api/auth/profile`                     |
| Catalog     | `/api/categories/public/active`, `/api/products/public/available`   |
| Areas       | `/api/areas/public/active`                                          |
| Tables      | `/orders` socket snapshot (REST `GET /api/tables` is ADMIN only)    |
| Orders      | `/api/orders`, `/api/orders/table/:id/active`, item + status routes |
| Payments    | `/api/payments/methods`, `/api/payments/orders/:orderId`            |
| Reports     | `/api/reports/today`, `/today/sales`, `/today/top-products`         |
| Forecast    | `/api/ai/forecast/sales` (404 tolerated → "sin datos")              |

## Error handling

- `ApiError` carries `status` and `message`; `useAsync` surfaces a string.
- `isNotFound()` / `isForbidden()` allow callers to degrade gracefully
  (forecast 404, tables 403).
- `401` triggers `AuthProvider.signOut()` and a redirect to `/login`.
