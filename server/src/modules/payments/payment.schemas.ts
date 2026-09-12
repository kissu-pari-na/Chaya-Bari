import { z } from 'zod'

export const paymentMethods = ['CASH', 'BKASH', 'CARD', 'ONLINE', 'COD'] as const
export const paymentTxnStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const

export const recordPaymentSchema = z.object({
  method: z.enum(paymentMethods),
  amount: z.number().positive('Amount must be greater than 0').max(1_000_000),
  status: z.enum(paymentTxnStatuses).optional(),
  reference: z
    .string()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  note: z
    .string()
    .max(300)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export const gatewayChargeSchema = z.object({
  method: z.enum(['BKASH', 'CARD']).optional(),
  amount: z.number().positive('Amount must be greater than 0').max(1_000_000),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
