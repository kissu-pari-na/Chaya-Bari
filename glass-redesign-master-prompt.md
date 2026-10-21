# MASTER PROMPT — "Glossy Glass" redesign for an existing health platform

> Paste everything below into your coding assistant (Claude Code, Cursor, Copilot Chat, etc.) at the root of your project.
> Also attach `shustho-reference.html`. It is the working reference implementation of this design, and the assistant should read it before changing anything.

---

## ROLE
You are a senior Product Designer and Frontend Motion Engineer with Apple/Stripe-level craft and deep healthcare-UX experience for emerging markets (Bangladesh). You are restyling an **existing, working codebase**. Trust, clarity and speed come first. The glass, gloss and motion must serve them and never get in their way.

## GOAL
Change the **look and feel only** of this project to match the attached reference (`shustho-reference.html`):
- A premium, transparent, glossy "glass" interface over a soft, slowly drifting aurora background.
- Six user-selectable colour palettes, each with true light and dark modes, all contrast-checked to WCAG 2.2 AA.
- Smooth, calm motion and animated theme, palette and language transitions.

**Do not change** business logic, routes, API calls, data models, form behaviour, validation rules, i18n keys, or component public APIs (inputs, outputs, props). Restyle and enhance. Do not rewrite features.

---

## STEP 0 — AUDIT FIRST (report back before editing)
1. Detect the stack: Angular (version, standalone or NgModule, SCSS?), Next.js/React, Tailwind, a component library (Angular Material, PrimeNG, shadcn/ui, Bootstrap…), and any existing theme or token files.
2. List every place colours, shadows, radii and fonts are currently defined: global styles, SCSS variables, Tailwind config, the component library's theme, and inline styles.
3. List the shared UI components (button, card, input, select, tabs, badge, nav/header, modal/dialog, toast/snackbar, skeleton, footer) and the pages that use them.
4. Propose a short migration plan: which files you will add, which you will change, and in what order. Then wait for my "go".

---

## STEP 1 — DESIGN TOKENS (single source of truth)
Create one global token layer of CSS custom properties, for example `src/styles/tokens.css`, or `styles.scss` in Angular, or `app/globals.css` in Next.js.
- **No component may hard-code a colour.** Everything reads a token.
- Map the component library's theme variables and any Tailwind colours to these tokens.

### 1a. Theme and palette switching model
- The theme is set on `<html>` as `data-theme="light" | "dark"`. Leave the attribute off for **System**, which follows `prefers-color-scheme`.
- The palette is set on `<html>` as `data-palette="emerald" | "coral" | "orchid" | "amber" | "teal"`. Leave the attribute off for the default **sapphire**.
- **Selector order and specificity matter. Follow this exactly:**
  1. `:root { …all tokens, light values (sapphire)… }`
  2. **Light palette blocks**, placed before the dark base:
     `:root:not([data-palette]), :root[data-palette="sapphire"] {…}` and `:root[data-palette="emerald"] {…}`, and so on for each palette.
  3. **Dark base:** `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…neutral dark tokens…; color-scheme: dark} }` and `:root[data-theme="dark"] {…same…}`.
  4. **Dark palette blocks**, which have higher specificity:
     `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"])[data-palette="X"] {…} }` and `:root[data-theme="dark"][data-palette="X"] {…}`.
     For sapphire, use `:not([data-palette])` in place of `[data-palette="X"]`.
- **No flash on load.** A tiny inline script in `<head>` reads `localStorage` (`sh-theme`, `sh-palette`, `sh-lang`) and sets the attributes **before first paint**.
  - Angular: put it in `src/index.html`.
  - Next.js: put it in `app/layout.tsx` with `<script dangerouslySetInnerHTML>`, or use next-themes with `attribute="data-theme"`.
  - Wrap every storage call in `try/catch`.

### 1b. Neutral tokens (shared by all palettes)
| Token | Light | Dark |
|---|---|---|
| `--text` | `#0B1530` | `#E8EDF7` |
| `--muted` | `#45526B` | `#A3AEC6` |
| `--outline` | `rgba(11,21,48,0.09)` | `rgba(255,255,255,0.08)` |
| `--glass` (cards) | `rgba(255,255,255,0.56)` | `rgba(255,255,255,0.055)` |
| `--glass-strong` (popovers, toasts, active thumbs) | `rgba(255,255,255,0.78)` | `rgba(18,24,48,0.72)` |
| `--glass-solid` (fallback when there is no blur) | `#FBFCFF` | per palette, see below |
| `--glass-inset` (inputs, inner panels) | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.06)` |
| `--edge` (glass border) | `rgba(255,255,255,0.85)` | `rgba(255,255,255,0.14)` |
| `--edge-low` (hairline) | `rgba(11,21,48,0.06)` | `rgba(255,255,255,0.05)` |
| `--gloss-top` (inset top highlight) | `rgba(255,255,255,0.9)` | `rgba(255,255,255,0.22)` |
| `--gloss-sheen` | `rgba(255,255,255,0.45)` | `rgba(255,255,255,0.09)` |
| `--shadow` | `0 1px 1px rgba(11,21,48,.04), 0 12px 32px -12px rgba(30,60,140,.22)` | `0 1px 0 rgba(255,255,255,.03), 0 20px 40px -20px rgba(0,0,0,.8)` |
| `--shadow-lift` | `0 2px 2px rgba(11,21,48,.05), 0 30px 60px -20px rgba(30,60,140,.35)` | `0 1px 0 rgba(255,255,255,.05), 0 30px 60px -24px rgba(0,0,0,.9)` |
| `--grain-op` | `0.025` | `0.035` |

**Semantic status colours are reserved for meaning and never change with the palette.** Always pair each one with an icon and a text label:

| Status | Light (text / background) | Dark (text / background) |
|---|---|---|
| success | `#15803D` / `rgba(22,163,74,.12)` | `#4ADE80` / `rgba(74,222,128,.12)` |
| warning | `#A44A06` / `rgba(245,158,11,.16)` | `#FBBF24` / `rgba(251,191,36,.12)` |
| danger (emergency) | `#B91C1C` / `rgba(239,68,68,.12)` | `#F87171` / `rgba(248,113,113,.13)` |
| info | `#1D4ED8` / `rgba(59,130,246,.12)` | `#93C5FD` / `rgba(147,197,253,.13)` |

### 1c. Palette tokens (generated and contrast-checked — use these exact values)
Each palette defines the following tokens:
- `--canvas` and `--canvas-2`: page background, drawn as a vertical gradient from `--canvas-2` to `--canvas`.
- `--accent`: focus rings and selected borders.
- `--accent-ink`: links and accent text.
- `--accent-soft`: `--accent` at 10% opacity in light mode, 14% in dark mode.
- `--grad`: decorative only (progress bars, kicker lines, swatches, the palette dot). **Never place text on it.**
- `--h-grad`: gradient **text**, used for the headline highlight and the big serial number.
- `--btn-grad` with `--on-accent`: primary buttons, the active tab, the brand mark, step numbers and chip icons. Text and icons on these surfaces use `--on-accent`.
- `--btn-glow`: `--btn-grad`'s first stop at 32% (light) or 30% (dark) opacity.
- `--spot`: `--accent` at 10% (light) or 12% (dark) opacity.
- `--aur-1` to `--aur-4`: aurora blobs.

**LIGHT MODE**
| Palette | canvas / canvas-2 | accent | accent-ink | --grad stops | --h-grad stops | --btn-grad stops (white text) | aur-1 · aur-2 · aur-3 · aur-4 |
|---|---|---|---|---|---|---|---|
| Sapphire Lagoon (default) | `#F1F5FB` / `#F9FBFE` | `#3966CF` | `#2F5BC2` | `#3966CF` `#1E9CB6` `#26AC86` | `#3966CF` `#17798E` `#1C7D62` | `#3966CF` → `#187C91` | `rgba(57,102,207,.22)` · `rgba(30,156,182,.18)` · `rgba(38,172,134,.15)` · `rgba(255,211,189,.34)` |
| Emerald Garden | `#F0F6F2` / `#F8FCF9` | `#158360` | `#126E51` | `#158360` `#2BA77B` `#7CB742` | `#147C5B` `#207D5C` `#51782B` | `#15815F` → `#21805E` | `rgba(21,131,96,.22)` · `rgba(43,167,123,.18)` · `rgba(124,183,66,.15)` · `rgba(246,227,180,.34)` |
| Coral Sunset | `#FAF3F0` / `#FFF9F6` | `#C85780` | `#A93760` | `#C85780` `#E17D67` `#E59E60` | `#BE3E6D` `#C24226` `#A55C1B` | `#C14371` → `#C94528` | `rgba(200,87,128,.22)` · `rgba(225,125,103,.18)` · `rgba(229,158,96,.15)` · `rgba(255,214,196,.34)` |
| Royal Orchid | `#F5F2FA` / `#FBF9FD` | `#774DCD` | `#7043CA` | `#774DCD` `#AC44BC` `#D56298` | `#774DCD` `#A741B6` `#C33478` | `#774DCD` → `#AC44BC` | `rgba(119,77,205,.22)` · `rgba(172,68,188,.18)` · `rgba(213,98,152,.15)` · `rgba(227,214,251,.34)` |
| Golden Hour | `#FAF6EE` / `#FFFCF6` | `#AE6519` | `#905315` | `#AE6519` `#CC8823` `#CDA334` | `#A35F17` `#98651A` `#886C21` | `#A76118` → `#9B671B` | `rgba(174,101,25,.22)` · `rgba(204,136,35,.18)` · `rgba(205,163,52,.15)` · `rgba(251,226,190,.34)` |
| Clinical Teal | `#EFF6F5` / `#F8FBFB` | `#198E83` | `#136D65` | `#198E83` `#24A581` `#44BFAE` | `#167B71` `#1B7D62` `#2A7B70` | `#167E75` → `#1C8064` | `rgba(25,142,131,.22)` · `rgba(36,165,129,.18)` · `rgba(68,191,174,.15)` · `rgba(205,239,233,.34)` |

**DARK MODE** (`--on-accent` is `#06101F` in every palette)
| Palette | canvas / canvas-2 | glass-solid | accent and accent-ink | --grad stops = --h-grad stops | --btn-grad stops | aur-1 · aur-2 · aur-3 · aur-4 |
|---|---|---|---|---|---|---|
| Sapphire Lagoon | `#070B18` / `#0C1226` | `#10172E` | `#83B0F6` | `#83B0F6` `#5ACBDB` `#63D4AD` | `#83B0F6` → `#5ACBDB` | `rgba(55,101,209,.26)` · `rgba(29,157,183,.15)` · `rgba(37,173,135,.10)` · `rgba(29,45,83,.30)` |
| Emerald Garden | `#06110C` / `#0A1A13` | `#0F231A` | `#56CE9E` | `#56CE9E` `#86DCBA` `#B5DC81` | `#56CE9E` → `#86DCBA` | `rgba(20,132,97,.26)` · `rgba(41,169,123,.15)` · `rgba(124,184,65,.10)` · `rgba(24,88,68,.30)` |
| Coral Sunset | `#12080B` / `#1B0E12` | `#24141A` | `#ED9EB6` | `#ED9EB6` `#F0B994` `#EECD85` | `#ED9EB6` → `#F0B994` | `rgba(202,85,128,.26)` · `rgba(226,124,102,.15)` · `rgba(230,158,95,.10)` · `rgba(79,33,50,.30)` |
| Royal Orchid | `#0C0817` / `#140E22` | `#1B142D` | `#B7A2F8` | `#B7A2F8` `#DB93EB` `#EFB4D2` | `#B7A2F8` → `#DB93EB` | `rgba(118,75,207,.26)` · `rgba(173,67,189,.15)` · `rgba(214,97,151,.10)` · `rgba(47,31,81,.30)` |
| Golden Hour | `#100B05` / `#19130A` | `#22190E` | `#EBBD56` | `#EBBD56` `#ECCC78` `#ECD99B` | `#EBBD56` → `#ECCC78` | `rgba(176,101,23,.26)` · `rgba(206,136,33,.15)` · `rgba(206,164,51,.10)` · `rgba(89,57,23,.30)` |
| Clinical Teal | `#051110` / `#091A18` | `#0D2320` | `#47C6B5` | `#47C6B5` `#59CDA0` `#7FDCCE` | `#47C6B5` → `#59CDA0` | `rgba(24,143,133,.26)` · `rgba(34,167,130,.15)` · `rgba(67,192,175,.10)` · `rgba(25,87,82,.30)` |

**Gradient angles and stop positions:**
- `--grad`: `linear-gradient(120deg, s1 0%, s2 55%, s3 100%)`
- `--h-grad`: `linear-gradient(110deg, h1, h2, h3, h2, h1)` with `background-size: 250% 100%`
- `--btn-grad`: `linear-gradient(120deg, b1 0%, b2 100%)`

**Verified contrast (keep it this way):**
- Body text is 14:1 or higher everywhere.
- `--accent-ink` on canvas is at least 5.6:1 in light mode and 7.8:1 in dark mode.
- Headline gradient stops are at least 4.6:1.
- Button text on `--btn-grad` is at least 4.8:1.
- Focus rings are at least 3.5:1.
- If you add a new palette, generate it the same way: soften saturation by about 12%, then adjust the lightness of each stop until it passes these ratios.

### 1d. Type, shape and motion tokens
**Fonts:**
- Bangla: Hind Siliguri (fallback Noto Sans Bengali).
- English headings: Plus Jakarta Sans, weights 600, 700 and 800.
- English body: Inter.
- Load from Google Fonts with `display=swap`.

**Type rules:**
- **Bangla letter-spacing is always 0**, because negative tracking breaks conjuncts (যুক্তাক্ষর) and vowel signs.
- English headings use `-0.03em`.
- Line-height is 1.78 for Bangla body text and 1.6 for English. Bangla body text is 17px.
- Sizes (desktop → mobile): H1 58 → 38px, H2 38 → 28px, H3 20px. The minimum size is 13–14px.
- `text-wrap: balance` on headings, and `tabular-nums` wherever numbers line up in columns.

**Radii:** cards 22px, popovers 22px, buttons 14px, inputs 12px, pills 999px.

**Easing:**
- `--ease-out: cubic-bezier(0.16,1,0.3,1)`
- `--ease-spring: cubic-bezier(0.22,1,0.36,1)`
- `--ease-silk: cubic-bezier(0.65,0,0.35,1)`

**Durations:** UI 420ms, entrance 800ms, press 120ms.

---

## STEP 2 — THE GLASS SYSTEM
**Aurora background** — one fixed layer behind everything, at `z-index: -2`, with `pointer-events: none`:
- Four large circles, about 70vmax each, filled with `radial-gradient(circle, var(--aur-n), transparent 60%)`. **Do not use `filter: blur`.** It is too expensive on low-end Android.
- They drift with transform-only keyframes over 32–50s, using `alternate` and `--ease-silk`.
- Add a fixed SVG `feTurbulence` grain overlay at `--grain-op` opacity.

**`.glass` / card:**
- `background: var(--glass); backdrop-filter: blur(22px) saturate(170%)`, with the `-webkit-` prefix too.
- `border: 1px solid var(--edge)` and `border-radius: 22px`.
- `box-shadow: inset 0 1px 0 var(--gloss-top), inset 0 0 0 1px var(--edge-low), var(--shadow)`.
- `position: relative; isolation: isolate`.
- **Fallback:** use `--glass-solid` when `@supports` has no `backdrop-filter`, or when `html.low-motion` is set.

**Gloss sheen:** a `::before` at `z-index: -1` with `linear-gradient(165deg, var(--gloss-sheen) 0%, transparent 38%), linear-gradient(0deg, var(--glass-inset), transparent 30%)` and `border-radius: inherit`.

**Cursor spotlight:** a `::after` with `radial-gradient(420px circle at var(--mx) var(--my), var(--spot), transparent 45%)`.
- It fades to opacity 1 on hover, on pointer devices only.
- A single delegated `pointermove` listener on `document` sets `--mx` and `--my` on the nearest card.

**Where glass goes:** the nav (a floating pill, 20px radius), cards, the search bar, tabs, popovers, toasts, the mobile action bar and the footer.

**Text readability:** long reading text must sit on glass that is at least 0.56 opaque in light mode. Popovers use `--glass-solid` at about 93% (`color-mix`) so text behind them never bleeds through.

**Inner panels** (number boxes, facts rows, queue rows, inputs): `--glass-inset` with a `--edge-low` border and an inset `--gloss-top` line.

---

## STEP 3 — COMPONENT RESTYLE
**Primary button:**
- `background: var(--btn-grad)` and `color: var(--on-accent)`, with a 1px border at `rgba(255,255,255,.25)`.
- Shadows: `inset 0 1px 0 rgba(255,255,255,.45)`, `inset 0 -8px 16px -8px rgba(0,0,0,.25)`, and `0 10px 24px -10px var(--btn-glow)`.
- A `::before` glossy top half: `linear-gradient(180deg, rgba(255,255,255,.32), transparent)` covering the top 48%.
- A `::after` light streak, skewed -18°, that sweeps across on hover over 900ms.
- Hover lifts it `translateY(-2px)` with a stronger glow. Press scales it to `0.97`.
- Minimum height 48px, or 56px for the large size.

**Ghost button:** glass background, `--edge` border, and an accent-coloured border and text on hover.

**Soft button:** `--accent-soft` background with `--accent-ink` text.

**Segmented controls** (language, theme, numerals) and **tabs:** a sliding "thumb" element moves to the selected item with `transform` and `width`, over 520–560ms using `--ease-spring`.
- The segmented-control thumb is `--glass-strong` with a gloss line.
- The tab thumb is `--btn-grad`, and the selected tab label uses `--on-accent`.
- Tabs support arrow-key navigation.

**Inputs and selects:** a `--glass-inset` field with a 12px radius. On focus, use an `--accent` border, a `0 0 0 4px var(--accent-soft)` ring and a `--glass-strong` background.

**Badges:** semantic colours only, always with an icon, a pill shape and a hairline `--edge-low` border.

**Brand mark, step numbers and avatar tiles:** `--btn-grad` with a glossy top-half highlight, and `--on-accent` for any glyph on top.

**Gradient text:** use `--h-grad` with `background-clip: text` for the headline highlight and the big serial number. Apply it to the **text element itself**, not to a parent of an absolutely positioned child.

**Toast:** `--glass-strong` with a 22px blur. It enters with `translate(-50%,24px) scale(.96)` → `none` over 600ms using `--ease-spring`. Optimistic actions offer an undo inside the toast.

**Skeletons:** a shimmer from `--skel-a` to `--skel-b` (light: `rgba(11,21,48,.06)` → `rgba(255,255,255,.7)`; dark: `rgba(255,255,255,.05)` → `rgba(255,255,255,.12)`), over 1.6s using `--ease-silk`. Never use spinners for content.

**Mobile sticky action bar** (below 768px): `--glass-strong` with a blur and safe-area bottom padding, holding the primary patient actions.

---

## STEP 4 — PALETTE PICKER (new feature)
**Trigger button** in the nav:
- A 46×46px glass button containing a 24px glossy orb filled with `var(--grad)`. The orb rotates 90° on hover.
- `aria-haspopup="dialog"`, `aria-expanded`, and an `aria-controls` that points to the popover.

**Popover:**
- Rendered at body level with `position: fixed`, positioned under the trigger with JS and clamped to 12px from the viewport edges. Width is `min(348px, 100vw - 24px)`.
- It opens from `translateY(-8px) scale(.96)` / opacity 0 to rest over 520ms. Its `transform-origin` is set to the trigger's position.
- It closes on Escape (returning focus to the trigger), on an outside pointerdown, and keeps its position on scroll or resize.
- **Why body level:** a `backdrop-filter` parent breaks nested blur and clips overflow, so the popover must not live inside the nav.

**Contents:**
- A title, "রঙের প্যালেট / Colour palette", with the hint "পছন্দ মনে রাখা হবে / Your choice is saved".
- A 2-column `role="radiogroup"` of 6 swatches. Each swatch is a `role="radio"` button with `aria-checked`, a 34px glossy orb showing its 3 `--grad` stops, the localized name, and a check icon that springs in when selected.
- Palette names (bn / en):
  - নীলকান্ত লেগুন / Sapphire Lagoon
  - পান্না বাগান / Emerald Garden
  - প্রবাল সন্ধ্যা / Coral Sunset
  - রাজকীয় অর্কিড / Royal Orchid
  - সোনালি বিকেল / Golden Hour
  - ক্লিনিক্যাল টিল / Clinical Teal
- A roving tabindex with arrow-key selection.
- A "Light and dark" row containing a second Light/Dark/System segmented control, kept in sync with the nav one.
- A note: "জরুরি ও সতর্কতার রং সব প্যালেটে একই থাকে / Emergency and warning colours stay the same in every palette."

**Behaviour:**
- Selecting a swatch sets `data-palette` on `<html>` and saves it in `localStorage` (`sh-palette`). Sapphire removes the attribute.
- Below 560px, hide the nav's theme control and the brand wordmark. The popover holds the theme control instead.

**Implementation:**
- Angular: an `AppearanceService` with signals (`theme`, `palette`, `lang`) that writes the `<html>` attributes through `DOCUMENT`, plus a standalone `PalettePickerComponent` using the CDK Overlay or a fixed element.
- React/Next.js: a context or Zustand store, plus a `PalettePicker` client component.

---

## STEP 5 — MOTION AND TRANSITIONS
**Theme change — a circular "transmission" reveal:**
```js
function withViewTransition(update, originEl) {
  if (!document.startViewTransition || prefersReducedMotion()) return update();
  const r = originEl.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2;
  const rad = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y));
  const vt = document.startViewTransition(update);
  vt.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
    { duration: 800, easing: 'cubic-bezier(0.22,1,0.36,1)', pseudoElement: '::view-transition-new(root)' }));
}
```
CSS: `::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }`

**Palette change:** the same circular reveal, starting from the tapped swatch's orb.

**Language change:** a crossfade. Add a class such as `vt-fade` to `<html>` for the duration of the transition, with an old-view fade-up over 360ms and a new-view fade-in from `translateY(8px)` over 520ms.

**Entrance:**
- Only elements **below the fold at load** get the hidden start state (`opacity 0; translateY(28px) scale(.98)`).
- An IntersectionObserver reveals them **once**, over 800ms using `--ease-out`, with an 80ms stagger.
- Above-the-fold content is visible immediately. Never leave first-paint content at opacity 0.

**Lists** (doctor cards and so on): re-renders stagger in with `translateY(22px) scale(.98)` → rest, opacity over 700ms, transform over 800ms using `--ease-spring`. Clear the inline transitions afterwards.

**Hover:** cards lift `translateY(-6px)` with `--shadow-lift`, on pointer devices only (`@media (hover:hover)`).

**Hero card:**
- 3D tilt: `perspective: 1200px`, with `rotateX` up to ±9° and `rotateY` up to ±11° following the pointer, easing back over 900ms.
- A glare layer: `radial-gradient(500px circle at var(--gx) var(--gy), var(--gloss-sheen), transparent 50%)`.
- Two small floating glass chips beside it, with a 7–8.5s `translateY(-10px)` alternate loop.

**Live data:**
- Numbers roll: the old value moves out upward and the new value comes in from below, over 700ms using `--ease-spring`.
- Announce changes through `aria-live="polite"`.
- The "live" dot pulses gently with a 2.4s ping. Emergency indicators are **steady, never blinking**.

**Progress bar:** `--grad` fill whose `scaleX` changes over 1100ms, plus a soft white sweep every 4s.

**Headline highlight:** `--h-grad` flows slowly (16s linear `background-position`).

**Nav:** a floating glass pill that compresses on scroll (`scale(.965) translateY(-4px)` with `--shadow-lift`), using transform only.

**Performance:**
- Animate only `transform`, `opacity` and `clip-path`.
- Respect `prefers-reduced-motion: reduce`: turn off the aurora drift, chips, shimmer flow, tilt, entrance animations and view transitions. State changes become instant.
- Add `html.low-motion` when `navigator.hardwareConcurrency <= 4` or `navigator.connection.saveData` is true. This stops the decorative loops and switches glass to its solid fallback.

---

## STEP 6 — NON-NEGOTIABLES (keep from the original brief)
- **Language:** Bangla is the default, with an always-visible language switch. Use plain-language copy and an optional Bangla-numeral preference (০১২৩).
- **Accessibility:**
  - Touch targets of 48×48px or larger.
  - Visible focus rings: 2px `--accent` with a 2px offset.
  - Semantic HTML, full keyboard support, a skip link, and zoom to 200% without breaking.
  - Never convey status by colour alone.
- **Trust signals:** BMDC verification badges, transparent fees, privacy controls, and an emergency 999 message.
- **Safety:** dose outputs always show units. Destructive actions need confirmation and offer undo.
- **Offline:** a banner when offline, cached data with a "last updated" time, and form drafts that are never lost.
- **Performance budget:** Lighthouse mobile 95+, LCP under 2.0s, CLS under 0.05, INP under 200ms. No new heavy dependencies — everything here is CSS plus about 3KB of JS.

---

## STEP 7 — DELIVERABLES AND ACCEPTANCE CHECKLIST
**Deliver:**
1. The tokens file.
2. The glass, motion and utility styles.
3. The restyled shared components.
4. `AppearanceService` / store and `PalettePicker`.
5. The `<head>` no-flash script.
6. `design.md`, documenting the tokens, the palette rules, when to use `--grad`, `--h-grad` or `--btn-grad`, and the motion rules.

Then walk every page in **all 6 palettes × light/dark**.

**Before you say you're done, verify:**
- [ ] No hard-coded colours remain in components (grep for `#` hex values and `rgb(` outside the tokens file).
- [ ] Every palette in both modes passes the contrast ratios listed in 1c.
- [ ] Switching theme or palette never flashes on reload. The choice persists. System mode follows the OS live.
- [ ] Text never sits on `--grad`. Button text uses `--on-accent` on `--btn-grad`.
- [ ] The glass falls back to solid with no `backdrop-filter`, or under `low-motion`. Text stays readable over every part of the aurora.
- [ ] The palette popover works fully by keyboard (open, arrows, Escape returns focus) and is announced correctly by a screen reader.
- [ ] Reduced motion turns off every decorative animation.
- [ ] There is no horizontal scroll at 360px, and safe-area insets are respected.
- [ ] No business logic, API, route or i18n key changed. Existing tests still pass.
