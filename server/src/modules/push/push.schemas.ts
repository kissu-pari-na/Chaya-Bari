import { z } from 'zod'

/// A browser PushSubscription (the shape from `subscription.toJSON()`).
export const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
})

export const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
})

export type SubscribeInput = z.infer<typeof subscribeSchema>
