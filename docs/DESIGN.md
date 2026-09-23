# Maminco Design System

Screens consume semantic tokens from `useTheme()`. Do not hardcode hex values in
screens; add or adjust tokens in `src/constants/theme.ts` instead.

## Palette (brand-locked)

| Name       | Hex       | Role                                  |
| ---------- | --------- | ------------------------------------- |
| Dark green | `#143f29` | Primary brand / primary actions       |
| Dark gray  | `#191919` | Dark background, primary text (light) |
| Yellow     | `#fcbe28` | Accent / highlights                   |
| Orange     | `#f26c1e` | Alert / attention accent              |

## Semantic tokens

`ThemeColors` is the only interface screens should depend on:

| Token                    | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `background`             | Screen background                        |
| `surface`                | Cards, sheets, tab bars                  |
| `surfaceAlt`             | Chips, inputs, subtle rows               |
| `text`                   | Primary text                             |
| `muted`                  | Secondary/helper text                    |
| `primary` / `onPrimary`  | Brand actions and their content color    |
| `accent` / `onAccent`    | Highlights and their content color       |
| `border`                 | Hairlines and dividers                   |
| `success` `warning` `danger` `info` | Status feedback              |

Light and dark variants are provided (`lightColors`, `darkColors`). Dark mode is
driven by the OS (`userInterfaceStyle: "automatic"`).

Table status colors are derived: `AVAILABLE → success`, `OCCUPIED → danger`,
`RESERVED → warning` via `tableStatusColor()`.

## Spacing scale

4pt base: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`.

## Radii

`sm 8 · md 12 · lg 16 · xl 24 · pill 999`.

## Typography

`fontSize`: `xs 11 · sm 13 · md 15 · lg 18 · xl 24 · xxl 32`.
Weights: `regular 400 · medium 500 · semibold 600 · bold 700`.

## Components (`src/components/ui`)

### Button

- Variants: `primary` (brand green), `accent` (yellow), `secondary`, `outline`,
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
