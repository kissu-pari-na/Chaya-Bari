/// Formats an amount in Bangladeshi Taka using the ৳ symbol.
export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

/// Converts the ASCII digits in a string/number to Bengali numerals, leaving
/// other characters (like a decimal point) untouched.
export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

/// A 5-slot star string (filled + hollow) for a whole-or-half-rounded rating.
export function starString(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
