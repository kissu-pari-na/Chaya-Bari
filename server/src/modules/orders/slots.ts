// Delivery time slots. Two-hour windows from 8am to 10pm. On weekdays
// (Sunday–Thursday, the Bangladesh work week) only the noon slot is available;
// on the weekend (Friday, Saturday) all slots are available.

export interface TimeSlot {
  /// Canonical, language-neutral value stored on the order, e.g. "12:00-14:00".
  value: string
  startHour: number
  endHour: number
}

const pad = (h: number) => String(h).padStart(2, '0')

/// All slots, earliest first: 8–10, 10–12, 12–14, 14–16, 16–18, 18–20, 20–22.
export const TIME_SLOTS: TimeSlot[] = [8, 10, 12, 14, 16, 18, 20].map((h) => ({
  value: `${pad(h)}:00-${pad(h + 2)}:00`,
  startHour: h,
  endHour: h + 2,
}))

/// The only slot open on weekdays.
const WEEKDAY_SLOT = '12:00-14:00'

export const SLOT_VALUES = TIME_SLOTS.map((s) => s.value)

/// Day-of-week (0=Sun … 6=Sat) for a YYYY-MM-DD date, read in UTC so a plain
/// calendar date never shifts across a timezone boundary.
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/// True for Friday (5) and Saturday (6) — the Bangladesh weekend, when every
/// slot is available.
export function isWeekend(dateStr: string): boolean {
  const day = dayOfWeek(dateStr)
  return day === 5 || day === 6
}

/// Whether a given slot value is selectable for the given fulfillment date.
export function isSlotEnabledForDate(dateStr: string, slotValue: string): boolean {
  if (!SLOT_VALUES.includes(slotValue)) return false
  return isWeekend(dateStr) ? true : slotValue === WEEKDAY_SLOT
}
