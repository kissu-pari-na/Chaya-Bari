import type { PaymentSetting } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { PaymentSettingInput } from './payment.schemas.js'

const SINGLETON_ID = 'singleton'

export interface PublicPaymentSetting {
  bkash: string | null
  nagad: string | null
  rocket: string | null
  bankInfo: string | null
}

function toPublic(s: PaymentSetting): PublicPaymentSetting {
  return { bkash: s.bkash, nagad: s.nagad, rocket: s.rocket, bankInfo: s.bankInfo }
}

/// Reads the payment-account settings, creating the empty row on first access.
export async function getPaymentSetting(): Promise<PublicPaymentSetting> {
  const existing = await prisma.paymentSetting.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return toPublic(existing)
  const created = await prisma.paymentSetting.create({ data: { id: SINGLETON_ID } })
  return toPublic(created)
}

export async function updatePaymentSetting(input: PaymentSettingInput): Promise<PublicPaymentSetting> {
  const data = {
    bkash: input.bkash ?? null,
    nagad: input.nagad ?? null,
    rocket: input.rocket ?? null,
    bankInfo: input.bankInfo ?? null,
  }
  const saved = await prisma.paymentSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  })
  return toPublic(saved)
}
