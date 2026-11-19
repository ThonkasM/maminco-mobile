# Maminco Design System

Screens consume semantic tokens from `useTheme()`. Do not hardcode hex values in
screens; add or adjust tokens in `src/constants/theme.ts` instead.

## Identity

Inspired by the printed menu: dark charcoal, leaf green, warm cream and amber/orange.
Light is the primary identity; dark is a tuned variant, not an inversion.

## Semantic tokens

`ThemeColors` is the only interface screens should depend on:

| Token                    | Light     | Dark      | Purpose                                  |
| ------------------------ | --------- | --------- | ---------------------------------------- |
| `background`             | `#faf7f0` | `#131110` | Screen background                        |
| `surface`                | `#ffffff` | `#1b1815` | Cards, sheets                            |
| `surfaceAlt`             | `#f2ecdf` | `#221f1b` | Chips, inputs, subtle rows               |
| `text` / `muted`         | `#1a1713` / `#5a5348` | `#f1ece0` / `#a79f90` | Primary / secondary text |
| `primary` / `onPrimary`  | `#35701a` / `#fff` | `#417d1c` / `#fff` | Brand actions              |
| `accent` / `onAccent`    | `#fcbe28` / `#191919` | `#f2c14e` / `#191919` | Highlights            |
| `border`                 | `#e5dccb` | `#2f2a23` | Hairlines and dividers                   |
| `success` `warning` `danger` `info` | `#15803d #b45309 #c62828 #2563eb` | `#1d7f45 #b45309 #c0392b #60a5fa` | Status |
| `nav` / `navForeground`  | `#121212` / `#f4efe4` | same | Charcoal bars (tab bar) and their content |
| `menuGreen`              | `#457e20` | same      | Letters, buttons and active states on charcoal |
| `leaf`                   | `#4c8f21` | same      | Thin 3px rule under charcoal headers     |

`gradients.amberGradient` (`#fcbe28` to `#f26c1e`) is only for the main call to
action: `Button variant="brand"` (login "Ingresar", payment "Cobrar"), always with
dark text (`onAccent`).

Dark mode is driven by the OS (`userInterfaceStyle: "automatic"`).

### Status-fill rule

`success`, `warning` and `danger` are SOLID fills (contrast >= 5:1 with white).
Anything using them as a background (table tiles, danger buttons, badges, kitchen
notes) must use white text. No pastel/translucent tints of status colors.
`tableStatusColor()`: `AVAILABLE -> success`, `OCCUPIED -> danger`, `RESERVED -> warning`.

## Display font

`fonts.display` (`Anton_400Regular`, loaded in `src/app/_layout.tsx`) is for screen
titles and big KPI section headers only: uppercase, `letterSpacing: 0.5`,
`fontWeight: 'normal'`. Never use it for body text.

## Spacing scale

4pt base: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`.

## Radii

`sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · pill 999`; `dotSize` 10..

## Typography

`fontSize`: `xxs 10 · xs 11 · sm 13 · md 15 · lg 18 · xl 24 · xxl 32`.
Weights: `regular 400 · medium 500 · semibold 600 · bold 700`.

## Components (`src/components/ui`)

### Button

- Variants: `primary` (brand green), `brand` (amber gradient CTA), `accent` (yellow), `secondary`, `outline`,
  `ghost`, `danger`.
- Sizes: `sm 36 · md 46 · lg 54` (height).
- Props: `title`, `icon`, `iconPosition`, `loading`, `disabled`, `fullWidth`.
- Disabled/loading renders at 50% opacity and blocks presses.

### Card

- Surface background, hairline border, `radii.lg`.
- Optional `title`/`subtitle` header and `footer` divider.
- `padded` (default true) and `elevated` (shadow) flags.

### Input

- Label, leading icon, hint and error message.
- Border turns `primary` on focus and `danger` on error.

### Badge

- Tones: `neutral · primary · accent · success · warning · danger · info`.
- Uppercase, pill-shaped. `color` overrides the background for custom statuses.

### Screen

- `SafeAreaView` wrapper with optional scrolling and pull-to-refresh.
- Props: `scroll`, `padded`, `edges`, `refreshing`, `onRefresh`.

### EmptyState / Skeleton

- `EmptyState` for zero-data and error states (icon, title, description, action).
- `Skeleton` for animated loading placeholders.

### Feedback (notifications & confirmation)

Use `useFeedback()` (from `src/providers/feedback-provider.tsx`) instead of
`Alert` or ad-hoc inline state:

- `notify('success' | 'error' | 'info', message)` — shows a **centred, brand-styled
  banner** at the top of the screen that auto-dismisses (5s for errors). Use it for
  the result of an action (order created, payment completed, request failed).
- `confirm({ title, message, confirmText, cancelText, destructive })` — returns
  `Promise<boolean>` and renders a **centred confirmation dialog**. Use it before
  destructive or irreversible actions (e.g. cancelling an order).

Both use the semantic theme tokens, so they follow light/dark automatically.
