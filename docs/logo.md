# Maminco logo — assets, palette and usage

Handover document for the logo/icon work applied to the Expo app
(`maminco-mobile`) and reused by the web app (`maminco-frontend`).

## 1. Source asset

- **File:** `development/maminco-logo.png`
- **Size:** 1254 × 1254 px, **RGBA**. Transparent outside the rounded "squircle";
  a subtle drop shadow sits below the bottom edge.
- It is a complete app-icon artwork: a dark rounded square with a green frame, a
  green duck head + orange/gold swoosh, and the "Maminco" script wordmark baked
  in. Because the wordmark is part of the artwork, the full logo is used as the
  app icon / badge, while a wordmark-free **mark** (duck + swoosh) is used where
  the name is rendered as text.

## 2. Palette (sampled from the PNG)

| Element                 | Hex       |
| ----------------------- | --------- |
| Squircle frame (green)  | `#5eaa38` |
| Duck — bright           | `#118b37` |
| Duck — mid              | `#065c30` |
| Swoosh — gold/yellow    | `#fbb807` |
| Swoosh — orange         | `#f45600` |
| Interior background     | `#0b0d12` |
| Wordmark                | `#ffffff` |

The interior near-black `#0b0d12` is the flatten background (`BG` in the script).
Brand tokens in `src/constants/theme.ts` (`#143f29`, `#fcbe28`, `#f26c1e`) are
close to the logo and remain the source of truth for UI colors.

## 3. Generation

All assets are derived from the single source with
`scripts/generate-logo-assets.cjs` (uses `jimp-compact`, already shipped with
Expo). Run from `maminco-mobile`:

```bash
node scripts/generate-logo-assets.cjs
```

Key crops (source pixels):

- `SQUIRCLE = { x: 46, y: 41, w: 1150, h: 1150 }` — the artwork without the
  transparent margin and drop shadow.
- `MARK = { x: 280, y: 245, w: 710, h: 540 }` — duck + swoosh only; the green
  frame and the wordmark below are excluded.

The mark is cut out with a luminance ramp (`(lum - 28) / 40`) that maps the
near-black interior to transparent and keeps the green/gold artwork, then
autocropped. If the artwork changes, adjust that range.

## 4. Expo assets (`maminco-mobile/assets`)

| File                        | Size   | Content                              | Use |
| --------------------------- | ------ | ------------------------------------ | --- |
| `icon.png`                  | 1024²  | Full logo flattened over `#0b0d12`   | App icon (iOS + base) |
| `adaptive-icon.png`         | 1024²  | Mark centred at 60% on transparent   | Android adaptive foreground |
| `monochrome-icon.png`       | 1024²  | Mark at 60% filled black             | Android themed icon |
| `splash-icon.png`           | 512²   | Full logo on transparent             | Splash (`#0b0d12`) |
| `favicon.png`               | 512²   | Full logo on transparent             | Expo web favicon |
| `icons/maminco-logo.png`    | 512²   | Full logo on transparent             | In-app badge (login) |
| `icons/maminco-mark.png`    | 512×389| Mark (duck + swoosh) on transparent  | Wordmark-free UI use |

Config (`app.json`): `icon`, `android.adaptiveIcon` (`foregroundImage`,
`monochromeImage`, `backgroundColor: "#0b0d12"`), `expo-splash-screen`
(`backgroundColor: "#0b0d12"`, `imageWidth: 180`) and `web.favicon`.

The logo is imported with the `@/assets/*` path alias (declared in
`tsconfig.json`), e.g. `require('@/assets/icons/maminco-logo.png')`.

## 5. Web assets (`maminco-frontend`)

Next.js file conventions pick these up automatically:

| File / path                  | Size      | Use |
| ---------------------------- | --------- | --- |
| `app/icon.png`               | 512²      | Browser favicon / app icon |
| `app/apple-icon.png`         | 180²      | Apple touch icon (opaque) |
| `app/favicon.ico`            | 16/32/48  | Classic favicon (PNG-in-ICO) |
| `app/opengraph-image.png`    | 1200×630  | Open Graph card |
| `app/twitter-image.png`      | 1200×630  | Twitter card |
| `app/manifest.ts`            | —         | PWA manifest |
| `public/maminco-logo.png`    | 512²      | Full logo for UI badges |
| `public/maminco-mark.png`    | 512×389   | Wordmark-free mark |
| `public/icon-192.png`        | 192²      | PWA icon |
| `public/icon-512.png`        | 512²      | PWA icon |
| `public/maskable-512.png`    | 512²      | PWA maskable (logo at 80% on `#0b0d12`) |

Usage in UI: login (`app/auth/login/page.tsx`), admin sidebar
(`app/(admin)/layout.tsx`) and POS header (`app/(pos)/layout.tsx`) render
`/maminco-logo.png` next to the "Maminco" wordmark via `next/image`.

## 6. Notes

- iOS app icons must be opaque (Apple rejects alpha), hence the flattened
  `icon.png` / `apple-icon.png`.
- Android adaptive icons live in the centre 66% safe zone, so the foreground is
  the mark scaled to 60%; the background color is the artwork near-black
  `#0b0d12`.
- Rebuild the native binary (`npx expo run:ios` / `npx expo run:android`) to see
  the launcher icon; the in-app logo updates on a JS reload.
