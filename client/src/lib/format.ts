/// Formats an amount in Bangladeshi Taka using the ৳ symbol.
export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}
