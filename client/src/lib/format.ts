import { localeDigits } from './i18n'

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

/// A 5-slot star string (filled + hollow) for a whole-or-half-rounded rating.
export function starString(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
