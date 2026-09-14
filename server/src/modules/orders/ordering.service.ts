import type { OrderingSetting } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { UpdateOrderingSettingInput } from './order.schemas.js'

export interface OrderingWindow {
  cutoffTime: string
  timezone: string
  minAdvanceDays: number
  defaultDeliveryCost: number
  /// Earliest date (YYYY-MM-DD, in the business timezone) a customer may order for.
  earliestFulfillmentDate: string
  /// Whether today's cutoff has already passed in the business timezone.
  pastCutoffForToday: boolean
}

const SINGLETON_ID = 'singleton'

/// Reads the ordering settings, creating the default row on first access.
export async function getOrderingSetting(): Promise<OrderingSetting> {
  const existing = await prisma.orderingSetting.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return existing
  return prisma.orderingSetting.create({ data: { id: SINGLETON_ID } })
}

export async function updateOrderingSetting(input: UpdateOrderingSettingInput): Promise<OrderingSetting> {
  await getOrderingSetting()
  return prisma.orderingSetting.update({
    where: { id: SINGLETON_ID },
    data: {
      cutoffTime: input.cutoffTime,
      minAdvanceDays: input.minAdvanceDays,
      defaultDeliveryCost: input.defaultDeliveryCost,
      timezone: input.timezone,
    },
  })
}

/// Returns the calendar parts (Y/M/D/H/M) of "now" in a given IANA timezone.
function nowInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

function toDateString(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}

/// Computes the ordering window from settings. Bangladesh observes no DST, so
/// plain UTC date arithmetic over the local calendar date is safe here.
export function computeWindow(setting: OrderingSetting): OrderingWindow {
  const now = nowInZone(setting.timezone)
  const [cutoffHour, cutoffMinute] = setting.cutoffTime.split(':').map(Number)
  const pastCutoff =
    now.hour > cutoffHour || (now.hour === cutoffHour && now.minute >= cutoffMinute)

  const base = new Date(Date.UTC(now.year, now.month - 1, now.day))
  base.setUTCDate(base.getUTCDate() + setting.minAdvanceDays + (pastCutoff ? 1 : 0))

  return {
    cutoffTime: setting.cutoffTime,
    timezone: setting.timezone,
    minAdvanceDays: setting.minAdvanceDays,
    defaultDeliveryCost: Number(setting.defaultDeliveryCost),
    earliestFulfillmentDate: toDateString(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
    ),
    pastCutoffForToday: pastCutoff,
  }
}

export async function getOrderingWindow(): Promise<OrderingWindow> {
  return computeWindow(await getOrderingSetting())
}
