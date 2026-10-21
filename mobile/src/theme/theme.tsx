import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState, useColorScheme } from 'react-native'
import { KEYS, readJson, writeJson } from '../lib/storage'
import { DEFAULT_PALETTE, NEUTRAL_TOKENS, PALETTE_TOKENS, type PaletteId } from './palettes.gen'

// Glossy Glass for React Native. Colours come only from palettes.gen.ts, which
// `cd client && npm run palettes` generates from the same data as the website
// (design.md, R-DSN-001/002). Same storage keys as the website (R-DSN-007).

export type ThemeMode = 'system' | 'light' | 'dark'
export type PalettePref = PaletteId | 'random'

type Neutral = { [K in keyof typeof NEUTRAL_TOKENS.light]: string }
type PaletteTokens = (typeof PALETTE_TOKENS)[number]['light']

/** Every colour a screen may use: neutrals + status + the active palette. */
export type Colors = Neutral & {
  canvas: string
  canvas2: string
  accent: string
  accentInk: string
  accentSoft: string
  onAccent: string
  btnGlow: string
  btn: readonly string[]
  grad: readonly string[]
  hgrad: readonly string[]
  aur: readonly string[]
  glassSolid: string
}

/** Shape tokens from tokens.css (§5). */
export const radius = { card: 22, pop: 22, btn: 14, input: 12, nav: 20, pill: 999 } as const

// Random mode (R-DSN-016): new users start on Random. The pick is kept for a
// random 30 s – 5 min, like the website, but the app only swaps when it starts
// or returns to the foreground, never while someone is looking at a screen.
const MIN_HOLD = 30_000
const MAX_HOLD = 5 * 60_000
interface RandomPick {
  id: PaletteId
  until: number
}

function pickRandom(previous?: PaletteId): RandomPick {
  const pool = PALETTE_TOKENS.map((p) => p.id).filter((id) => id !== previous)
  const id = pool[Math.floor(Math.random() * pool.length)]
  return { id, until: Date.now() + MIN_HOLD + Math.random() * (MAX_HOLD - MIN_HOLD) }
}

interface ThemeValue {
  mode: ThemeMode
  scheme: 'light' | 'dark'
  palettePref: PalettePref
  palette: PaletteId
  colors: Colors
  setMode: (m: ThemeMode) => void
  setPalette: (p: PalettePref) => void
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [palettePref, setPrefState] = useState<PalettePref>('random')
  const [randomPick, setRandomPick] = useState<RandomPick>(() => pickRandom())

  useEffect(() => {
    void (async () => {
      const m = await readJson<ThemeMode>(KEYS.theme)
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m)
      const p = await readJson<PalettePref>(KEYS.palette)
      if (p && (p === 'random' || PALETTE_TOKENS.some((t) => t.id === p))) setPrefState(p)
      const r = await readJson<RandomPick>(KEYS.paletteRandom)
      if (r && r.until > Date.now() && PALETTE_TOKENS.some((t) => t.id === r.id)) setRandomPick(r)
    })()
  }, [])

  // Re-pick an expired random palette when the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      setRandomPick((cur) => (cur.until > Date.now() ? cur : pickRandom(cur.id)))
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    void writeJson(KEYS.paletteRandom, randomPick)
  }, [randomPick])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    void writeJson(KEYS.theme, m)
  }, [])
  const setPalette = useCallback((p: PalettePref) => {
    setPrefState(p)
    void writeJson(KEYS.palette, p)
  }, [])

  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode
  const palette: PaletteId = palettePref === 'random' ? randomPick.id : palettePref

  const colors = useMemo<Colors>(() => {
    const p = (PALETTE_TOKENS.find((t) => t.id === palette) ?? PALETTE_TOKENS.find((t) => t.id === DEFAULT_PALETTE)!)[
      scheme
    ] as PaletteTokens & { glassSolid?: string }
    const neutral = NEUTRAL_TOKENS[scheme === 'dark' ? 'dark' : 'light'] as Partial<Neutral>
    return {
      ...(NEUTRAL_TOKENS.light as Neutral),
      ...neutral,
      text: p.text,
      muted: p.muted,
      canvas: p.canvas,
      canvas2: p.canvas2,
      accent: p.accent,
      accentInk: p.accentInk,
      accentSoft: p.accentSoft,
      onAccent: p.onAccent,
      btnGlow: p.btnGlow,
      btn: p.btn,
      grad: p.grad,
      hgrad: p.hgrad,
      aur: p.aur,
      glassSolid: p.glassSolid ?? NEUTRAL_TOKENS.light.glassSolid,
    }
  }, [palette, scheme])

  const value = useMemo(
    () => ({ mode, scheme, palettePref, palette, colors, setMode, setPalette }),
    [mode, scheme, palettePref, palette, colors, setMode, setPalette],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/** CSS gradient string for RN's `experimental_backgroundImage` / `backgroundImage`. */
export function linear(angle: number, stops: readonly string[]): string {
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`
}
