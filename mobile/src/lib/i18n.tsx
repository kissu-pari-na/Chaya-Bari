import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KEYS, readJson, writeJson } from './storage'

// Bilingual like the website (R-I18N-001/002): Bangla is the default and every
// string is written as t('বাংলা', 'English').

export type Lang = 'bn' | 'en'

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

interface LanguageValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Pick the Bangla or English string. */
  t: (bn: string, en: string) => string
  /** Admin content with an optional English twin (R-I18N-003). Never empty if either exists. */
  tc: (bangla?: string | null, english?: string | null) => string
  /** Digits in the active language (R-I18N-005). */
  digits: (v: string | number) => string
  /** Taka amount, e.g. ৳২৫০. */
  bdt: (amount: number) => string
}

const LanguageContext = createContext<LanguageValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn')

  useEffect(() => {
    void readJson<Lang>(KEYS.lang).then((l) => {
      if (l === 'bn' || l === 'en') setLangState(l)
    })
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    void writeJson(KEYS.lang, l)
  }, [])

  const value = useMemo<LanguageValue>(() => {
    const digits = (v: string | number) =>
      lang === 'bn' ? String(v).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : String(v)
    return {
      lang,
      setLang,
      t: (bn, en) => (lang === 'bn' ? bn : en),
      tc: (bangla, english) => {
        const bn = bangla?.trim() ? bangla : undefined
        const en = english?.trim() ? english : undefined
        return lang === 'en' ? (en ?? bn ?? '') : (bn ?? en ?? '')
      },
      digits,
      bdt: (amount) => `৳${digits(amount.toLocaleString('en-US', { maximumFractionDigits: 2 }))}`,
    }
  }, [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
