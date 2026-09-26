import { z } from 'zod'
import { SLOT_VALUES } from './slots.js'

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

// ---- Addresses ----

export const addressSchema = z.object({
  label: optionalText(60),
  recipientName: z.string().min(2, 'Recipient name is required').max(100),
  // Phone is optional on an address: it can be auto-filled from the customer's
  // profile (or the number captured) at checkout. When provided it must be a
  // valid length.
  recipientPhone: z
    .string()
    .min(6, 'A valid phone is required')
    .max(20)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  addressLine: z.string().min(3, 'Address is required').max(300),
  area: optionalText(120),
  city: z.string().min(1, 'City is required').max(120),
  note: optionalText(300),
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = addressSchema.partial()

// ---- Orders ----

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000),
      }),
    )
    .min(1, 'Your cart is empty'),
  // Either reference a saved address or provide address fields inline.
  addressId: z.string().cuid().optional(),
  address: addressSchema.optional(),
  fulfillmentDate: dateString,
  timeSlot: z.enum(SLOT_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please choose a delivery time slot' }),
  }),
  notes: optionalText(1000),
  couponCode: z
    .string()
    .max(40)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /// How the order is settled. Defaults to PREPAID (pay in advance); COD means
  /// cash is collected on delivery.
  paymentMode: z.enum(['PREPAID', 'COD']).optional().default('PREPAID'),
})

// Guest checkout: no account, so contact + delivery details are inline. Guests
// can pay in advance (they get manual-payment instructions on the confirmation)
// or choose cash on delivery.
export const guestCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000),
      }),
    )
    .min(1, 'Your cart is empty'),
  address: addressSchema,
  guestEmail: z
    .string()
    .email('A valid email is required')
    .toLowerCase()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  fulfillmentDate: dateString,
  timeSlot: z.enum(SLOT_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please choose a delivery time slot' }),
  }),
  notes: optionalText(1000),
  couponCode: z
    .string()
    .max(40)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  paymentMode: z.enum(['PREPAID', 'COD']).optional().default('COD'),
})

// Admin places an order on a customer's behalf, identified by email. If the
// email has no account yet, a placeholder account is opened for it and the
// owner inherits the order when they register / confirm that email.
export const adminCheckoutSchema = z
  .object({
    customer: z.object({
      email: z.string().trim().email('A valid email is required').max(160).toLowerCase(),
      name: z.string().trim().min(2, 'Customer name is required').max(150),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().cuid(),
          quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000),
        }),
      )
      .min(1, 'Add at least one item'),
    // Either one of the customer's saved addresses or a new one inline.
    addressId: z.string().cuid().optional(),
    address: addressSchema.optional(),
    /// Keep a new inline address in the customer's address book.
    saveAddress: z.boolean().optional().default(true),
    fulfillmentDate: dateString,
    timeSlot: z.enum(SLOT_VALUES as [string, ...string[]], {
      errorMap: () => ({ message: 'Please choose a delivery time slot' }),
    }),
    notes: optionalText(1000),
    couponCode: z
      .string()
      .max(40)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    paymentMode: z.enum(['PREPAID', 'COD']).optional().default('COD'),
  })
  .refine((v) => v.addressId || v.address, {
    message: 'A delivery address is required',
    path: ['address'],
  })

// ---- Ordering settings ----

export const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const

export const paymentStatuses = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'FAILED'] as const

export const updateStatusSchema = z.object({ status: z.enum(orderStatuses) })
export const updatePaymentStatusSchema = z.object({ paymentStatus: z.enum(paymentStatuses) })
export const updatePaymentModeSchema = z.object({ paymentMode: z.enum(['PREPAID', 'COD']) })

export const updateOrderingSettingSchema = z.object({
  cutoffTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Cutoff must be HH:mm (24-hour)'),
  minAdvanceDays: z.number().int().min(0).max(30),
  defaultDeliveryCost: z.number().min(0).max(100000),
  timezone: z.string().min(1).max(60),
})

export type AddressInput = z.infer<typeof addressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type AdminCheckoutInput = z.infer<typeof adminCheckoutSchema>
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>
export type UpdateOrderingSettingInput = z.infer<typeof updateOrderingSettingSchema>
