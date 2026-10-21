# Design system: Glossy Glass for ছায়া বাড়ি

> The source of truth for how Chaya Bari looks, moves and reads. It adapts the
> "Glossy Glass" master brief (`glass-redesign-master-prompt.md`) to a premium
> homemade-food brand. The vault node [`design-system`](vault/nodes/design-system.md)
> holds the rules (R-DSN-…) and decisions (D-DSN-…) derived from this file. Change
> both together, and ask the owner before breaking a rule.

## 1. Direction

A premium, transparent, glossy **glass** interface over a soft, slowly drifting
**aurora**. New visitors start on **Random**, which rotates through seven palettes.
Each palette has true light and dark modes contrast-checked to WCAG 2.2 AA. When a
user picks a fixed palette instead, the brand palette **Ember & Gold** is the default.

**Core feeling:** premium, appetizing, trustworthy, calm. Glass, gloss and motion
serve trust, clarity and easy ordering. They never get in the way.

Priorities: **food photography → readability → trust → easy ordering → premium identity.**
The site should feel like *a premium homemade-food brand, not a generic restaurant template.*

Avoid cheap neon red or yellow, text on decorative gradients, crowded layouts, and
animation that distracts from ordering.

## 2. Tokens: the single source of truth

| File | What |
|---|---|
| `client/src/styles/tokens.css` | Neutral, status, type, shape and motion tokens, the dark base, and legacy aliases |
| `client/scripts/palettes.mjs` | **Palette data.** Verifies contrast, then generates the two files below |
| `client/src/styles/palettes.css` | Generated: palette blocks for light and dark |
| `client/src/lib/palettes.gen.ts` | Generated: palette ids, bilingual names, swatch stops |
| `client/src/styles/glass.css` | Glass surfaces, components, motion |
| `client/src/index.css` | Base elements, typography, layout shell |

- **No component may hard-code a colour.** Everything reads a token.
  `npm run check:design` enforces this (with the contrast checks). White and black
  alpha values are allowed only for gloss highlights, glass borders and shadows.
- Third-party brand colours are tokens too (`--brand-bkash`).
- Printed documents use `--print-*` tokens and are always a white sheet.

## 3. Colour

### 3.1 Theme and palette switching

- Theme: `<html data-theme="light|dark">`. With no attribute the theme is **System**
  and follows `prefers-color-scheme` live.
- Palette: `<html data-palette="sapphire|emerald|coral|orchid|amber|teal">`. With no
  attribute the palette is **Ember** (the brand default).
- **Palette preference** (`chaya-palette`): a palette id, or `random`. A missing
  value means `random`, so **new visitors start on Random**. Random shows a random
  palette (never the one just shown), keeps it for a random 30 seconds to 5 minutes
  (`chaya-palette-random` stores `{id, until}`, so a reload never jumps), then
  crossfades to another. It never swaps while the tab is hidden, while the user is
  typing, or while the picker is open (it checks again every 30s). Open tabs stay
  in sync. Under reduced motion the swap is instant.
- Cascade order: neutral light tokens on `:root` (0,1,0) → light palette blocks
  (0,2,0) → neutral dark base (0,2,0) → dark palette blocks (0,3,0).
- **No flash:** an inline script in `client/index.html` reads `chaya-theme`,
  `chaya-palette`, `chaya-palette-random` and `chaya-lang` from localStorage and
  sets the attributes before first paint, including making the random pick. Every
  storage call is wrapped in `try/catch`. Its palette-id list is injected by
  `npm run palettes`.
- Runtime: `ThemeProvider` / `useTheme()` (`context/ThemeContext.tsx`) exposes
  `mode` (light/dark/system), the resolved `theme`, `palettePref` (id or
  `random`), the applied `palette`, `setMode` and `setPalette`.

### 3.2 Neutral tokens (shared by every palette; Ember overrides text and muted for warmth)

| Token | Light | Dark |
|---|---|---|
| `--text` | `#0B1530` (Ember `#1D1512`) | `#E8EDF7` (Ember `#F5F1E7`) |
| `--muted` | `#45526B` (Ember `#5C5049`) | `#A3AEC6` (Ember `#B9AFA5`) |
| `--outline` | `rgba(11,21,48,.09)` | `rgba(255,255,255,.08)` |
| `--glass` (cards) | `rgba(255,255,255,.56)` | `rgba(255,255,255,.055)` |
| `--glass-strong` (popovers, toasts, nav) | `rgba(255,255,255,.78)` | `rgba(18,24,48,.72)` |
| `--glass-solid` (no-blur fallback) | `#FBFCFF` | per palette |
| `--glass-inset` (inputs, inner panels) | `rgba(255,255,255,.55)` | `rgba(255,255,255,.06)` |
| `--edge` / `--edge-low` | `rgba(255,255,255,.85)` / `rgba(11,21,48,.06)` | `rgba(255,255,255,.14)` / `.05` |
| `--gloss-top` / `--gloss-sheen` | `.9` / `.45` white | `.22` / `.09` white |
| `--shadow` / `--shadow-lift` | soft blue-grey | deep black |

### 3.3 Status colours: meaning, not decoration

The status colours never change with the palette. Each one is always paired with
an **icon and a text label**, and status is never shown by colour alone.

| Status | Light (text / bg) | Dark (text / bg) | Used for |
|---|---|---|---|
| success | `#15803D` / `rgba(22,163,74,.12)` | `#4ADE80` / `.12` | delivered, paid, verified, gains |
| warning | `#A44A06` / `rgba(245,158,11,.16)` | `#FBBF24` / `.12` | pending, awaiting payment, missing phone, kitchen notes |
| danger | `#B91C1C` / `rgba(239,68,68,.12)` | `#F87171` / `.13` | cancelled, failed, rejected, losses, sold out |
| info | `#1D4ED8` / `rgba(59,130,246,.12)` | `#93C5FD` / `.13` | confirmed → out for delivery, admin preview |

The order-status pills use these icons: ◷ pending · ✓ confirmed · ♨ preparing ·
● ready · ▣ packed · ➜ out for delivery · ✓ delivered · ✕ cancelled · ৳ COD. The
icons are hidden from assistive tech, because the label carries the meaning.

### 3.4 Palettes

Every palette defines `--canvas`, `--canvas-2`, `--accent`, `--accent-ink`,
`--accent-soft(-2)`, `--grad`, `--h-grad`, `--btn-grad`, `--btn-solid`,
`--on-accent`, `--btn-glow`, `--spot`, `--aur-1…4` and, in dark mode, `--glass-solid`.

| id | Name (bn / en) | Notes |
|---|---|---|
| `random` *(preference)* | এলোমেলো / Random | **Default for new visitors.** Rotates through all palettes below |
| *(none)* `ember` | অঙ্গার ও সোনা / Ember & Gold | **Default fixed palette.** Red actions, gold values. White text on red buttons in both modes |
| `sapphire` | নীলকান্ত লেগুন / Sapphire Lagoon | |
| `emerald` | পান্না বাগান / Emerald Garden | |
| `coral` | প্রবাল সন্ধ্যা / Coral Sunset | |
| `orchid` | রাজকীয় অর্কিড / Royal Orchid | |
| `amber` | সোনালি বিকেল / Golden Hour | |
| `teal` | তাজা পুদিনা / Fresh Mint | The brief's "Clinical Teal", renamed for food |

The exact stops live in `client/scripts/palettes.mjs`. Six palettes use the brief's
values unchanged. Ember was generated the same way and verified to pass every ratio.

### 3.5 Which gradient, where

| Token | Use for | Never |
|---|---|---|
| `--grad` | **Decoration only:** kicker lines, progress fills, palette orbs, the glossy orb behind a dish, the promo edge bar | text on top of it |
| `--h-grad` | **Gradient text:** the hero headline highlight. Apply it to the text element itself, with `background-clip: text` and a 16s flow | backgrounds |
| `--btn-grad` + `--on-accent` | Primary buttons, active tab, brand mark, avatar tiles, sale badge, cart count | anything without `--on-accent` text |
| `--accent-soft` + `--accent-ink` | Soft buttons, active nav pill, selected rows | |

### 3.6 Verified contrast (`npm run palettes` re-checks every stop)

- Body text ≥ 14:1, muted text ≥ 4.5:1.
- `--accent-ink` on canvas ≥ 5.6:1 (light) and ≥ 7.8:1 (dark).
- Every `--h-grad` stop ≥ 4.6:1.
- `--on-accent` on both `--btn-grad` stops ≥ 4.8:1.
- `--accent` (focus rings) ≥ 3.5:1.

A new palette must pass the script. Generate it the way the brief does: soften
saturation by about 12%, then adjust each stop's lightness until it passes.

## 4. Typography

- **Self-hosted fonts** (`client/src/fonts.css`). There are no Google Fonts, so
  Bengali digits such as ১ always render from the real font. Body text uses
  **Hind Siliguri**; headings and display use **Anek Bangla**. Both carry Latin
  subsets for English, with fallbacks Noto Sans Bengali, Nirmala UI and system-ui.
- **Bangla letter-spacing is always 0.** Tracking breaks conjuncts (যুক্তাক্ষর) and
  vowel signs. This is enforced globally under `:root[lang='bn']`, and the
  `--tracking-*` tokens become 0.
- English headings use `-0.03em` (`--tracking-tight`). Eyebrows use `--tracking-wide`.
- Line-height: Bangla body text is 17px / 1.78, English is 16px / 1.6.
- `text-wrap: balance` on headings, and `tabular-nums` on prices, tables and stats.
- The minimum text size is 13–14px.

## 5. Shape, surfaces and the glass system

**Radii:** cards and popovers 22px, nav pill 20px, buttons 14px, inputs 12px, pills 999px.

**Aurora:** one fixed layer (`<Backdrop/>`) at `z-index:-2`. It has four ~70vmax
radial blobs and no `filter: blur`, which is too expensive on low-end Android.
The blobs drift with transform-only keyframes over 32–50s, plus an SVG
`feTurbulence` grain at `--grain-op`.

**Glass** (`.glass`, `.card`, `.paper`, and also `.pcard`, `.hero`, `.trust__tile`,
`.review`, `.promo`, the header and the footer):
`--glass` + `backdrop-filter: blur(22px) saturate(170%)` + an `--edge` border +
inset gloss lines + `--shadow`. A `::before` adds the gloss sheen, and a
`::after` adds the cursor spotlight (pointer devices only, with `--mx`/`--my` set
by one delegated listener).

**Fallback:** with no `backdrop-filter`, or on `html.low-motion`, glass uses
`--glass-solid`.

**Readability:** long reading text sits on glass at least 0.56 opaque. Popovers
and menus use `--popover-bg` (97% `--glass-solid`) so text behind them never
bleeds through. Popovers that must blur render at body level, because a
backdrop-filter parent breaks nested blur.

**Where glass goes:** the floating nav pill, cards, product cards, search and
filters, tabs, popovers, toasts, the mobile action bar and the footer.

## 6. Components

- **Primary button** (`.btn--primary`, `.btn--brand`): `--btn-grad` + `--on-accent`,
  a glossy top half, a light streak on hover (900ms), and a lift of 2px. Press
  scales it to 0.97. Minimum height 48px (56px for `--lg`).
- **Ghost** (`.btn--ghost`, `.btn--on-dark`): glass with an `--edge` border; the
  border and text turn accent on hover.
- **Soft** (`.btn--soft`): `--accent-soft` with `--accent-ink`.
- **Danger** (`.btn--danger`): `--danger-bg` with `--danger`.
- **Segmented controls** (language, theme): `<Segmented/>`, whose glass thumb
  slides over 540ms with `--ease-spring`. Buttons use `aria-pressed`.
- **Inputs:** `--glass-inset`, 12px radius. On focus they get an `--accent`
  border, a 4px `--accent-soft` ring and a `--glass-strong` background.
- **Badges and status pills:** status colours + an icon + a pill shape + an
  `--edge-low` hairline.
- **Product card** (`ProductCard`): a compact, standard-size glass card: a square
  dish photo, the name (two lines max), rating, a tabular price and a round
  one-tap add button, with flags with icons (`%` sale, `⦸` sold out). Cards
  never grow to fill a row; the big photo lives on the product page (up to 520px).
- **Category menu** (`MenuByCategory`): a sticky glass chip bar; "All" shows each
  category as its own section with a "see all" link. The active chip uses
  `--btn-grad`.
- **Order tracker** (`OrderTracker`): five numbered steps joined by a progress
  rail, above a "now" banner with the next action in plain words. Payment is
  never a step. Cancelled orders show a danger banner instead.
- **Pay components**: `PayModePicker` (3 radio cards: pay first, pay later with
  the headroom, cash on delivery), `PayToUs` (account numbers with copy buttons),
  `ClaimForm` and `WalletTimeline` (dated entries, signed amounts, status pills).
- **Admin shell** (`AdminLayout`, `AdminSidebar`): a grouped glass sidebar
  (Orders, Money, Menu, Stock, Insights, Settings) with line icons and count badges,
  collapsing to a drawer below 960px. Admin pages lead with one primary action
  (the order page's "next step" card) and keep secondary detail in side cards.
- **Brand mark, avatar tiles, step numbers:** `--btn-grad` with a glossy top half.
- **Logo:** the gold mark on dark surfaces and the deep-red mark on light ones
  (follows the theme).
- **Palette picker** (`<PalettePicker/>`): a 46px glass trigger with a `--grad` orb
  that rotates 90° on hover. The body-level popover is clamped 12px from the
  viewport edges, holds a 2-column `radiogroup` with a roving tabindex and arrow
  keys (Random first, as a slowly spinning colour wheel with a shuffle glyph and a
  "Now: <palette>" hint, then the seven palettes), includes a Light/Dark/System switch kept in sync with the nav, and
  explains that status colours never change. Escape and outside clicks close it,
  and focus returns to the trigger. Below 560px the nav's theme switch is hidden
  and the popover holds it.
- **Skeletons** (`.skeleton`) instead of spinners for content. **Toasts** (`.toast`)
  use `--glass-strong` and spring in. **Mobile action bar** (`.action-bar`, below
  768px) is sticky glass with safe-area padding.

## 7. Motion

**Easing:** `--ease-out` cubic-bezier(.16,1,.3,1), `--ease-spring` (.22,1,.36,1),
`--ease-silk` (.65,0,.35,1). **Durations:** UI 420ms, entrance 800ms, press 120ms.

- **Theme and palette changes:** a circular View Transition reveal from the
  control that was tapped (`withViewTransition` in `lib/appearance.ts`).
  **Automatic Random swaps** use the soft crossfade instead. State never depends
  on the animation: if the browser hasn't run the update within 400ms, it is
  applied directly.
- **Language change:** a crossfade (`html.vt-fade`), old view out over 360ms and
  new view in from 8px over 520ms.
- **Entrance:** only elements that start **below the fold** get the hidden state.
  An IntersectionObserver reveals each one once (800ms, 80ms stagger). First-paint
  content is never left at opacity 0.
- **Hover:** cards lift 6px with `--shadow-lift`, on pointer devices only.
- **Hero:** the stage tilts (`[data-tilt]`, up to ±9°/±11°) with a pointer glare.
  The product orbs, caption chips and rating chip float on 7–8.5s loops, and the
  headline gradient flows over 16s.
- **Nav:** a floating glass pill that compresses on scroll (`scale(.965) translateY(-4px)`).
- **Performance:** animate only `transform`, `opacity` and `clip-path`.
  `prefers-reduced-motion` turns off every decorative loop, the reveal, the tilt
  and view transitions. `html.low-motion` (≤ 4 cores or Save-Data) stops the
  decorative loops and uses solid glass.

## 8. Accessibility and the non-negotiables

- Bangla is the default, and the language switch is always visible.
- Touch targets are ≥ 48px. Focus rings are 2px `--accent` with a 2px offset.
  There is a skip link ("মূল অংশে যান / Skip to content") and a `#main` landmark.
- Semantic HTML and full keyboard support; zoom to 200% without breaking; no
  horizontal scroll at 360px; safe-area insets respected.
- Never convey status by colour alone.
- Trust signals for a food brand: 100% homemade, fresh ingredients, hygienic
  kitchen, real verified reviews only, transparent delivery charge and cutoff.
- Destructive actions need confirmation.
- Performance budget: no new dependencies. The design system is CSS plus about
  3KB of JS.

## 9. Layout

The maximum content width is about 1240px. The home page runs: sticky glass nav
→ glass hero (copy plus a tilting product stage) → trust tiles → popular dishes →
combo promo → real reviews → glass footer. Product grids use `minmax(176px, 1fr)`:
5–6 compact cards per row on desktop, 3–4 on tablet and 2 on mobile.

## 10. What changed from the brief (adaptations for Chaya Bari)

The brief was written for a health platform, so it was adapted. Each adaptation
is a decision on the `design-system` vault node (confirmed by the owner on 2026-10-21):

- Health-only items were dropped: BMDC badges, dose units, the emergency 999
  message, and "emergency colours".
- **Ember & Gold** was added as the default palette, so the brand's red and gold
  identity and its logo carry over. Clinical Teal was renamed Fresh Mint.
- **Fonts stay self-hosted.** There are no Google Fonts or Plus Jakarta/Inter
  faces (an earlier decision fixed Bengali digit rendering this way).
- Storage keys use the existing `chaya-*` names (`chaya-theme`, `chaya-palette`,
  `chaya-lang`) instead of `sh-*`, so returning visitors keep their choices.
- There is no Bangla-numeral toggle. Numerals follow the language (owner-confirmed).
- **Random** was added as the default palette preference at the owner's request
  (not in the brief).
