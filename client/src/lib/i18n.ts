/**
 * Tiny i18n core shared between React (LanguageContext) and plain modules
 * (formatters, label maps). The active language is mirrored here at module
 * scope so non-component helpers like `formatBdt` can render locale-aware
 * digits without threading the language through every call site.
 */
export type Lang = 'bn' | 'en'

export const LANG_STORAGE_KEY = 'chaya-lang'

function readStoredLang(): Lang {
  try {
    const s = localStorage.getItem(LANG_STORAGE_KEY)
    if (s === 'en' || s === 'bn') return s
  } catch {
    /* localStorage unavailable (private mode, SSR) — fall back to default */
  }
  return 'bn'
}

let _lang: Lang = readStoredLang()

/** Update the module-level language (called by LanguageProvider on change). */
export function setModuleLang(lang: Lang): void {
  _lang = lang
}

/** The current language, for use in non-React modules. */
export function getLang(): Lang {
  return _lang
}

/** Pick the Bangla or English variant for the current language. */
export function pick(bn: string, en: string): string {
  return _lang === 'bn' ? bn : en
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

/**
 * Render digits in the active language: Bengali numerals in Bangla mode,
 * plain ASCII in English mode. Non-digit characters pass through untouched.
 */
export function localeDigits(value: string | number): string {
  const s = String(value)
  return _lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s
}
