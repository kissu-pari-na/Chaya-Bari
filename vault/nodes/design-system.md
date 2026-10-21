---
id: design-system
title: Design system (Glossy Glass)
prefix: DSN
kind: cross-cutting
status: live
scope: global
reviewed: 2026-10-21
code:
  - design.md
  - client/index.html
  - client/scripts/palettes.mjs
  - client/scripts/check-colors.mjs
  - client/src/styles/**
  - client/src/index.css
  - client/src/fonts.css
  - client/src/lib/appearance.ts
  - client/src/lib/motion.ts
  - client/src/lib/palettes.gen.ts
  - client/src/context/ThemeContext.tsx
  - client/src/components/Backdrop.tsx
  - client/src/components/Segmented.tsx
  - client/src/components/ThemeSwitch.tsx
  - client/src/components/PalettePicker.tsx
  - client/src/components/PalettePicker.css
  - client/src/components/PrefControls.tsx
  - client/src/components/PrefControls.css
  - client/src/components/Logo.tsx
  - client/public/fonts/**
relations:
  - constrains storefront — every customer surface uses glass tokens and components
  - constrains kitchen — kitchen board statuses use semantic colours with icons
  - constrains orders — order and payment status pills are semantic, never palette-tinted
  - depends-on i18n — Bangla typography rules and bilingual palette names
---
The visual language: glossy glass surfaces over a drifting aurora, seven
contrast-verified palettes (Ember & Gold by default) in light, dark and system
modes, and calm, transform-only motion. `/design.md` is the full
specification. This node holds its rules and the decisions behind them.

## Rules
- **R-DSN-001** [must] No component hard-codes a colour. Colours come from `styles/tokens.css` or the generated `styles/palettes.css`, and `npm run check:design` must pass.
- **R-DSN-002** [must] Palettes are changed only in `client/scripts/palettes.mjs`, then regenerated with `npm run palettes`. Never edit `palettes.css` or `palettes.gen.ts` by hand.
- **R-DSN-003** [must] Every palette in both modes passes the contrast minimums: body text ≥14:1, accent-ink ≥5.6 (light) / ≥7.8 (dark), h-grad stops ≥4.6, on-accent on btn-grad ≥4.8, focus accent ≥3.5.
- **R-DSN-004** [must] Text never sits on `--grad`. Gradient text uses `--h-grad` on the text element itself. Text on `--btn-grad` uses `--on-accent`.
- **R-DSN-005** [must] Status colours (success, warning, danger, info) mean status only, never change with the palette, and always come with an icon and a text label.
- **R-DSN-006** [must] Bangla text is never letter-spaced. Bangla body text is 17px / 1.78.
- **R-DSN-007** [must] Theme, palette and language are applied before first paint by the inline script in `client/index.html`, using the `chaya-theme`, `chaya-palette` (a palette id or `random`), `chaya-palette-random` (the current random pick and its expiry) and `chaya-lang` keys. Changing a key means changing both places. The script's palette-id list is injected by `npm run palettes`.
- **R-DSN-008** [must] Animate only transform, opacity and clip-path. Honour `prefers-reduced-motion` and `html.low-motion`. Never leave first-paint content at opacity 0.
- **R-DSN-009** [must] Glass falls back to `--glass-solid` without backdrop-filter or under low-motion. Popovers and menus use `--popover-bg` so text behind them never bleeds through.
- **R-DSN-010** [must] Touch targets are ≥48px, focus rings are visible (2px accent, 2px offset), and there is no horizontal scroll at 360px.
- **R-DSN-011** [must] Printed documents (invoice, receipt) are always a clean white sheet, using the `--print-*` tokens.
- **R-DSN-012** [should] No new UI dependencies. The design system is plain CSS plus a few KB of TypeScript.
- **R-DSN-013** [should] Fonts are self-hosted (Hind Siliguri for body, Anek Bangla for display). No external font CDN.
- **R-DSN-014** [must] Random mode never swaps the palette while the tab is hidden, while the user is typing in a field, or while the palette picker is open. Automatic swaps use the soft crossfade (not the circular reveal), are instant under reduced motion, keep the same pick across reloads until its period ends, and stay in sync across open tabs.
- **R-DSN-015** [must] Appearance changes (theme, palette, language) take effect even when a View Transition does not run. `withViewTransition` applies the update directly if the browser hasn't run it within 400ms. State must never depend on an animation completing.
- **R-DSN-016** [must] Default palette preference for new visitors is **Random**. When the user picks a fixed palette instead, the default fixed palette is **Ember & Gold** (no `data-palette` attribute).

## Decisions
- **D-DSN-001** [superseded 2026-09-14 by:D-DSN-002] Retheme to "Ember": red, gold and black dark luxury, with dark as the default (commit "Retheme app to Ember red+gold+black").
  Why: a premium food identity instead of the original greens.
- **D-DSN-002** [confirmed 2026-10-21] Adopt the "Glossy Glass" system from `glass-redesign-master-prompt.md` across the whole client: tokens, glass surfaces, palettes with light/dark/system, palette picker, motion. Look and feel only; no business logic, routes, API or i18n keys change.
  Why: the owner asked for it to be folded into design.md and applied to the overall project.
- **D-DSN-003** [confirmed 2026-10-21] Make the brand palette **Ember & Gold** the default fixed palette (no `data-palette`) rather than the brief's Sapphire, and add it as a seventh palette generated to the same contrast rules. Confirmed by the owner. D-DSN-009 then made Random the default preference, with Ember the default whenever Random is not chosen.
  Why: the logo, favicon and brand are red and gold, and a blue default would break brand recognition.
- **D-DSN-004** [confirmed 2026-10-21] The default theme for new visitors is **System**. Returning visitors keep their stored light or dark choice, since the old provider always stored one.
  Why: the brief specifies System. The old dark-by-default came from the Ember theme, which D-DSN-002 replaces.
- **D-DSN-005** [confirmed 2026-10-21] Keep the self-hosted Hind Siliguri and Anek Bangla fonts instead of loading Plus Jakarta Sans and Inter from Google Fonts as the brief says.
  Why: fonts were self-hosted on 2026-09-13 so that Bengali digits such as ১ always render correctly, and this keeps that guarantee with no external dependency.
- **D-DSN-006** [confirmed 2026-10-21] Drop the brief's health-specific items (BMDC badges, dose units, the 999 emergency message) and rename "Clinical Teal" to "Fresh Mint". Food-brand trust signals take their place.
  Why: the brief was written for a health platform.
- **D-DSN-007** [confirmed 2026-10-21] Keep the existing `chaya-*` storage keys instead of the brief's `sh-*` keys.
  Why: returning visitors keep their language and theme choice.
- **D-DSN-008** [confirmed 2026-10-21] Map order and kitchen statuses onto the four semantic colours: pending → warning; confirmed through out-for-delivery → info; delivered → success; cancelled → danger. Each also gets an icon, which replaced the old per-status pastel colours.
  Why: R-DSN-005, since the old pastels were neither semantic nor contrast-checked in dark mode.
- **D-DSN-009** [confirmed 2026-10-21] Add a **Random** palette option. Random is the default for new visitors and rotates through all seven palettes at random intervals. The user can switch to any fixed palette, and when Random is not chosen, Ember & Gold is the default. Requested by the owner. This refines D-DSN-003, updates R-DSN-007 (new `chaya-palette-random` key) and adds R-DSN-014 and R-DSN-016.
  Why: the owner wants the site to feel fresh and showcase every palette, while keeping the brand palette as the fixed default.
- **D-DSN-010** [confirmed 2026-10-21] Numerals keep following the language, with no separate Bangla-numeral toggle. Confirmed by the owner.
  Why: fewer settings. Bangla readers already see Bengali digits.
- **D-DSN-011** [superseded 2026-10-21] Random interval is a uniform random 5–20 minutes (the owner allowed 3–30 and asked for best practice). Swaps pause while the user is busy (checked again every 30s), crossfade gently, never repeat the current palette, persist across reloads and sync across tabs.
  Why: under about 5 minutes the change becomes a distraction mid-order (a typical browse-to-checkout takes 3–8 minutes). Over about 20, most sessions would never see a change, which defeats the feature. Pausing while typing or picking avoids a swap under the user's hands.
- **D-DSN-013** [confirmed 2026-10-21] Random interval is a uniform random 30 seconds to 5 minutes, chosen by the owner. This supersedes D-DSN-011 (5–20 minutes). Everything else about Random is unchanged: pausing while busy, crossfade, no repeats, persistence and tab sync.
  Why: the owner wants the palette rotation to be noticeable within a single visit.
- **D-DSN-012** [confirmed 2026-10-21] Added the 400ms View Transition guard (R-DSN-015) after a test showed that a throttled page could save a palette choice without ever applying it.
  Why: the UI and the stored preference disagreed until the next reload.

## Open questions
- **Q-DSN-001** [answered 2026-10-21 → D-DSN-003] Should the default palette be Ember & Gold (the brand, currently implemented) or Sapphire Lagoon (the brief's default)? See D-DSN-003.
  Options: (a) Ember default (recommended) · (b) Sapphire default · (c) Ember default but remove the other palettes
- **Q-DSN-002** [answered 2026-10-21 → D-DSN-010] The brief mentions an optional Bangla-numeral preference (০১২৩ vs 0123). Numerals currently follow the language. Add a separate toggle?
  Options: (a) keep following the language (recommended) · (b) add a numerals switch to the palette popover

## Ideas
- **I-DSN-001** [new · impact:med · effort:S] Use skeleton cards (`.skeleton`) instead of the "লোড হচ্ছে…" text on the product list and home page, which makes loading feel faster.
- **I-DSN-002** [new · impact:med · effort:M] Add a shared toast system (`.toast` is styled) for "added to cart" with Undo, payment-claim submission and saves. Today success feedback is inline text only.
- **I-DSN-003** [new · impact:low · effort:S] Add the sticky mobile `.action-bar` to checkout (Place order · ৳total) and product detail (Add to cart).
- **I-DSN-004** [new · impact:med · effort:S] Make Random time-aware: favour warm palettes (Ember, Golden Hour, Coral) in the evening ordering window before the 22:00 cutoff, and calmer ones (Sapphire, Fresh Mint) in the morning. This ties the look to the food rhythm of the day.
- **I-DSN-005** [new · impact:low · effort:S] Let the owner curate the Random pool from Business Profile (for example exclude palettes that clash with a seasonal campaign) and pin a palette for festivals such as Eid or Pohela Boishakh.
