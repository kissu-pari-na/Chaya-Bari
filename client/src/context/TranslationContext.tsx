import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from './LanguageContext'
import { cacheKey, detectLang, getCached, putCached, translateTexts } from '../lib/translate'

interface TranslationValue {
  /**
   * Localize a single admin-entered value to the active language. If it is
   * already in that language it is returned as-is; otherwise the cached
   * translation is returned, or the original while a translation is fetched in
   * the background (which then re-renders with the translated text).
   */
  l: (text?: string | null) => string
  /**
   * Localize a bilingual pair (e.g. product name / moto): prefer the field for
   * the active language, fall back to the other field, and translate whatever
   * remains so it always reads in the active language.
   */
  lc: (bangla?: string | null, english?: string | null) => string
}

const TranslationContext = createContext<TranslationValue | undefined>(undefined)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n()
  const [, forceRender] = useState(0)
  const pending = useRef<Set<string>>(new Set()) // texts awaiting translation
  const inflight = useRef<Set<string>>(new Set()) // cacheKeys currently fetching

  const l = useCallback(
    (text?: string | null): string => {
      if (!text || !text.trim()) return text ?? ''
      if (detectLang(text) === lang) return text
      const cached = getCached(lang, text)
      if (cached != null) return cached
      const key = cacheKey(lang, text)
      if (!inflight.current.has(key)) pending.current.add(text)
      return text // best-effort until the translation arrives
    },
    [lang],
  )

  const lc = useCallback(
    (bangla?: string | null, english?: string | null): string => {
      const primary =
        lang === 'bn'
          ? bangla && bangla.trim()
            ? bangla
            : english
          : english && english.trim()
            ? english
            : bangla
      return l(primary ?? '')
    },
    [l, lang],
  )

  // After each render, flush any texts that `l` queued for translation.
  useEffect(() => {
    if (pending.current.size === 0) return
    const texts = [...pending.current]
    pending.current.clear()
    const keys = texts.map((t) => cacheKey(lang, t))
    keys.forEach((k) => inflight.current.add(k))
    let cancelled = false
    translateTexts(texts, lang)
      .then((results) => {
        if (cancelled) return
        const entries: Record<string, string> = {}
        texts.forEach((t, i) => {
          entries[cacheKey(lang, t)] = results[i] ?? t
        })
        putCached(entries)
        keys.forEach((k) => inflight.current.delete(k))
        forceRender((n) => n + 1) // re-render so `l` returns the fresh translations
      })
      .catch(() => {
        keys.forEach((k) => inflight.current.delete(k))
      })
    return () => {
      cancelled = true
    }
  })

  return <TranslationContext.Provider value={{ l, lc }}>{children}</TranslationContext.Provider>
}

export function useContentLang(): TranslationValue {
  const ctx = useContext(TranslationContext)
  if (!ctx) throw new Error('useContentLang must be used within a TranslationProvider')
  return ctx
}
