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
    ManagerGroup --> MDash[Dashboard<br/>/api/reports/today]
    ManagerGroup --> MMetrics[Metrics<br/>/api/reports/today/top-products]
    ManagerGroup --> MForecast[Forecast<br/>/api/ai/forecast/sales]
    ManagerGroup --> MTables[Tables<br/>socket snapshot]
  end

  subgraph POS["POS experience"]
    PosGroup --> PTables[Tables<br/>areas + grid]
    PTables -->|tap table| POrder[Order<br/>/(pos)/orders/:tableId]
    POrder -->|Cobrar| PPay[Payment<br/>/(pos)/payments/:tableId]
    PPay -->|Pago completado| PTables
    PosGroup --> PProfile[Profile<br/>logout]
  end
```

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
