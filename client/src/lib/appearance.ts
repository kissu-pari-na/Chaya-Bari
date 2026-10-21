import { DEFAULT_PALETTE, PALETTES, type PaletteId } from './palettes.gen'

/// Light/dark preference. 'system' follows prefers-color-scheme live.
export type ThemeMode = 'light' | 'dark' | 'system'

/// Palette preference: a fixed palette, or 'random' (rotates through all of them).
export type PalettePref = PaletteId | 'random'

/// The preference new visitors start with (design.md §3.1).
export const DEFAULT_PALETTE_PREF: PalettePref = 'random'

// Same keys the no-flash script in index.html reads before first paint.
export const THEME_KEY = 'chaya-theme'
export const PALETTE_KEY = 'chaya-palette'
/// Random mode's current pick and when it expires: {"id":"coral","until":1739999999999}.
export const RANDOM_KEY = 'chaya-palette-random'

/// Random mode switches palettes after a random 5–20 minutes (design.md §7).
export const RANDOM_MIN_MS = 5 * 60_000
export const RANDOM_MAX_MS = 20 * 60_000

const isPalette = (s: unknown): s is PaletteId => typeof s === 'string' && PALETTES.some((p) => p.id === s)

function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

export function readThemeMode(): ThemeMode {
  const s = load(THEME_KEY)
  return s === 'light' || s === 'dark' || s === 'system' ? s : 'system'
}

export function readPalettePref(): PalettePref {
  const s = load(PALETTE_KEY)
  return s === 'random' || isPalette(s) ? s : DEFAULT_PALETTE_PREF
}

export function storePalettePref(pref: PalettePref) {
  store(PALETTE_KEY, pref)
}

/// Writes the theme onto <html>. System mode removes the attribute so the
/// prefers-color-scheme blocks in tokens.css apply.
export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  store(THEME_KEY, mode)
}

/// Writes the palette onto <html> (does not touch the stored preference).
/// The default palette (Ember) removes the attribute.
export function applyPalette(id: PaletteId) {
  const root = document.documentElement
  if (id === DEFAULT_PALETTE) root.removeAttribute('data-palette')
  else root.setAttribute('data-palette', id)
}

// ---------------------------------------------------------------- random mode

export interface RandomState {
  id: PaletteId
  until: number
}

export const randomDelay = () => RANDOM_MIN_MS + Math.random() * (RANDOM_MAX_MS - RANDOM_MIN_MS)

/// A random palette, never the one currently showing.
export function pickRandomPalette(current?: PaletteId): PaletteId {
  const pool = PALETTES.filter((p) => p.id !== current)
  return pool[Math.floor(Math.random() * pool.length)].id
}

export function readRandomState(): RandomState | null {
  try {
    const v = JSON.parse(load(RANDOM_KEY) ?? 'null') as Partial<RandomState> | null
    return v && isPalette(v.id) && typeof v.until === 'number' ? { id: v.id, until: v.until } : null
  } catch {
    return null
  }
}

/// Starts a new random period with a fresh palette.
export function nextRandomState(current?: PaletteId): RandomState {
  const state = { id: pickRandomPalette(current), until: Date.now() + randomDelay() }
  store(RANDOM_KEY, JSON.stringify(state))
  return state
}

/// The random pick to show now: the stored one while its period lasts (so a
/// reload never jumps), otherwise a new one.
export function currentRandomState(): RandomState {
  const s = readRandomState()
  return s && s.until > Date.now() ? s : nextRandomState(s?.id)
}

/// The palette to show for a preference right now.
export const resolvePalette = (pref: PalettePref): PaletteId => (pref === 'random' ? currentRandomState().id : pref)

// ---------------------------------------------------------------- environment

export const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/// Whether the user is in the middle of something an automatic palette swap
/// would disrupt: typing in a field, or the palette picker is open.
export function userIsBusy(): boolean {
  const a = document.activeElement
  const typing = !!a && (a.matches('input, textarea, select') || (a as HTMLElement).isContentEditable)
  return typing || !!document.querySelector('.palette-pop')
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void>; skipTransition: () => void }
type VTDocument = Document & { startViewTransition?: (cb: () => void) => ViewTransition }

// If the browser hasn't run a transition's update within this long (e.g. a
// background or throttled page), skip the animation and apply it directly.
const VT_GUARD_MS = 400

/// Runs a synchronous DOM update inside a View Transition.
///  - 'circle': a circular reveal growing from `originEl` (theme and palette changes)
///  - 'fade':   a soft crossfade (language changes, automatic random palette swaps)
/// Falls back to a plain update without View Transitions, under reduced motion,
/// or on low-motion devices.
export function withViewTransition(update: () => void, originEl?: Element | null, kind: 'circle' | 'fade' = 'circle') {
  const doc = document as VTDocument
  const root = document.documentElement
  if (!doc.startViewTransition || document.hidden || prefersReducedMotion() || root.classList.contains('low-motion')) {
    update()
    return
  }
  // The state change must happen exactly once, animation or not.
  let done = false
  const run = () => {
    if (done) return
    done = true
    update()
  }
  const start = () => {
    const vt = doc.startViewTransition!(run)
    vt.ready.catch(() => {
      /* skipped: nothing to animate */
    })
    window.setTimeout(() => {
      if (!done) {
        vt.skipTransition()
        run()
      }
    }, VT_GUARD_MS)
    return vt
  }
  if (kind === 'fade') {
    root.classList.add('vt-fade')
    start().finished.finally(() => root.classList.remove('vt-fade'))
    return
  }
  const r = originEl?.getBoundingClientRect()
  const x = r ? r.left + r.width / 2 : innerWidth / 2
  const y = r ? r.top + r.height / 2 : 0
  const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const vt = start()
  vt.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 800, easing: 'cubic-bezier(0.22,1,0.36,1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {
      /* transition skipped */
    })
}
