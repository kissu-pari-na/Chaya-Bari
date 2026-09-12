# ছায়া বাড়ি — Design System

The visual language for Chaya Bari's storefront and admin. The goal: a warm,
appetising, homemade feel — the digital equivalent of walking into a family
kitchen — that makes a first-time visitor *want* to order. Cozy, trustworthy,
and unmistakably Bengali.

This document is the single source of truth for look-and-feel. Component styles
implement these tokens; don't hard-code colours, spacing, or fonts anywhere
else.

---

## 1. Brand personality

| Trait | How it shows up |
|-------|-----------------|
| **Homemade & warm** | Cream backgrounds, soft shadows, rounded corners, food photography that fills the frame. |
| **Fresh & natural** | Herb-green primary, generous whitespace, no harsh pure-black or clinical grey. |
| **Appetising** | A warm saffron/terracotta accent reserved for the moments that matter (add-to-cart, order now). |
| **Trustworthy** | Consistent spacing, clear hierarchy, legible Bengali type, honest pricing. |
| **Local** | Bengali-first copy, a friendly rounded display face, the tagline *ঘরের স্বাদ, আপনার দুয়ারে*. |

---

## 2. Colour

Warm, food-forward. Green is the **brand**; terracotta is the **action**;
saffron is the **highlight**; cream is the **canvas**.

### Tokens (CSS custom properties on `:root`)

```
/* Brand — herb green */
--green-900: #1e3320;   /* darkest, text-on-cream headings option */
--green-800: #24401f;   /* button hover */
--green-700: #2f5233;   /* PRIMARY brand green */
--green-600: #3d6b42;
--green-100: #e7efe4;   /* tint / chips / rails */
--green-050: #f1f6ef;

/* Action — terracotta (appetising CTA) */
--terra-700: #a8431c;
--terra-600: #c65a2e;   /* PRIMARY call-to-action */
--terra-500: #d97642;
--terra-100: #f8e6db;

/* Highlight — saffron / gold */
--saffron-600: #d4952a;
--saffron-500: #e0a12e;  /* badges, stars, small accents */
--saffron-100: #f8eccf;

/* Canvas — warm cream */
--cream-000: #fffdf7;   /* cards / surfaces */
--cream-050: #fdf9ef;   /* page background */
--cream-100: #f7edd6;   /* deeper cream sections */
--cream-200: #eee1c3;   /* hairline borders on cream */

/* Ink — warm neutrals (never pure black/grey) */
--ink-900: #2a2118;     /* body text */
--ink-700: #4a4034;     /* secondary text */
--ink-500: #857a68;     /* muted / captions */
--line: #e8ddc4;        /* default border */

/* Feedback */
--success: #2f7d4f;
--danger:  #b3261e;
--danger-bg: #fdecea;
```

### Usage rules

- **Page background** is `--cream-050`; **surfaces/cards** are `--cream-000`.
- **Headings** use `--green-900`/`--green-700`. **Body** is `--ink-900`, **muted**
  is `--ink-500`.
- **Primary action** (Add to cart, Order now, Place order, Login) = terracotta
  `--terra-600`, hover `--terra-700`, white text.
- **Secondary brand action** (View products, brand links) = green `--green-700`.
- **Ghost / tertiary** = transparent with `--line` border, ink text.
- **Saffron** is a spice — small doses only: cart badge, sale/"popular" badges,
  ratings, active underline. Never a large fill.
- Aim for AA contrast: terracotta-600 and green-700 both pass on white/cream for
  buttons and ≥18px text.

---

## 3. Typography

Two Google fonts, both with full Bengali support:

- **Display / headings:** `'Baloo Da 2'` — friendly, rounded, warm. Weights 600/700/800.
- **Body / UI:** `'Hind Siliguri'` — clean, highly legible Bengali + Latin. Weights 400/500/600/700.

```
--font-display: 'Baloo Da 2', 'Noto Sans Bengali', system-ui, sans-serif;
--font-body: 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif;
```

### Scale (fluid where it helps)

| Role | Size | Weight | Font | Notes |
|------|------|--------|------|-------|
| Hero title | `clamp(2rem, 5vw, 3.25rem)` | 800 | display | line-height 1.1 |
| H1 (page) | `clamp(1.6rem, 3vw, 2.1rem)` | 700 | display | |
| H2 (section) | `1.4rem` | 700 | display | |
| H3 (card) | `1.05rem` | 600 | display | |
| Body | `1rem` (16px) | 400 | body | line-height 1.6 |
| Small / caption | `0.85rem` | 500 | body | muted colour |
| Button | `0.95rem` | 600 | body | |
| Eyebrow / label | `0.75rem` | 600 | body | uppercase, letter-spacing 0.08em |

Headings get `letter-spacing: -0.01em`. Body text max line length ~70ch.

---

## 4. Space, radius, elevation

**Spacing scale** (rem): `0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4`. Use multiples;
default gap between stacked blocks is `1.5rem`, inside cards `1rem`.

**Radius:**
```
--radius-sm: 8px;    /* inputs, chips, small buttons */
--radius-md: 14px;   /* cards, buttons */
--radius-lg: 22px;   /* hero, feature panels, product cards */
--radius-pill: 999px;
```

**Elevation** (soft, warm-tinted — never harsh black shadows):
```
--shadow-sm: 0 1px 2px rgba(58, 42, 24, 0.06);
--shadow-md: 0 6px 18px rgba(58, 42, 24, 0.08);
--shadow-lg: 0 16px 40px rgba(47, 82, 51, 0.14);
--shadow-cta: 0 8px 20px rgba(198, 90, 46, 0.30);  /* terracotta glow under primary CTA */
```

Cards rest on `--shadow-sm`, lift to `--shadow-md` on hover with a `-2px`
translate. Product cards lift to `--shadow-lg`.

---

## 5. Core components

### Buttons
- `.btn` base: `--radius-md`, padding `0.7rem 1.4rem`, weight 600, font-body,
  `transition: transform .12s, box-shadow .12s, background .12s`, active
  `translateY(1px)`.
- `.btn--primary`: terracotta fill, white text, `--shadow-cta`; hover darkens +
  lifts `-1px`.
- `.btn--brand`: green fill, white text.
- `.btn--ghost`: transparent, `--line` border, ink text; hover cream-100 fill.
- `.btn--lg`: padding `0.9rem 1.8rem`, size `1.05rem` — hero/checkout.
- Disabled: opacity 0.55, no shadow, `cursor: not-allowed`.

### Cards
- `.card`: cream-000 surface, `--line` border, `--radius-lg`, padding
  `1.5rem 1.75rem`, `--shadow-sm`.
- `.card--pad-lg` for feature blocks.

### Product card
- `--radius-lg`, image fills a `4/3` frame that gently `scale(1.05)` zooms on
  hover; body padding `0.9rem 1rem`; price in green 700, sale price in terracotta
  with a struck original in muted; add button is `.btn--primary` compact.
- Sold-out: image dimmed + saffron/ink badge, no add button.

### Chips (category filter)
- Pill, `--line` border on cream-000; active = green-700 fill / white; hover =
  green-050 fill. Comfortable tap target (min-height 36px).

### Inputs
- `--radius-sm`, `--line` border, padding `0.6rem 0.7rem`, cream-000 bg;
  focus: green-600 border + 3px `--green-100` ring, no default outline.

### Badges
- `.badge` pill, `0.72rem`, 600. Variants: `--sale` (terracotta), `--new`
  (saffron), `--muted` (cream-100/ink).

### Section header
- Optional **eyebrow** (saffron, uppercase label) + H2 + optional muted
  subtitle, with a "view all" ghost link on the right.

---

## 6. The storefront landing (customer home)

This is where we win the visitor. Structure, top to bottom:

1. **Hero** — a warm green-gradient panel (`--radius-lg`) with a subtle
   pattern/overlay. Eyebrow tagline, big display title (business name + welcome),
   one-line value prop, two CTAs (primary terracotta *পণ্য দেখুন / অর্ডার করুন*,
   ghost *লগইন*), and a decorative food emoji/plate motif or image on the right.
   On mobile it stacks and centres.
2. **Trust strip** — 3–4 little feature tiles with icons: *ঘরে তৈরি*, *তাজা
   উপকরণ*, *সময়মতো ডেলিভারি*, *সহজ অর্ডার*. Cream-100 background.
3. **Featured / categories teaser** — a section header + a few product or
   category cards pulled from the catalogue (or a CTA to browse if none loaded).
4. **Closing CTA band** — terracotta or green band inviting the visitor to
   register / order, with the tagline.

Keep copy Bengali-first, short, and warm.

---

## 7. Header

- Sticky, cream-000 with a hairline bottom border and `--shadow-sm` once
  scrolled. Logo left (name in display font, green). Nav centre/right with the
  active link marked by a saffron underline. Cart + notification bell + user on
  the far right. Primary "login" shows as a compact `.btn--brand` when logged
  out. Fully wraps on mobile.

---

## 8. Motion & interaction

- Transitions 120–200ms, `ease`/`ease-out`. Hover lifts, focus rings, image
  zooms. Respect `prefers-reduced-motion: reduce` (disable transforms/zoom).
- One tasteful entrance: hero content fades/rises in on load.
- Never animate more than transform/opacity/shadow/colour.

---

## 9. Admin & kitchen

Same tokens, calmer application: green headings, cream-000 cards, terracotta only
for the truly primary action per screen, saffron for status accents. Tables get
zebra rows (`--cream-050`), sticky headers, and comfortable padding. These are
work surfaces — legibility and density over decoration, but visually of a piece
with the storefront.

---

## 10. Accessibility & responsive

- Colour never the only signal (icons/text back it up).
- Focus-visible ring on every interactive element.
- Tap targets ≥ 40px on touch.
- Breakpoints: ≤640 (phone, single column), ≤960 (tablet), >960 (desktop).
- Body min side gutter 1rem; content max-width 1040px, hero/bands full-bleed
  within it.
- Bengali numerals via existing `formatBdt`; don't restyle currency ad hoc.
