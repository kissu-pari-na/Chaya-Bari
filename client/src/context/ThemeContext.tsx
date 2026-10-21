import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import {
  applyPalette,
  applyThemeMode,
  currentRandomState,
  nextRandomState,
  RANDOM_KEY,
  readPalettePref,
  readThemeMode,
  resolvePalette,
  storePalettePref,
  systemPrefersDark,
  userIsBusy,
  withViewTransition,
  type PalettePref,
  type ThemeMode,
} from '../lib/appearance'
import type { PaletteId } from '../lib/palettes.gen'

/** The resolved theme actually on screen. */
export type Theme = 'dark' | 'light'

interface ThemeValue {
  /** Resolved theme (system mode resolved against the OS). */
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
  /** The user's preference, including 'system'. */
  mode: ThemeMode
  /** Change the preference; `origin` is where the circular reveal starts. */
  setMode: (mode: ThemeMode, origin?: Element | null) => void
  /** The palette on screen right now (in random mode, the current pick). */
  palette: PaletteId
  /** The user's palette preference: a palette id, or 'random'. */
  palettePref: PalettePref
  setPalette: (pref: PalettePref, origin?: Element | null) => void
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined)

// When a random swap is due but the user is busy, look again after this long.
const BUSY_RETRY_MS = 30_000

/**
 * App-wide appearance provider: light/dark/system theme plus colour palette.
 * Both are written as `data-theme` / `data-palette` on <html>, which the
 * design tokens (styles/tokens.css + palettes.css) key off. index.html sets
 * them before first paint from the same storage keys, so reloads never flash.
 *
 * Palette preference 'random' (the default) rotates to a different palette
 * every 5–20 minutes, never while the tab is hidden or the user is typing or
 * has the picker open.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode)
  const [palettePref, setPalettePref] = useState<PalettePref>(readPalettePref)
  const [palette, setPaletteState] = useState<PaletteId>(() => resolvePalette(readPalettePref()))
  const [osDark, setOsDark] = useState<boolean>(systemPrefersDark)

  // System mode follows the OS live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setOsDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Keep <html> in sync (also covers the first render after the no-flash script).
  useEffect(() => applyThemeMode(mode), [mode])
  useEffect(() => applyPalette(palette), [palette])

  // Random mode: swap to a new palette when the current period ends.
  useEffect(() => {
    if (palettePref !== 'random') return
    let timer = 0
    const swap = () => {
      if (document.hidden || userIsBusy()) {
        timer = window.setTimeout(swap, BUSY_RETRY_MS)
        return
      }
      const next = nextRandomState(currentRandomState().id)
      withViewTransition(
        () => {
          applyPalette(next.id)
          flushSync(() => setPaletteState(next.id))
        },
        null,
        'fade',
      )
      schedule()
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(swap, Math.max(0, currentRandomState().until - Date.now()))
    }
    schedule()
    // Background tabs throttle timers; re-check as soon as the tab is visible.
    const onVisible = () => !document.hidden && schedule()
    // Another tab started a new period: show the same pick here.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== RANDOM_KEY) return
      const id = currentRandomState().id
      applyPalette(id)
      setPaletteState(id)
      schedule()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', onStorage)
    }
  }, [palettePref])

  const theme: Theme = mode === 'system' ? (osDark ? 'dark' : 'light') : mode

  const setMode = (next: ThemeMode, origin?: Element | null) => {
    if (next === mode) return
    withViewTransition(() => {
      applyThemeMode(next)
      flushSync(() => setModeState(next))
    }, origin)
  }

  const setPalette = (pref: PalettePref, origin?: Element | null) => {
    if (pref === palettePref) return
    storePalettePref(pref)
    // Choosing Random starts a fresh period with a palette other than the current one.
    const id = pref === 'random' ? nextRandomState(palette).id : pref
    withViewTransition(() => {
      applyPalette(id)
      flushSync(() => {
        setPalettePref(pref)
        setPaletteState(id)
      })
    }, origin)
  }

  const value: ThemeValue = {
    theme,
    setTheme: (t) => setMode(t),
    toggle: () => setMode(theme === 'dark' ? 'light' : 'dark'),
    mode,
    setMode,
    palette,
    palettePref,
    setPalette,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
