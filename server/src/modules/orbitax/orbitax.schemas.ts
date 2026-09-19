import { z } from 'zod'

/// Methods an Orbitax user can pick when settling their outstanding balance.
/// Mirrors the per-order customer claim methods (no CARD — that's gateway-only).
export const orbitaxPayMethods = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'ONLINE'] as const

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// Orbitax user pays a lump amount against their combined outstanding balance.
/// The amount is allocated across their unpaid orders (oldest first) as payment
/// claims that an admin then verifies.
export const orbitaxPaySchema = z.object({
  method: z.enum(orbitaxPayMethods),
  amount: z.number().positive('Amount must be greater than 0').max(1_000_000),
  reference: optionalText(120),
  note: optionalText(300),
})

export type OrbitaxPayInput = z.infer<typeof orbitaxPaySchema>
