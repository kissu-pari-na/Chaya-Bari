import { z } from 'zod'

/// Methods a customer can pay us by manually (no online gateway: vault D-BKS-003).
export const claimMethods = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CASH'] as const
/// Methods an admin can record.
export const adminMethods = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'CARD', 'BANK', 'ONLINE'] as const

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// Every claim and adjustment needs a reference (trx id, bank ref, receipt no.).
const reference = z.string().trim().min(3, 'Enter the transaction reference').max(120)
const money = z.number().positive('Amount must be greater than 0').max(1_000_000)

export const claimSchema = z.object({
  amount: money,
  method: z.enum(claimMethods),
  reference,
  note: optionalText(300),
  orderId: z.string().min(1).optional(),
})

export const redeemSchema = z.object({
  code: z.string().trim().min(2).max(40),
})

export const reviewSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  note: optionalText(300),
})

export const adjustSchema = z.object({
  /// Signed: positive credits the wallet, negative debits it.
  amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000, 'Enter a non-zero amount'),
  reference,
  note: optionalText(300),
  method: z.enum(adminMethods).optional(),
})

export const recordPaymentSchema = z.object({
  amount: money,
  method: z.enum(adminMethods),
  reference,
  note: optionalText(300),
})
