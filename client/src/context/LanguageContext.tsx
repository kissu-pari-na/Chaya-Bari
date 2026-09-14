import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LANG_STORAGE_KEY, setModuleLang, type Lang } from '../lib/i18n'

interface LanguageValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** Return the Bangla or English variant for the active language. */
  t: (bn: string, en: string) => string
}

const LanguageContext = createContext<LanguageValue | undefined>(undefined)

function readStored(): Lang {
  try {
    const s = localStorage.getItem(LANG_STORAGE_KEY)
    if (s === 'en' || s === 'bn') return s
  } catch {
    /* ignore */
  }
  return 'bn'
}

/**
 * App-wide language provider. Bangla is the default; the choice persists in
 * localStorage and mirrors into the i18n module so plain helpers (formatters,
 * label maps) render in the same language.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored)

  // Mirror into the i18n module synchronously during render so that plain
  // helpers (formatters, getter-based label maps) read the current language
  // on the very same render the toggle triggers — not one render late.
  setModuleLang(lang)

  useEffect(() => {
    setModuleLang(lang)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en'
  }, [lang])

  const value: LanguageValue = {
    lang,
    setLang: setLangState,
    toggle: () => setLangState((prev) => (prev === 'bn' ? 'en' : 'bn')),
    t: (bn, en) => (lang === 'bn' ? bn : en),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider')
  return ctx
}
