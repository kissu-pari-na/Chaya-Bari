import { getLang, localeDigits } from './i18n'

/// Formats an amount in Bangladeshi Taka using the ৳ symbol. Digits render in
/// the active language (Bengali numerals in Bangla mode, ASCII in English).
export function formatBdt(amount: number): string {
  const n = amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return `৳${localeDigits(n)}`
}

/// Converts the ASCII digits in a string/number to the active language's
/// numerals (Bengali in Bangla mode, unchanged in English). Other characters
/// (like a decimal point) are left untouched.
export function toBnDigits(value: string | number): string {
  return localeDigits(value)
}

/// Formats a "YYYY-MM-DD" date with its weekday for the active language, e.g.
/// "Sunday, 21 Sep 2026" (en) or "রবিবার, ২১ সেপ্টেম্বর ২০২৬" (bn). The date is
/// built from its parts at local time so the weekday never shifts by timezone.
/// Falls back to the raw string for anything unparseable (e.g. legacy values).
export function formatDateWithDay(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return dateStr
  const locale = getLang() === 'bn' ? 'bn-BD' : 'en-GB'
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/// Just the weekday name (long) for a "YYYY-MM-DD" date, in the active language.
export function formatWeekday(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return ''
  const locale = getLang() === 'bn' ? 'bn-BD' : 'en-GB'
  return date.toLocaleDateString(locale, { weekday: 'long' })
}

/// A 5-slot star string (filled + hollow) for a whole-or-half-rounded rating.
export function starString(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
