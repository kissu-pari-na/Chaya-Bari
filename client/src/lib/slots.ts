// Delivery time slots (client mirror of the server rules in
// server/src/modules/orders/slots.ts). Two-hour windows from 8am to 10pm. On
// weekdays (Sunday–Thursday) only the noon slot is open; on the weekend
// (Friday, Saturday) all slots are open.

export interface TimeSlot {
  /// Canonical value sent to and stored by the server, e.g. "12:00-14:00".
  value: string
  startHour: number
  endHour: number
}

const pad = (h: number) => String(h).padStart(2, '0')

export const TIME_SLOTS: TimeSlot[] = [8, 10, 12, 14, 16, 18, 20].map((h) => ({
  value: `${pad(h)}:00-${pad(h + 2)}:00`,
  startHour: h,
  endHour: h + 2,
}))

const WEEKDAY_SLOT = '12:00-14:00'

const SLOT_VALUES = TIME_SLOTS.map((s) => s.value)

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/// Friday (5) and Saturday (6): the whole slot list is available.
export function isWeekend(dateStr: string): boolean {
  const day = dayOfWeek(dateStr)
  return day === 5 || day === 6
}

export function isSlotEnabledForDate(dateStr: string, slotValue: string): boolean {
  if (!SLOT_VALUES.includes(slotValue)) return false
  return isWeekend(dateStr) ? true : slotValue === WEEKDAY_SLOT
}

/// Human label like "8am–10am" / "12pm–2pm" for a slot.
function formatHour(h: number): string {
  const period = h % 24 < 12 ? 'am' : 'pm'
  let hr = h % 12
  if (hr === 0) hr = 12
  return `${hr}${period}`
}

export function formatSlotLabel(slot: TimeSlot): string {
  return `${formatHour(slot.startHour)}–${formatHour(slot.endHour)}`
}

/// Format a stored slot value (e.g. "12:00-14:00") for display, falling back to
/// the raw value for anything unrecognized (e.g. legacy orders).
export function formatSlotValue(value: string | null | undefined): string {
  if (!value) return ''
  const slot = TIME_SLOTS.find((s) => s.value === value)
  return slot ? formatSlotLabel(slot) : value
}

/// Pick the enabled slot closest to the current time of day, so checkout opens
/// on the most relevant window. Returns '' when the day has no open slot.
export function pickDefaultSlot(dateStr: string, now: Date = new Date()): string {
  const enabled = TIME_SLOTS.filter((s) => isSlotEnabledForDate(dateStr, s.value))
  if (enabled.length === 0) return ''
  const nowHours = now.getHours() + now.getMinutes() / 60
  // Distance from now to a slot: 0 while inside it, otherwise the gap to its
  // nearest edge. Earliest slot wins ties (strict comparison, ordered list).
  const distance = (s: TimeSlot) => {
    if (nowHours >= s.startHour && nowHours < s.endHour) return 0
    return Math.min(Math.abs(nowHours - s.startHour), Math.abs(nowHours - s.endHour))
  }
  let best = enabled[0]
  let bestDist = distance(best)
  for (const s of enabled.slice(1)) {
    const d = distance(s)
    if (d < bestDist) {
      best = s
      bestDist = d
    }
  }
  return best.value
}
