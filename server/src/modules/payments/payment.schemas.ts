import { z } from 'zod'

/// No cash-on-delivery: customers either pay in advance (cash/transfer) and we
/// verify it, or pay online via bKash.
export const paymentMethods = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'CARD', 'BANK', 'ONLINE'] as const
export const paymentTxnStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const

/// Methods a customer can pick when submitting a manual payment claim.
export const claimMethods = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'ONLINE'] as const

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// Admin records a confirmed payment directly.
export const recordPaymentSchema = z.object({
  method: z.enum(paymentMethods),
  amount: z.number().positive('Amount must be greater than 0').max(1_000_000),
  status: z.enum(paymentTxnStatuses).optional(),
  reference: optionalText(120),
  note: optionalText(300),
})

/// Customer submits a manual payment claim (awaits admin verification).
export const claimPaymentSchema = z.object({
  method: z.enum(claimMethods),
  amount: z.number().positive('Amount must be greater than 0').max(1_000_000),
  reference: optionalText(120),
  note: optionalText(300),
})

/// Admin verifies or rejects a pending payment.
export const verifyPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
})

/// Start a bKash online payment for an order (customer). Amount defaults to the
/// order's outstanding due on the server.
export const bkashCreateSchema = z.object({
  amount: z.number().positive().max(1_000_000).optional(),
  /// Where the gateway returns the customer after payment (a client route).
  callbackURL: z.string().url().max(500),
})

/// Complete a bKash payment after the customer returns from the gateway.
export const bkashExecuteSchema = z.object({
  paymentID: z.string().min(1).max(200),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type ClaimPaymentInput = z.infer<typeof claimPaymentSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
