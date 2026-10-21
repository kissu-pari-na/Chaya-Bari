import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// Admin-editable payment-account details shown to customers.
export const paymentSettingSchema = z.object({
  bkash: optionalText(120),
  nagad: optionalText(120),
  rocket: optionalText(120),
  bankInfo: optionalText(300),
})

export type PaymentSettingInput = z.infer<typeof paymentSettingSchema>
