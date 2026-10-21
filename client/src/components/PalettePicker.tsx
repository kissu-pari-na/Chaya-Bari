import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import type { PalettePref } from '../lib/appearance'
import { PALETTES } from '../lib/palettes.gen'
import { ThemeSwitch } from './ThemeSwitch'
import './PalettePicker.css'

const orb = (stops: string[]) => `linear-gradient(120deg, ${stops[0]} 0%, ${stops[1]} 55%, ${stops[2]} 100%)`

/// The Random swatch's orb: a wheel of every palette's lead colour.
const wheel = (dark: boolean) =>
  `conic-gradient(from 200deg, ${PALETTES.map((p) => (dark ? p.dark : p.light)[0]).join(', ')}, ${(dark ? PALETTES[0].dark : PALETTES[0].light)[0]})`

/// Swatch order: Random first, then every palette.
const OPTIONS: PalettePref[] = ['random', ...PALETTES.map((p) => p.id)]

const ShuffleIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)

/**
 * Colour-palette picker (design.md §6). A glass trigger in the header opens a
 * popover rendered at body level (a backdrop-filter parent would break its blur
 * and clip it), positioned under the trigger and clamped to the viewport.
 * The swatches are a radiogroup with a roving tabindex and arrow-key selection.
 */
export function PalettePicker() {
  const { t, lang } = useI18n()
  const { palette, palettePref, setPalette, theme } = useTheme()
  const current = PALETTES.find((p) => p.id === palette)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; origin: string }>({ top: 0, left: 0, origin: 'top right' })
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const id = useId()

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(348, window.innerWidth - 24)
    const left = Math.min(Math.max(12, r.right - width), window.innerWidth - width - 12)
    const top = r.bottom + 10
    setPos({ top, left, origin: `${r.left + r.width / 2 - left}px -10px` })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!pop.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    // Move focus to the selected swatch.
    requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place)
    }
  }, [open, place])

  const onRadioKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 2, ArrowLeft: -1, ArrowUp: -2 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const idx = OPTIONS.indexOf(palettePref)
    const next = OPTIONS[(idx + keys[e.key] + OPTIONS.length) % OPTIONS.length]
    const el = pop.current?.querySelector<HTMLElement>(`[data-palette-id="${next}"]`)
    setPalette(next, el?.querySelector('.palette__orb'))
    requestAnimationFrame(() => el?.focus())
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="palette-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t('রঙের প্যালেট', 'Colour palette')}
        title={t('রঙের প্যালেট', 'Colour palette')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="palette-trigger__orb" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={id}
            role="dialog"
            aria-label={t('রঙের প্যালেট', 'Colour palette')}
            className="palette-pop"
            style={{ top: pos.top, left: pos.left, transformOrigin: pos.origin }}
          >
            <div className="palette-pop__head">
              <p className="palette-pop__title">{t('রঙের প্যালেট', 'Colour palette')}</p>
              <p className="palette-pop__hint">{t('পছন্দ মনে রাখা হবে', 'Your choice is saved')}</p>
            </div>
            <div className="palette-grid" role="radiogroup" aria-label={t('রঙের প্যালেট', 'Colour palette')} onKeyDown={onRadioKey}>
              <button
                type="button"
                role="radio"
                aria-checked={palettePref === 'random'}
                tabIndex={palettePref === 'random' ? 0 : -1}
                data-palette-id="random"
                className="palette palette--random"
                onClick={(e) => setPalette('random', e.currentTarget.querySelector('.palette__orb'))}
              >
                <span className="palette__orb palette__orb--wheel" style={{ background: wheel(theme === 'dark') }} aria-hidden="true">
                  <span className="palette__orb-icon">{ShuffleIcon}</span>
                </span>
                <span className="palette__name">
                  {t('এলোমেলো', 'Random')}
                  <span className="palette__sub">
                    {palettePref === 'random' && current
                      ? `${t('এখন', 'Now')}: ${lang === 'bn' ? current.bn : current.en}`
                      : t('কয়েক মিনিট পরপর বদলায়', 'Changes every few minutes')}
                  </span>
                </span>
                <svg className="palette__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
              {PALETTES.map((p) => {
                const checked = p.id === palettePref
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    data-palette-id={p.id}
                    className="palette"
                    onClick={(e) => setPalette(p.id, e.currentTarget.querySelector('.palette__orb'))}
                  >
                    <span className="palette__orb" style={{ background: orb(theme === 'dark' ? p.dark : p.light) }} aria-hidden="true" />
                    <span className="palette__name">{lang === 'bn' ? p.bn : p.en}</span>
                    <svg className="palette__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                )
              })}
            </div>
            <div className="palette-pop__row">
              <span className="palette-pop__label">{t('আলো ও অন্ধকার', 'Light and dark')}</span>
              <ThemeSwitch />
            </div>
            <p className="palette-pop__note">
              {t(
                'স্ট্যাটাস ও সতর্কতার রং সব প্যালেটে একই থাকে।',
                'Status and warning colours stay the same in every palette.',
              )}
            </p>
          </div>,
          document.body,
        )}
    </>
  )
}
