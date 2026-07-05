# Design

> Captured from the existing committed system (`src/app/globals.css`, `src/app/layout.tsx`,
> `src/components/ui/*`, `src/lib/brand.ts`). This is descriptive of what's there, not
> aspirational. Polish passes refine against this; they don't replace it.

## Theme: BaddieLegal — dark, neon-Y2K product UI

A confident dark product surface with a hot-pink + cyan Y2K-baddie identity. Built on
Tailwind v4 + shadcn (Base UI flavor). Default theme is dark-only — there is no light
theme and none is planned. The brand identity *is* the dark neon look; a light mode would
contradict it.

The product register wins over the marketing register: dashboard density, scannability,
and task-flow come first. The neon is used as chrome, accent, and key-moment emphasis —
not as a wall-to-wall light show. The root `/` landing page is the one place the brand
gets to shout.

## Color

All colors defined as CSS custom properties in `:root` and mirrored in `.dark` (currently
identical — `.dark` exists for selector completeness). Hex values are the source of truth;
**TODO: migrate to OKLCH** so tints/shades compose predictably and the contrast gaps
noted in `PRODUCT.md` can be fixed without trial-and-error.

### Brand palette

| Token            | Hex       | Role                                                                       |
| ---------------- | --------- | -------------------------------------------------------------------------- |
| `--primary`      | `#ff69b4` | Hot pink. CTAs, key emphasis, brand moments, focus ring.                   |
| `--primary-dark` | `#cc1f7a` | Pressed / deepest pink.                                                    |
| `--primary-hover`| `#e055a0` | Hover pink (between primary and dark).                                     |
| `--primary-light`| `#ff8cc8` | Tint for soft pink surfaces, badges, hero accent text.                     |
| `--secondary`    | `#00ffff` | Cyan. The baddie counterpart to pink — used sparingly for contrast accent. |
| `--secondary-light` | `#66ffff` | Cyan tint.                                                              |
| `--secondary-hover` | `#00cccc` | Hover cyan.                                                             |

Pink and cyan are a **deliberate complementary pair**. They are NOT used together as a
status pair (that's a colorblind hazard for deuteranopes/protanopes) — see Status below.

### Neutrals (dark surfaces)

| Token            | Hex       | Role                                                  |
| ---------------- | --------- | ----------------------------------------------------- |
| `--background`   | `#000000` | Pure black. App canvas. Deliberate, not accidental.   |
| `--foreground`   | `#ffffff` | Pure white. Primary text.                             |
| `--card`         | `#111111` | Card / raised surface (`#111` on black).              |
| `--popover`      | `#111111` | Popovers, dropdowns, dialogs.                         |
| `--muted`        | `#1a1a1a` | Muted surface (hovers, secondary panels).             |
| `--muted-foreground` | `#888888` | Secondary text. Verified: #888 on #000 = **5.92:1** (passes WCAG AA for normal text); on #111 card = **5.33:1** (also passes). Token is fine as-is — do not "fix" without re-measuring. |
| `--accent`       | `#222222` | Accent surface (selected items, sidebar accent).      |
| `--border`       | `#222222` | Hairline borders. `#222` on `#000` is subtle — fine for inner dividers, **too low for input boundaries** (use ring on focus). |
| `--input`        | `#222222` | Same as border.                                       |
| `--disabled`     | `#555555` | Disabled control fill / text.                         |

### Status (semantic)

**Each status MUST be paired with an icon + text label, never color alone.** Pink and
cyan are reserved for brand, not status, so the status set does not collide with brand.

| Token            | Hex       | Meaning                              | Pair with icon        |
| ---------------- | --------- | ------------------------------------ | --------------------- |
| `--success`      | `#00ff88` | Citation valid / operation succeeded | `CheckCircle2`        |
| `--warning`      | `#ffaa00` | Citation has issues (e.g. negative treatment) | `AlertTriangle` |
| `--destructive`  | `#ff4466` | Citation not found / overruled / error | `XCircle` / `ShieldAlert` |
| `--info`         | `#00aaff` | Neutral info, "needs review"         | `Info`                |

All status colors use **black foreground** (`*-foreground: #000000`) because the hues are
bright enough that white text fails contrast. Keep that pairing.

### Charts

`--chart-1` pink, `--chart-2` cyan, `--chart-3` green, `--chart-4` amber, `--chart-5` blue.
Five-color maximum; do not extend.

### Admin override (`.admin` class)

A separate restrained palette (`#47c2e1` teal-blue primary on `#0e1016` ink) for the
`/admin` surface. Admin is internal tooling — it intentionally drops the baddie neon so
staff don't burn out their eyes during long sessions. **Do not export admin tokens to
user-facing surfaces.**

### Focus / ring

`--ring: #ff69b4` (pink). All focusable elements get `focus-visible:ring-ring/50` with a
pink border. This is the brand appearing in the keyboard-navigation layer — keep it.

## Typography

### Family

**Single family: Geist** (`next/font/google`), exposed as `--font-sans` and aliased to
`--font-heading` (no display/serif pair). Geist is a modern geometric-grotesque sans — it
carries both UI and headings.

- No second font is loaded. Do not introduce one without a real reason.
- Display-weight contrast comes from **weight + size + tracking**, not from a second family.
- `font-heading` and `font-sans` resolve to the same stack today; the alias exists so a
  future display face can slot in without touching component classes.

### Scale & weight

Geist ships variable weight. Current usage (audit `page.tsx`, `card.tsx`, `button.tsx`):

| Element        | Classes (observed)                | Notes                                            |
| -------------- | --------------------------------- | ------------------------------------------------ |
| Hero h1        | `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight` | Gradient-clipped last word. Per Impeccable ceiling, **tracking-tight (-0.025em) is fine; do not go below -0.04em.** |
| Card title     | `text-base font-medium`           | `leading-snug` from card component.              |
| Body           | `text-sm` / `text-base` / `text-lg` | Default body is `text-sm` in the product UI (dense). |
| Muted/secondary| `text-sm text-muted-foreground`   | The contrast failure lives here — see Color.     |
| Button         | `text-sm font-medium`             | `text-xs` at `xs` size.                          |
| Badge / micro  | `text-xs`                         |                                                  |

### Typographic rules (carry into every polish pass)

- **Display letter-spacing floor: `-0.04em`.** Never tighter. Current `tracking-tight`
  (-0.025em) on the hero is the sweet spot; do not "design-tighten" past it.
- Body line length: cap at 65–75ch (enforce via `max-w-prose` or `max-w-xl` on prose).
- `text-wrap: balance` on h1–h3, `text-wrap: pretty` on long prose — not yet in globals,
  add on next polish.
- Muted body text must hit ≥4.5:1 — the `#888888` default fails. Fix at the token, not
  per-component.

## Components

shadcn (Base UI flavor) primitives in `src/components/ui/`:

`alert`, `badge`, `button`, `card`, `dialog`, `input`, `label`, `progress`, `select`,
`separator`, `skeleton`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

### Conventions

- **Composition over configuration.** `Card` exposes `Card / CardHeader / CardTitle /
  CardDescription / CardAction / CardContent / CardFooter` — compose, don't fork.
- **`data-slot` attributes** drive styling hooks (`data-slot="card"`, `data-slot="button"`).
  Preserve these when editing; component-level CSS relies on them.
- **`size` prop pattern.** Card accepts `size="default" | "sm"` and uses container queries
  (`@container/card-header`) and group data attributes (`group-data-[size=sm]/card:`) to
  scale internals. Other components use explicit size variants (`xs / sm / default / lg`).
- **`group/*` namespacing.** Card uses `group/card`, button uses `group/button`. When
  nesting components, namespace your group to avoid clobbering parent state.
- **CVA variants.** Button variants: `default / outline / secondary / ghost / destructive /
  link`. Sizes: `default / xs / sm / lg / icon / icon-xs / icon-sm / icon-lg`. Reuse
  these; only add a new variant if none fits.
- **`render` prop for polymorphism.** `<Button render={<Link href="..." />}>` composes
  with Next.js `<Link>` instead of a custom `asChild`. This is the Base UI flavor's idiom
  — use it, don't reach for `asChild`.
- **Radius scale** is token-driven off `--radius` (0.75rem): `sm/md/lg/xl/2xl/3xl/4xl`.
  Don't hardcode `rounded-xl` etc. without checking the scale — prefer `rounded-lg` (the
  base) for most surfaces, `rounded-xl` for cards, `rounded-full` for pills/badges.

### Component-level rules

- **No nested cards.** If a card contains another card, that's wrong — use a panel, a
  divider, or restructure.
- **Cards are not the default answer.** Use them for true card-shaped content (a report
  summary, a stat, a feature). Lists, tables, and forms should not be wrapped in cards
  reflexively.
- **Buttons default to `size="default"` (h-8).** The previous-generation shadcn default of
  h-10/h-11 is too tall for dense product UI. Keep the smaller scale unless a hero CTA
  genuinely needs `lg`.

## Layout

### App shell

- **Clerk-authenticated shell** wraps the whole app (`ClerkAppShell`) except in E2E bypass
  mode. Auth routes (`/sign-in`, `/sign-up`) and the public landing (`/`) live outside the
  dashboard.
- **Dashboard** (`(dashboard)` route group): persistent `DashboardSidebar` + top bar + main
  content. Routes: `/upload`, `/runs`, `/runs/[runId]`, `/reports/[reportId]`, `/settings`.
- **`(legal)` group**: `/privacy`, `/terms` — static legal pages.
- **`(admin)` group**: internal admin, uses the `.admin` theme override.

### Spacing rhythm

Tailwind's default spacing scale. Vary spacing for rhythm — don't make every section the
same `py-12`. Observed hero uses `pt-16 lg:pt-24` with `mt-20` between hero and feature
grid; that kind of asymmetric rhythm is the right instinct.

### Grid

- `repeat(auto-fit, minmax(280px, 1fr))` for responsive card grids without breakpoints.
- Feature grid on landing is `grid-cols-1 sm:grid-cols-3` — fine for fixed-count grids.
- Flexbox for 1D (button rows, list items), Grid for 2D (cards, settings panels).

### Max widths

- Hero content: `max-w-5xl` outer, `max-w-3xl` headline, `max-w-xl` subhead.
- Prose: cap 65–75ch.
- Full-bleed neon background glows are `absolute inset-0` with `pointer-events-none`.

## Iconography

**lucide-react** (`ShieldCheck`, `Zap`, `FileSearch`, `Receipt`, `CheckCircle2`, etc.).
Stroke-based, consistent with the modern product-UI register.

- Default icon size in buttons/inputs: `size-4` (16px) — set via `[&_svg:not([class*='size-'])]:size-4`.
- Status icons pair with status colors but carry their own shape so colorblind users
  still read them.

## Motion

`tw-animate-css` is imported, providing utility-driven entrance/exit animations.

### Rules

- **Reduced motion is mandatory.** Every gradient-shimmer, neon-glow pulse, and transition
  must be wrapped so `@media (prefers-reduced-motion: reduce)` disables it. Currently not
  enforced globally — add to globals.css on next polish.
- **Default transition: `transition-all`** with Tailwind's default durations (150–200ms).
  Entrance/exit via tw-animate-css utilities. Keep modal/dialog entrances at ≤220ms
  ease-out — anything longer feels laggy on a tool users return to daily.
- **Optimistic UI for the citation pipeline.** When a user kicks off a run, the UI should
  reflect "working" instantly via skeletons/spinner, not wait for server confirmation.

## Z-index

No formal scale yet — current pages use `z-10` for content above background glows. Define
a real scale before adding dropdowns/modals/tooltips layers:

```
dropdown: 1000
sticky: 1100
modal-backdrop: 1200
modal: 1210
toast: 1300
tooltip: 1400
```

(Pending — flag on next polish that touches any of these.)

## Known issues to fix in polish passes

These were surfaced by the crawl and should be addressed surface-by-surface:

1. **`--muted-foreground: #888888`** verified to pass WCAG AA on this palette (5.92:1 on
   black, 5.33:1 on card). No token change needed — keep as-is.
2. **No `prefers-reduced-motion` guard** in globals.css despite neon glows on the landing.
3. **No formal z-index scale.**
4. **No `text-wrap: balance` / `pretty`** anywhere — headlines and prose both benefit.
5. **Status signaled by color in several places** without an icon+label pair (audit each
   report view).
6. **Mobile tap targets**: verify all interactive elements hit ≥44px on the upload and
   report flows (pro se filers are phone-first).
