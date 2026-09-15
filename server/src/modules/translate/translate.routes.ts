import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { translateBatch } from './translate.service.js'

const translateSchema = z.object({
  texts: z.array(z.string().max(2000)).max(100),
  target: z.enum(['bn', 'en']),
})

/// Public best-effort translation used as a fallback for single-language
/// content. No auth: the customer storefront needs it too.
export const translateRouter = Router()

translateRouter.post(
  '/translate',
  validateBody(translateSchema),
  asyncHandler(async (req, res) => {
    const { texts, target } = req.body as z.infer<typeof translateSchema>
    const translations = await translateBatch(texts, target)
    res.json({ translations })
  }),
)
